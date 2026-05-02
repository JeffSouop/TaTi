"""Pont MCP HTTP (JSON-RPC minimal) vers l’API Discovery GraphQL de dbt Cloud."""

import json
import os
from typing import Any

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP dbt Cloud Discovery Bridge", version="0.1.0")

# URL Discovery : voir Account settings → Access URLs (ex. https://<prefix>.metadata.us1.dbt.com/graphql)
DBT_CLOUD_DISCOVERY_URL = os.getenv("DBT_CLOUD_DISCOVERY_URL", "").strip()
DBT_CLOUD_TOKEN = os.getenv("DBT_CLOUD_TOKEN", "").strip()
DBT_CLOUD_ENVIRONMENT_ID = os.getenv("DBT_CLOUD_ENVIRONMENT_ID", "").strip()
DBT_SSL_VERIFY = os.getenv("DBT_SSL_VERIFY", "true").lower() == "true"

QUERY_LIST_MODELS = """
query ListModels($environmentId: BigInt!, $first: Int!) {
  environment(id: $environmentId) {
    applied {
      models(first: $first) {
        edges {
          node {
            name
            uniqueId
            resourceType
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
"""

QUERY_LIST_SOURCES = """
query ListSources($environmentId: BigInt!, $first: Int!) {
  environment(id: $environmentId) {
    applied {
      sources(first: $first) {
        edges {
          node {
            name
            uniqueId
            resourceType
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
"""


def _session() -> requests.Session:
    s = requests.Session()
    s.verify = DBT_SSL_VERIFY
    s.headers.setdefault("Content-Type", "application/json")
    if DBT_CLOUD_TOKEN:
        s.headers["Authorization"] = f"Bearer {DBT_CLOUD_TOKEN}"
    return s


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True)}]})


def _graphql(query: str, variables: dict[str, Any] | None = None) -> Any:
    if not DBT_CLOUD_DISCOVERY_URL:
        raise ValueError("DBT_CLOUD_DISCOVERY_URL is not set")
    if not DBT_CLOUD_TOKEN:
        raise ValueError("DBT_CLOUD_TOKEN is not set")
    s = _session()
    resp = s.post(
        DBT_CLOUD_DISCOVERY_URL,
        json={"query": query, "variables": variables or {}},
        timeout=90,
    )
    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise ValueError(f"HTTP {resp.status_code}: {detail}")
    payload = resp.json()
    if payload.get("errors"):
        raise ValueError(payload["errors"])
    return payload.get("data")


def _resolve_environment_id(args: dict[str, Any]) -> str:
    raw = args.get("environment_id")
    if raw is not None and str(raw).strip():
        return str(raw).strip()
    if DBT_CLOUD_ENVIRONMENT_ID:
        return DBT_CLOUD_ENVIRONMENT_ID
    raise ValueError(
        "Missing environment_id: pass it in tool arguments or set DBT_CLOUD_ENVIRONMENT_ID in the bridge env.",
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "discovery_url_configured": bool(DBT_CLOUD_DISCOVERY_URL),
        "token_configured": bool(DBT_CLOUD_TOKEN),
        "default_environment_id": DBT_CLOUD_ENVIRONMENT_ID or None,
        "ssl_verify": DBT_SSL_VERIFY,
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
                "serverInfo": {"name": "mcp-dbt-discovery", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "dbt_discovery_graphql",
                        "description": "Run an arbitrary GraphQL query against dbt Cloud Discovery API (service token required)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "variables": {"type": "object"},
                            },
                            "required": ["query"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_list_models",
                        "description": "List models for a dbt Cloud environment (Discovery API)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "environment_id": {
                                    "type": "string",
                                    "description": "dbt Cloud environment ID (BigInt as string); defaults to DBT_CLOUD_ENVIRONMENT_ID",
                                },
                                "first": {"type": "number", "default": 50},
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_list_sources",
                        "description": "List sources for a dbt Cloud environment (Discovery API)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "environment_id": {
                                    "type": "string",
                                    "description": "dbt Cloud environment ID; defaults to DBT_CLOUD_ENVIRONMENT_ID",
                                },
                                "first": {"type": "number", "default": 50},
                            },
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
        if tool_name == "dbt_discovery_graphql":
            q = str(args.get("query", ""))
            if not q.strip():
                return _jsonrpc_error(req_id, -32602, "query is required")
            variables = args.get("variables")
            if variables is not None and not isinstance(variables, dict):
                return _jsonrpc_error(req_id, -32602, "variables must be an object")
            data = _graphql(q, variables if isinstance(variables, dict) else None)
            return _text_result(req_id, data)

        if tool_name == "dbt_list_models":
            eid = _resolve_environment_id(args)
            first = int(args.get("first", 50))
            first = max(1, min(first, 500))
            data = _graphql(
                QUERY_LIST_MODELS,
                {"environmentId": int(eid), "first": first},
            )
            return _text_result(req_id, data)

        if tool_name == "dbt_list_sources":
            eid = _resolve_environment_id(args)
            first = int(args.get("first", 50))
            first = max(1, min(first, 500))
            data = _graphql(
                QUERY_LIST_SOURCES,
                {"environmentId": int(eid), "first": first},
            )
            return _text_result(req_id, data)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (requests.RequestException, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"dbt Discovery error: {exc}"}]},
        )
