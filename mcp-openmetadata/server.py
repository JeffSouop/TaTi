import json
import os
import secrets
from typing import Any

import httpx
from fastapi import FastAPI, Request

app = FastAPI(title="MCP OpenMetadata Bridge", version="0.2.0")

SESSION_ID = secrets.token_hex(16)
OPENMETADATA_URL = os.getenv("OPENMETADATA_URL", "http://host.docker.internal:8585").rstrip("/")
OPENMETADATA_JWT = os.getenv("OPENMETADATA_JWT", "")
OPENMETADATA_ALLOW_MUTATIONS = os.getenv("OPENMETADATA_ALLOW_MUTATIONS", "false").strip().lower() in ("1", "true", "yes", "on")
OPENMETADATA_WRITE_CONFIRM_TOKEN = os.getenv("OPENMETADATA_WRITE_CONFIRM_TOKEN", "").strip()


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True)}]})


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if OPENMETADATA_JWT:
        headers["Authorization"] = f"Bearer {OPENMETADATA_JWT}"
    return headers


async def _om_get(path: str, params: dict[str, Any] | None = None) -> Any:
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.get(f"{OPENMETADATA_URL}{path}", headers=_headers(), params=params or {})
        res.raise_for_status()
        return res.json()


async def _om_patch(path: str, body: Any) -> Any:
    async with httpx.AsyncClient(timeout=20.0) as client:
        headers = _headers()
        headers["Content-Type"] = "application/json-patch+json"
        res = await client.patch(f"{OPENMETADATA_URL}{path}", headers=headers, json=body)
        res.raise_for_status()
        return res.json()


def _ensure_write_confirmation(confirm_value: str | None) -> None:
    if not OPENMETADATA_ALLOW_MUTATIONS:
        raise ValueError("Mutations desactivees. Definir OPENMETADATA_ALLOW_MUTATIONS=true")
    if not OPENMETADATA_WRITE_CONFIRM_TOKEN:
        raise ValueError("OPENMETADATA_WRITE_CONFIRM_TOKEN manquant")
    if (confirm_value or "").strip() != OPENMETADATA_WRITE_CONFIRM_TOKEN:
        raise ValueError("Confirmation invalide pour operation d'ecriture")


