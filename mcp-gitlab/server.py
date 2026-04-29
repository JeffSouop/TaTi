import os
import secrets
from typing import Any
from urllib.parse import quote_plus

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP GitLab Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "")
GITLAB_URL = os.getenv("GITLAB_URL", "https://gitlab.com").rstrip("/")
WRITE_CONFIRM_TOKEN = os.getenv("MCP_WRITE_CONFIRM_TOKEN", "CONFIRM")


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _gl_get(path: str, params: dict[str, Any] | None = None) -> Any:
    headers = {}
    if GITLAB_TOKEN:
        headers["PRIVATE-TOKEN"] = GITLAB_TOKEN
    resp = requests.get(f"{GITLAB_URL}/api/v4{path}", headers=headers, params=params or {}, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _gl_post(path: str, payload: dict[str, Any]) -> Any:
    headers = {}
    if GITLAB_TOKEN:
        headers["PRIVATE-TOKEN"] = GITLAB_TOKEN
    resp = requests.post(f"{GITLAB_URL}/api/v4{path}", headers=headers, data=payload, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _ensure_write_confirmation(args: dict[str, Any]) -> str | None:
    confirm = str(args.get("confirm", ""))
    if confirm != WRITE_CONFIRM_TOKEN:
        return f"Action d'ecriture bloquee. Ajoute confirm='{WRITE_CONFIRM_TOKEN}' pour confirmer."
    return None


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "configured": bool(GITLAB_TOKEN), "base_url": GITLAB_URL}


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
                "serverInfo": {"name": "mcp-gitlab-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "gitlab_list_projects",
                        "description": "List GitLab projects visible by the token",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"per_page": {"type": "number", "default": 20}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "gitlab_list_issues",
                        "description": "List issues of a GitLab project",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "project": {"type": "string"},
                                "state": {"type": "string", "default": "opened"},
                                "per_page": {"type": "number", "default": 20},
                            },
                            "required": ["project"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "gitlab_list_merge_requests",
                        "description": "List merge requests of a GitLab project",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "project": {"type": "string"},
                                "state": {"type": "string", "default": "opened"},
                                "per_page": {"type": "number", "default": 20},
                            },
                            "required": ["project"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "gitlab_create_issue",
                        "description": "Create an issue in a GitLab project (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "project": {"type": "string"},
                                "title": {"type": "string"},
                                "description": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["project", "title", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "gitlab_comment_merge_request",
                        "description": "Comment a merge request in a GitLab project (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "project": {"type": "string"},
                                "merge_request_iid": {"type": "number"},
                                "body": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["project", "merge_request_iid", "body", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    if not GITLAB_TOKEN:
        return _jsonrpc_result(
            req_id,
            {
                "isError": True,
                "content": [{"type": "text", "text": "GitLab non configure: renseigne MCP_GITLAB_TOKEN"}],
            },
        )

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "gitlab_list_projects":
            data = _gl_get("/projects", {"membership": True, "per_page": int(args.get("per_page", 20))})
            out = [{"id": p.get("id"), "path_with_namespace": p.get("path_with_namespace"), "web_url": p.get("web_url")} for p in data]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name in {"gitlab_list_issues", "gitlab_list_merge_requests"}:
            project = str(args.get("project", ""))
            if not project:
                return _jsonrpc_error(req_id, -32602, "project is required (id or namespace/path)")
            project_encoded = quote_plus(project)
            endpoint = "issues" if tool_name == "gitlab_list_issues" else "merge_requests"
            data = _gl_get(
                f"/projects/{project_encoded}/{endpoint}",
                {"state": args.get("state", "opened"), "per_page": int(args.get("per_page", 20))},
            )
            out = [{"iid": i.get("iid"), "title": i.get("title"), "state": i.get("state"), "web_url": i.get("web_url")} for i in data]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "gitlab_create_issue":
            project = str(args.get("project", ""))
            title = str(args.get("title", ""))
            if not project or not title:
                return _jsonrpc_error(req_id, -32602, "project and title are required")
            blocked = _ensure_write_confirmation(args)
            if blocked:
                return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": blocked}]})
            project_encoded = quote_plus(project)
            data = _gl_post(
                f"/projects/{project_encoded}/issues",
                {"title": title, "description": str(args.get("description", ""))},
            )
            out = {"iid": data.get("iid"), "title": data.get("title"), "web_url": data.get("web_url")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "gitlab_comment_merge_request":
            project = str(args.get("project", ""))
            mr_iid = int(args.get("merge_request_iid", 0))
            body = str(args.get("body", ""))
            if not project or mr_iid <= 0 or not body:
                return _jsonrpc_error(req_id, -32602, "project, merge_request_iid and body are required")
            blocked = _ensure_write_confirmation(args)
            if blocked:
                return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": blocked}]})
            project_encoded = quote_plus(project)
            data = _gl_post(
                f"/projects/{project_encoded}/merge_requests/{mr_iid}/notes",
                {"body": body},
            )
            out = {"id": data.get("id"), "body": data.get("body")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except requests.HTTPError as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"GitLab error: {exc}"}]},
        )
