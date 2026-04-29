import json
import os
import secrets
from typing import Any

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP Dagster Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
DAGSTER_GRAPHQL_URL = os.getenv("DAGSTER_GRAPHQL_URL", "http://host.docker.internal:3000/graphql")
DAGSTER_API_TOKEN = os.getenv("DAGSTER_API_TOKEN", "")
DAGSTER_ALLOW_MUTATIONS = os.getenv("DAGSTER_ALLOW_MUTATIONS", "false").lower() == "true"


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True)}]})


def _dagster_graphql(query: str, variables: dict[str, Any] | None = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if DAGSTER_API_TOKEN:
        headers["Authorization"] = f"Bearer {DAGSTER_API_TOKEN}"
    resp = requests.post(
        DAGSTER_GRAPHQL_URL,
        headers=headers,
        json={"query": query, "variables": variables or {}},
        timeout=25,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("errors"):
        raise ValueError(payload["errors"])
    return payload.get("data", {})


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "dagster_graphql_url": DAGSTER_GRAPHQL_URL,
        "mutations_enabled": DAGSTER_ALLOW_MUTATIONS,
        "token_configured": bool(DAGSTER_API_TOKEN),
    }


@app.post("/mcp")
async def mcp_endpoint(request: Request) -> dict[str, Any]:
    payload = await request.json()
    req_id = payload.get("id")
    method = payload.get("method")
    params = payload.get("params") or {}

    if method == "notifications/initialized":
        return {"jsonrpc": "2.0", "result": {}}

    if method == "initialize":
        return _jsonrpc_result(
            req_id,
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "mcp-dagster-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {"name": "dagster_list_repositories", "description": "List Dagster repositories", "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}},
                    {"name": "dagster_list_jobs", "description": "List jobs in a repository location", "inputSchema": {"type": "object", "properties": {"repository_location_name": {"type": "string"}}, "required": ["repository_location_name"], "additionalProperties": False}},
                    {"name": "dagster_launch_run", "description": "Launch a Dagster run (requires DAGSTER_ALLOW_MUTATIONS=true)", "inputSchema": {"type": "object", "properties": {"repository_location_name": {"type": "string"}, "repository_name": {"type": "string"}, "job_name": {"type": "string"}}, "required": ["repository_location_name", "repository_name", "job_name"], "additionalProperties": False}},
                    {"name": "dagster_recent_runs", "description": "Get recent Dagster runs", "inputSchema": {"type": "object", "properties": {"limit": {"type": "number", "default": 10}}, "additionalProperties": False}},
                    {"name": "dagster_get_run_info", "description": "Get Dagster run details", "inputSchema": {"type": "object", "properties": {"run_id": {"type": "string"}}, "required": ["run_id"], "additionalProperties": False}},
                    {"name": "dagster_terminate_run", "description": "Terminate Dagster run (requires DAGSTER_ALLOW_MUTATIONS=true)", "inputSchema": {"type": "object", "properties": {"run_id": {"type": "string"}}, "required": ["run_id"], "additionalProperties": False}},
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "dagster_list_repositories":
            q = """
            query {
              repositoriesOrError {
                __typename
                ... on RepositoryConnection {
                  nodes { name location { name } }
                }
              }
            }
            """
            data = _dagster_graphql(q)
            nodes = (((data.get("repositoriesOrError") or {}).get("nodes")) or [])
            out = [{"repository_name": n.get("name"), "repository_location_name": ((n.get("location") or {}).get("name"))} for n in nodes]
            return _text_result(req_id, out)

        if tool_name == "dagster_list_jobs":
            loc = str(args.get("repository_location_name", ""))
            q = """
            query {
              workspaceOrError {
                __typename
                ... on Workspace {
                  locationEntries {
                    name
                    locationOrLoadError {
                      __typename
                      ... on RepositoryLocation {
                        repositories { name jobs { name } }
                      }
                    }
                  }
                }
              }
            }
            """
            data = _dagster_graphql(q)
            entries = (((data.get("workspaceOrError") or {}).get("locationEntries")) or [])
            out: list[dict[str, Any]] = []
            for e in entries:
                if e.get("name") != loc:
                    continue
                repos = (((e.get("locationOrLoadError") or {}).get("repositories")) or [])
                for r in repos:
                    for j in (r.get("jobs") or []):
                        out.append({"repository_location_name": loc, "repository_name": r.get("name"), "job_name": j.get("name")})
            return _text_result(req_id, out)

        if tool_name == "dagster_recent_runs":
            limit = int(args.get("limit", 10))
            q = """
            query($limit: Int!) {
              pipelineRunsOrError(filter: {}, cursor: null, limit: $limit) {
                __typename
                ... on PipelineRuns {
                  results { runId status pipelineName mode }
                }
              }
            }
            """
            data = _dagster_graphql(q, {"limit": max(1, min(limit, 50))})
            out = (((data.get("pipelineRunsOrError") or {}).get("results")) or [])
            return _text_result(req_id, out)

        if tool_name == "dagster_get_run_info":
            run_id = str(args.get("run_id", ""))
            q = """
            query($runId: ID!) {
              pipelineRunOrError(runId: $runId) {
                __typename
                ... on Run { runId status pipelineName mode tags { key value } }
              }
            }
            """
            data = _dagster_graphql(q, {"runId": run_id})
            return _text_result(req_id, data.get("pipelineRunOrError"))

        if tool_name == "dagster_launch_run":
            if not DAGSTER_ALLOW_MUTATIONS:
                return _text_result(req_id, {"error": "Mutations disabled. Set DAGSTER_ALLOW_MUTATIONS=true to enable launch/terminate."})
            loc = str(args.get("repository_location_name", ""))
            repo = str(args.get("repository_name", ""))
            job = str(args.get("job_name", ""))
            q = """
            mutation($selector: JobOrPipelineSelector!) {
              launchPipelineExecution(executionParams: {selector: $selector}) {
                __typename
                ... on LaunchRunSuccess { run { runId status pipelineName } }
                ... on PythonError { message }
              }
            }
            """
            selector = {"repositoryLocationName": loc, "repositoryName": repo, "pipelineName": job}
            data = _dagster_graphql(q, {"selector": selector})
            return _text_result(req_id, data.get("launchPipelineExecution"))

        if tool_name == "dagster_terminate_run":
            if not DAGSTER_ALLOW_MUTATIONS:
                return _text_result(req_id, {"error": "Mutations disabled. Set DAGSTER_ALLOW_MUTATIONS=true to enable launch/terminate."})
            run_id = str(args.get("run_id", ""))
            q = """
            mutation($runId: String!) {
              terminateRun(runId: $runId) {
                __typename
                ... on TerminateRunSuccess { run { runId status } }
                ... on PythonError { message }
              }
            }
            """
            data = _dagster_graphql(q, {"runId": run_id})
            return _text_result(req_id, data.get("terminateRun"))

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (requests.RequestException, ValueError) as exc:
        return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": f"Dagster error: {exc}"}]})
