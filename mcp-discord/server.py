import os
import secrets
from typing import Any

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP Discord Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID", "")
ALLOWED_CHANNELS = {c.strip() for c in os.getenv("DISCORD_CHANNEL_IDS", "").split(",") if c.strip()}
BASE_URL = "https://discord.com/api/v10"


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "Content-Type": "application/json"}


def _guard_channel(channel_id: str) -> None:
    if ALLOWED_CHANNELS and channel_id not in ALLOWED_CHANNELS:
        raise ValueError(f"Channel {channel_id} is not allowed by MCP_DISCORD_CHANNEL_IDS")


def _discord_get(path: str, params: dict[str, Any] | None = None) -> Any:
    resp = requests.get(f"{BASE_URL}{path}", headers=_headers(), params=params or {}, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _discord_post(path: str, payload: dict[str, Any]) -> Any:
    resp = requests.post(f"{BASE_URL}{path}", headers=_headers(), json=payload, timeout=20)
    resp.raise_for_status()
    return resp.json()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "configured": bool(DISCORD_BOT_TOKEN and DISCORD_GUILD_ID),
        "restricted_channels": sorted(ALLOWED_CHANNELS),
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
                "serverInfo": {"name": "mcp-discord-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "discord_list_channels",
                        "description": "List Discord text channels in the configured guild",
                        "inputSchema": {
                            "type": "object",
                            "properties": {},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "discord_post_message",
                        "description": "Post a message to a Discord channel",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "channel_id": {"type": "string"},
                                "content": {"type": "string"},
                            },
                            "required": ["channel_id", "content"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "discord_get_channel_history",
                        "description": "Get recent messages in a Discord channel",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "channel_id": {"type": "string"},
                                "limit": {"type": "number"},
                            },
                            "required": ["channel_id"],
                            "additionalProperties": False,
                        },
                    },
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    if not DISCORD_BOT_TOKEN or not DISCORD_GUILD_ID:
        return _jsonrpc_result(
            req_id,
            {
                "isError": True,
                "content": [
                    {
                        "type": "text",
                        "text": "Discord non configure: renseigne MCP_DISCORD_BOT_TOKEN et MCP_DISCORD_GUILD_ID dans .env",
                    }
                ],
            },
        )

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "discord_list_channels":
            channels = _discord_get(f"/guilds/{DISCORD_GUILD_ID}/channels")
            data = [
                {"id": c.get("id"), "name": c.get("name"), "type": c.get("type")}
                for c in channels
                if c.get("type") == 0 and (not ALLOWED_CHANNELS or c.get("id") in ALLOWED_CHANNELS)
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(data)}]})

        if tool_name == "discord_post_message":
            channel_id = str(args.get("channel_id", ""))
            content = str(args.get("content", ""))
            if not channel_id or not content:
                return _jsonrpc_error(req_id, -32602, "channel_id and content are required")
            _guard_channel(channel_id)
            msg = _discord_post(f"/channels/{channel_id}/messages", {"content": content})
            out = {"id": msg.get("id"), "channel_id": msg.get("channel_id")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        if tool_name == "discord_get_channel_history":
            channel_id = str(args.get("channel_id", ""))
            limit = min(int(args.get("limit", 10)), 100)
            if not channel_id:
                return _jsonrpc_error(req_id, -32602, "channel_id is required")
            _guard_channel(channel_id)
            messages = _discord_get(f"/channels/{channel_id}/messages", {"limit": limit})
            out = [
                {
                    "id": m.get("id"),
                    "author": (m.get("author") or {}).get("username"),
                    "content": m.get("content"),
                    "timestamp": m.get("timestamp"),
                }
                for m in messages
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(out)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (requests.HTTPError, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"Discord error: {exc}"}]},
        )
