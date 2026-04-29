import os
import secrets
from typing import Any

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP GitHub Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_URL = "https://api.github.com"


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _gh_get(path: str, params: dict[str, Any] | None = None) -> Any:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=params or {}, timeout=20)
    resp.raise_for_status()
    return resp.json()


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "configured": bool(GITHUB_TOKEN)}


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
                "serverInfo": {"name": "mcp-github-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "github_list_repositories",
                        "description": "List repositories visible by the GitHub token",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "type": {"type": "string", "default": "owner"},
                                "per_page": {"type": "number", "default": 30},
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "github_list_issues",
                        "description": "List issues in a GitHub repository",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "owner": {"type": "string"},
                                "repo": {"type": "string"},
                                "state": {"type": "string", "default": "open"},
                                "per_page": {"type": "number", "default": 20},
                            },
                            "required": ["owner", "repo"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "github_list_pull_requests",
                        "description": "List pull requests in a GitHub repository",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "owner": {"type": "string"},
                                "repo": {"type": "string"},
                                "state": {"type": "string", "default": "open"},
                                "per_page": {"type": "number", "default": 20},
                            },
                            "required": ["owner", "repo"],
                            "additionalProperties": False,
                        },
                    },
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    if not GITHUB_TOKEN:
        return _jsonrpc_result(
            req_id,
            {
                "isError": True,
                "content": [{"type": "text", "text": "GitHub non configure: renseigne MCP_GITHUB_TOKEN"}],
            },
        )

    tool_name = params.get("name")
    args = params.get("arguments") or {}
    try:
        if tool_name == "github_list_repositories":
            data = _gh_get(
                "/user/repos",
                {"type": args.get("type", "owner"), "sort": "updated", "per_page": int(args.get("per_page", 30))},
            )
            out = [
                {
                    "full_name": r.get("full_name"),
                    "private": r.get("private", False),
                    "default_branch": r.get("default_branch"),
                    "url": r.get("html_url"),
                }
                for r in data
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "github_list_issues":
            owner = str(args.get("owner", ""))
            repo = str(args.get("repo", ""))
            if not owner or not repo:
                return _jsonrpc_error(req_id, -32602, "owner and repo are required")
            data = _gh_get(
                f"/repos/{owner}/{repo}/issues",
                {"state": args.get("state", "open"), "per_page": int(args.get("per_page", 20))},
            )
            out = [
                {"number": i.get("number"), "title": i.get("title"), "state": i.get("state"), "url": i.get("html_url")}
                for i in data
                if "pull_request" not in i
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "github_list_pull_requests":
            owner = str(args.get("owner", ""))
            repo = str(args.get("repo", ""))
            if not owner or not repo:
                return _jsonrpc_error(req_id, -32602, "owner and repo are required")
            data = _gh_get(
                f"/repos/{owner}/{repo}/pulls",
                {"state": args.get("state", "open"), "per_page": int(args.get("per_page", 20))},
            )
            out = [
                {"number": pr.get("number"), "title": pr.get("title"), "state": pr.get("state"), "url": pr.get("html_url")}
                for pr in data
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except requests.HTTPError as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"GitHub error: {exc}"}]},
        )
