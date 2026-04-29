import os
import secrets
from typing import Any

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP GitHub Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
BASE_URL = "https://api.github.com"
WRITE_CONFIRM_TOKEN = os.getenv("MCP_WRITE_CONFIRM_TOKEN", "CONFIRM")


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


def _gh_post(path: str, payload: dict[str, Any]) -> Any:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    resp = requests.post(f"{BASE_URL}{path}", headers=headers, json=payload, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _ensure_write_confirmation(args: dict[str, Any]) -> str | None:
    confirm = str(args.get("confirm", ""))
    if confirm != WRITE_CONFIRM_TOKEN:
        return f"Action d'ecriture bloquee. Ajoute confirm='{WRITE_CONFIRM_TOKEN}' pour confirmer."
    return None


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
                    {
                        "name": "github_create_issue",
                        "description": "Create an issue in a GitHub repository (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "owner": {"type": "string"},
                                "repo": {"type": "string"},
                                "title": {"type": "string"},
                                "body": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["owner", "repo", "title", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "github_create_repository",
                        "description": "Create a GitHub repository for the authenticated user or an organization (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "private": {"type": "boolean", "default": True},
                                "auto_init": {"type": "boolean", "default": True},
                                "org": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["name", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "github_comment_issue",
                        "description": "Comment an issue or PR in a GitHub repository (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "owner": {"type": "string"},
                                "repo": {"type": "string"},
                                "issue_number": {"type": "number"},
                                "body": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["owner", "repo", "issue_number", "body", "confirm"],
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

        if tool_name == "github_create_issue":
            owner = str(args.get("owner", ""))
            repo = str(args.get("repo", ""))
            title = str(args.get("title", ""))
            if not owner or not repo or not title:
                return _jsonrpc_error(req_id, -32602, "owner, repo and title are required")
            blocked = _ensure_write_confirmation(args)
            if blocked:
                return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": blocked}]})
            data = _gh_post(
                f"/repos/{owner}/{repo}/issues",
                {"title": title, "body": str(args.get("body", ""))},
            )
            out = {"number": data.get("number"), "title": data.get("title"), "url": data.get("html_url")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "github_create_repository":
            name = str(args.get("name", "")).strip()
            if not name:
                return _jsonrpc_error(req_id, -32602, "name is required")
            blocked = _ensure_write_confirmation(args)
            if blocked:
                return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": blocked}]})
            payload = {
                "name": name,
                "description": str(args.get("description", "")),
                "private": bool(args.get("private", True)),
                "auto_init": bool(args.get("auto_init", True)),
            }
            org = str(args.get("org", "")).strip()
            path = f"/orgs/{org}/repos" if org else "/user/repos"
            data = _gh_post(path, payload)
            out = {"full_name": data.get("full_name"), "private": data.get("private"), "url": data.get("html_url")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "github_comment_issue":
            owner = str(args.get("owner", ""))
            repo = str(args.get("repo", ""))
            issue_number = int(args.get("issue_number", 0))
            body = str(args.get("body", ""))
            if not owner or not repo or issue_number <= 0 or not body:
                return _jsonrpc_error(req_id, -32602, "owner, repo, issue_number and body are required")
            blocked = _ensure_write_confirmation(args)
            if blocked:
                return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": blocked}]})
            data = _gh_post(
                f"/repos/{owner}/{repo}/issues/{issue_number}/comments",
                {"body": body},
            )
            out = {"id": data.get("id"), "url": data.get("html_url")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except requests.HTTPError as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"GitHub error: {exc}"}]},
        )
