import os
import secrets
from typing import Any

from fastapi import FastAPI, Request
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

app = FastAPI(title="MCP Slack Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN", "")
SLACK_TEAM_ID = os.getenv("SLACK_TEAM_ID", "")
ALLOWED_CHANNELS = {c.strip() for c in os.getenv("SLACK_CHANNEL_IDS", "").split(",") if c.strip()}


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _client() -> WebClient:
    return WebClient(token=SLACK_BOT_TOKEN)


def _guard_channel(channel_id: str) -> None:
    if ALLOWED_CHANNELS and channel_id not in ALLOWED_CHANNELS:
        raise ValueError(f"Channel {channel_id} is not allowed by MCP_SLACK_CHANNEL_IDS")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "configured": bool(SLACK_BOT_TOKEN and SLACK_TEAM_ID),
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
                "serverInfo": {"name": "mcp-slack-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "slack_list_channels",
                        "description": "List Slack public channels",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "number"},
                                "cursor": {"type": "string"},
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "slack_post_message",
                        "description": "Post a message to a Slack channel",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "channel_id": {"type": "string"},
                                "text": {"type": "string"},
                            },
                            "required": ["channel_id", "text"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "slack_get_channel_history",
                        "description": "Get recent messages in a channel",
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

    if not SLACK_BOT_TOKEN or not SLACK_TEAM_ID:
        return _jsonrpc_result(
            req_id,
            {
                "isError": True,
                "content": [
                    {
                        "type": "text",
                        "text": "Slack non configuré: renseigne MCP_SLACK_BOT_TOKEN et MCP_SLACK_TEAM_ID dans .env",
                    }
                ],
            },
        )

    tool_name = params.get("name")
    args = params.get("arguments") or {}
    client = _client()

    try:
        if tool_name == "slack_list_channels":
            limit = min(int(args.get("limit", 100)), 200)
            cursor = args.get("cursor")
            resp = client.conversations_list(limit=limit, cursor=cursor, types="public_channel")
            channels = resp.get("channels", [])
            if ALLOWED_CHANNELS:
                channels = [c for c in channels if c.get("id") in ALLOWED_CHANNELS]
            data = [
                {"id": c.get("id"), "name": c.get("name"), "is_private": c.get("is_private", False)}
                for c in channels
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(data)}]})

        if tool_name == "slack_post_message":
            channel_id = str(args.get("channel_id", ""))
            text = str(args.get("text", ""))
            if not channel_id or not text:
                return _jsonrpc_error(req_id, -32602, "channel_id and text are required")
            _guard_channel(channel_id)
            resp = client.chat_postMessage(channel=channel_id, text=text)
            data = {"ok": resp.get("ok"), "channel": resp.get("channel"), "ts": resp.get("ts")}
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(data)}]})

        if tool_name == "slack_get_channel_history":
            channel_id = str(args.get("channel_id", ""))
            limit = int(args.get("limit", 10))
            if not channel_id:
                return _jsonrpc_error(req_id, -32602, "channel_id is required")
            _guard_channel(channel_id)
            resp = client.conversations_history(channel=channel_id, limit=limit)
            data = [
                {"ts": m.get("ts"), "user": m.get("user"), "text": m.get("text")}
                for m in resp.get("messages", [])
            ]
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(data)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (SlackApiError, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"Slack error: {exc}"}]},
        )
