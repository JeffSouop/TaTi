import os
import secrets
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request

app = FastAPI(title="MCP Filesystem Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
ROOT = Path(os.getenv("FILESYSTEM_ROOT", "/workspace")).resolve()


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _safe_path(relative_path: str) -> Path:
    p = (ROOT / relative_path).resolve()
    if ROOT not in p.parents and p != ROOT:
        raise ValueError("Path outside FILESYSTEM_ROOT is not allowed")
    return p


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "root": str(ROOT), "root_exists": ROOT.exists()}


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
                "serverInfo": {"name": "mcp-filesystem-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "filesystem_list_directory",
                        "description": "List files and directories under FILESYSTEM_ROOT",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"path": {"type": "string"}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "filesystem_read_file",
                        "description": "Read a UTF-8 text file under FILESYSTEM_ROOT",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"path": {"type": "string"}},
                            "required": ["path"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "filesystem_write_file",
                        "description": "Write a UTF-8 text file under FILESYSTEM_ROOT",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "path": {"type": "string"},
                                "content": {"type": "string"},
                            },
                            "required": ["path", "content"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "filesystem_make_directory",
                        "description": "Create a directory under FILESYSTEM_ROOT",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"path": {"type": "string"}},
                            "required": ["path"],
                            "additionalProperties": False,
                        },
                    },
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "filesystem_list_directory":
            rel = str(args.get("path", "."))
            p = _safe_path(rel)
            if not p.exists():
                raise ValueError(f"Path not found: {rel}")
            if not p.is_dir():
                raise ValueError(f"Path is not a directory: {rel}")
            data = []
            for child in sorted(p.iterdir(), key=lambda x: x.name.lower()):
                data.append({"name": child.name, "type": "dir" if child.is_dir() else "file"})
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(data)}]})

        if tool_name == "filesystem_read_file":
            rel = str(args.get("path", ""))
            if not rel:
                return _jsonrpc_error(req_id, -32602, "path is required")
            p = _safe_path(rel)
            if not p.exists() or not p.is_file():
                raise ValueError(f"File not found: {rel}")
            content = p.read_text(encoding="utf-8")
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": content}]})

        if tool_name == "filesystem_write_file":
            rel = str(args.get("path", ""))
            content = str(args.get("content", ""))
            if not rel:
                return _jsonrpc_error(req_id, -32602, "path is required")
            p = _safe_path(rel)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": f"OK: wrote {rel}"}]})

        if tool_name == "filesystem_make_directory":
            rel = str(args.get("path", ""))
            if not rel:
                return _jsonrpc_error(req_id, -32602, "path is required")
            p = _safe_path(rel)
            p.mkdir(parents=True, exist_ok=True)
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": f"OK: created {rel}"}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except ValueError as exc:
        return _jsonrpc_result(req_id, {"isError": True, "content": [{"type": "text", "text": str(exc)}]})