@app.get("/health")
async def health() -> dict[str, Any]:
    status: dict[str, Any] = {
        "status": "ok",
        "openmetadata_url": OPENMETADATA_URL,
        "token_configured": bool(OPENMETADATA_JWT),
        "mutations_enabled": OPENMETADATA_ALLOW_MUTATIONS,
    }
    try:
        await _om_get("/api/v1/system/version")
        status["openmetadata_reachable"] = True
    except Exception:
        status["openmetadata_reachable"] = False
    return status


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
                "serverInfo": {"name": "mcp-openmetadata-local", "version": "0.2.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "om_search_entities",
                        "description": "Search entities in OpenMetadata by index and query",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "index": {"type": "string", "default": "table_search_index"},
                                "query": {"type": "string"},
                                "from": {"type": "number", "default": 0},
                                "size": {"type": "number", "default": 10},
                            },
                            "required": ["query"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_list_tables",
                        "description": "List tables from OpenMetadata catalog",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "number", "default": 20},
                                "include": {"type": "string", "default": "non-deleted"},
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_get_entity_by_fqn",
                        "description": "Get an OpenMetadata entity by type and FQN",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "entity_type": {"type": "string", "default": "tables"},
                                "fqn": {"type": "string"},
                            },
                            "required": ["fqn"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_list_pipelines",
                        "description": "List pipelines in OpenMetadata",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "limit": {"type": "number", "default": 20},
                                "include": {"type": "string", "default": "non-deleted"},
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_update_entity_description",
                        "description": "Update description for an OpenMetadata entity (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "entity_type": {"type": "string", "default": "tables"},
                                "id": {"type": "string"},
                                "description": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["id", "description", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_update_entity_owner",
                        "description": "Update owner for an OpenMetadata entity (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "entity_type": {"type": "string", "default": "tables"},
                                "id": {"type": "string"},
                                "owner_id": {"type": "string"},
                                "owner_type": {"type": "string", "default": "user"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["id", "owner_id", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_add_entity_tag",
                        "description": "Add a tag to an OpenMetadata entity (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "entity_type": {"type": "string", "default": "tables"},
                                "id": {"type": "string"},
                                "tag_fqn": {"type": "string"},
                                "label_type": {"type": "string", "default": "Manual"},
                                "state": {"type": "string", "default": "Confirmed"},
                                "source": {"type": "string", "default": "Classification"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["id", "tag_fqn", "confirm"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "om_remove_entity_tag",
                        "description": "Remove a tag from an OpenMetadata entity (requires confirm token)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "entity_type": {"type": "string", "default": "tables"},
                                "id": {"type": "string"},
                                "tag_fqn": {"type": "string"},
                                "confirm": {"type": "string"},
                            },
                            "required": ["id", "tag_fqn", "confirm"],
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
        if tool_name == "om_search_entities":
            index = str(args.get("index", "table_search_index"))
            query = str(args.get("query", "")).strip()
            if not query:
                return _jsonrpc_error(req_id, -32602, "query is required")
            data = await _om_get(
                "/api/v1/search/query",
                {"index": index, "q": query, "from": int(args.get("from", 0)), "size": int(args.get("size", 10))},
            )
            return _text_result(req_id, data)

        if tool_name == "om_list_tables":
            data = await _om_get(
                "/api/v1/tables",
                {"limit": int(args.get("limit", 20)), "include": str(args.get("include", "non-deleted"))},
            )
            return _text_result(req_id, data)

        if tool_name == "om_get_entity_by_fqn":
            entity_type = str(args.get("entity_type", "tables"))
            fqn = str(args.get("fqn", "")).strip()
            if not fqn:
                return _jsonrpc_error(req_id, -32602, "fqn is required")
            data = await _om_get(f"/api/v1/{entity_type}/name/{fqn}")
            return _text_result(req_id, data)

        if tool_name == "om_list_pipelines":
            data = await _om_get(
                "/api/v1/pipelines",
                {"limit": int(args.get("limit", 20)), "include": str(args.get("include", "non-deleted"))},
            )
            return _text_result(req_id, data)

        if tool_name == "om_update_entity_description":
            _ensure_write_confirmation(str(args.get("confirm", "")))
            entity_type = str(args.get("entity_type", "tables"))
            entity_id = str(args.get("id", "")).strip()
            description = str(args.get("description", "")).strip()
            if not entity_id or not description:
                return _jsonrpc_error(req_id, -32602, "id and description are required")
            patch = [{"op": "add", "path": "/description", "value": description}]
            data = await _om_patch(f"/api/v1/{entity_type}/{entity_id}", patch)
            return _text_result(req_id, data)

        if tool_name == "om_update_entity_owner":
            _ensure_write_confirmation(str(args.get("confirm", "")))
            entity_type = str(args.get("entity_type", "tables"))
            entity_id = str(args.get("id", "")).strip()
            owner_id = str(args.get("owner_id", "")).strip()
            owner_type = str(args.get("owner_type", "user")).strip()
            if not entity_id or not owner_id:
                return _jsonrpc_error(req_id, -32602, "id and owner_id are required")
            patch = [{"op": "add", "path": "/owner", "value": {"id": owner_id, "type": owner_type}}]
            data = await _om_patch(f"/api/v1/{entity_type}/{entity_id}", patch)
            return _text_result(req_id, data)

        if tool_name in ("om_add_entity_tag", "om_remove_entity_tag"):
            _ensure_write_confirmation(str(args.get("confirm", "")))
            entity_type = str(args.get("entity_type", "tables"))
            entity_id = str(args.get("id", "")).strip()
            tag_fqn = str(args.get("tag_fqn", "")).strip()
            if not entity_id or not tag_fqn:
                return _jsonrpc_error(req_id, -32602, "id and tag_fqn are required")

            entity = await _om_get(f"/api/v1/{entity_type}/{entity_id}")
            tags = list(entity.get("tags") or [])
            existing = {str((t.get("tagFQN") or "").strip()).lower(): t for t in tags}
            key = tag_fqn.lower()

            if tool_name == "om_add_entity_tag":
                if key not in existing:
                    tags.append(
                        {
                            "tagFQN": tag_fqn,
                            "labelType": str(args.get("label_type", "Manual")),
                            "state": str(args.get("state", "Confirmed")),
                            "source": str(args.get("source", "Classification")),
                        }
                    )
            else:
                tags = [t for t in tags if str((t.get("tagFQN") or "").strip()).lower() != key]

            patch = [{"op": "add", "path": "/tags", "value": tags}]
            data = await _om_patch(f"/api/v1/{entity_type}/{entity_id}", patch)
            return _text_result(req_id, data)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except httpx.HTTPStatusError as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"OpenMetadata HTTP {exc.response.status_code}: {exc.response.text[:400]}"}]},
        )
    except Exception as exc:  # noqa: BLE001
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"OpenMetadata error: {exc}"}]},
        )
