import json
import os
import secrets
from typing import Any

import psycopg
from fastapi import FastAPI, Header, HTTPException, Request, Response

app = FastAPI(title="MCP PostgreSQL Bridge", version="0.1.0")

DATABASE_URL = os.getenv("DATABASE_URL", "")
SESSION_ID = secrets.token_hex(16)
READ_ONLY = os.getenv("MCP_POSTGRES_READ_ONLY", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _ensure_db() -> None:
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL is missing for mcp-postgres")


def _is_readonly_sql(sql: str) -> bool:
    normalized = sql.strip().lower()
    allowed_starts = ("select", "with", "explain", "show")
    blocked_keywords = (
        "insert ",
        "update ",
        "delete ",
        "drop ",
        "alter ",
        "create ",
        "truncate ",
        "grant ",
        "revoke ",
        "copy ",
    )
    return normalized.startswith(allowed_starts) and not any(k in normalized for k in blocked_keywords)


def _mode_label() -> str:
    return "read-only" if READ_ONLY else "read-write"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": _mode_label()}


@app.post("/mcp")
async def mcp_endpoint(request: Request, response: Response, mcp_session_id: str | None = Header(default=None)) -> dict[str, Any]:
    payload = await request.json()
    method = payload.get("method")
    req_id = payload.get("id")
    params = payload.get("params") or {}

    if method == "notifications/initialized":
        return {"jsonrpc": "2.0", "result": {}}

    if method == "initialize":
        response.headers["mcp-session-id"] = SESSION_ID
        return _jsonrpc_result(
            req_id,
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "mcp-postgres-local", "version": "0.2.0"},
            },
        )

    if not mcp_session_id and method in ("tools/list", "tools/call"):
        # Keep permissive for compatibility but still return a stable session id.
        response.headers["mcp-session-id"] = SESSION_ID

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "query",
                        "description": f"Execute SQL on PostgreSQL ({_mode_label()})",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"sql": {"type": "string"}},
                            "required": ["sql"],
                            "additionalProperties": False,
                        },
                    }
                ]
            },
        )

    if method == "tools/call":
        _ensure_db()
        tool_name = params.get("name")
        args = params.get("arguments") or {}
        sql = str(args.get("sql", ""))

        if tool_name != "query":
            return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
        if not sql:
            return _jsonrpc_error(req_id, -32602, "Missing 'sql' argument")
        if READ_ONLY and not _is_readonly_sql(sql):
            return _jsonrpc_error(req_id, -32602, "Only read-only SQL is allowed")

        try:
            with psycopg.connect(DATABASE_URL) as conn:
                if READ_ONLY:
                    conn.execute("SET TRANSACTION READ ONLY")
                with conn.cursor() as cur:
                    cur.execute(sql)
                    rows = cur.fetchall() if cur.description else []
                    columns = [d.name for d in cur.description] if cur.description else []
            result_text = json.dumps({"columns": columns, "rows": rows}, ensure_ascii=True)
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": result_text}]})
        except Exception as exc:  # noqa: BLE001
            return _jsonrpc_result(
                req_id,
                {"isError": True, "content": [{"type": "text", "text": f"Postgres error: {exc}"}]},
            )

    return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")
