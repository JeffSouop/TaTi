"""Pont MCP HTTP (JSON-RPC minimal) vers l'API REST stable Apache Airflow v1."""

import json
import os
from typing import Any
from urllib.parse import quote

import requests
from fastapi import FastAPI, Request
from requests.auth import HTTPBasicAuth

app = FastAPI(title="MCP Airflow Bridge", version="0.1.0")

AIRFLOW_BASE_URL = os.getenv("AIRFLOW_BASE_URL", "http://host.docker.internal:8080").rstrip("/")
AIRFLOW_API_ROOT = f"{AIRFLOW_BASE_URL}/api/v1"
AIRFLOW_USERNAME = os.getenv("AIRFLOW_USERNAME", "")
AIRFLOW_PASSWORD = os.getenv("AIRFLOW_PASSWORD", "")
AIRFLOW_API_TOKEN = os.getenv("AIRFLOW_API_TOKEN", "").strip()
AIRFLOW_ALLOW_MUTATIONS = os.getenv("AIRFLOW_ALLOW_MUTATIONS", "false").lower() == "true"
AIRFLOW_SSL_VERIFY = os.getenv("AIRFLOW_SSL_VERIFY", "true").lower() == "true"


def _session() -> requests.Session:
    s = requests.Session()
    s.verify = AIRFLOW_SSL_VERIFY
    s.headers.setdefault("Content-Type", "application/json")
    if AIRFLOW_API_TOKEN:
        s.headers["Authorization"] = f"Bearer {AIRFLOW_API_TOKEN}"
    elif AIRFLOW_USERNAME or AIRFLOW_PASSWORD:
        s.auth = HTTPBasicAuth(AIRFLOW_USERNAME or "", AIRFLOW_PASSWORD or "")
    return s


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True)}]})


def _airflow_request(method: str, path: str, **kwargs: Any) -> Any:
    url = f"{AIRFLOW_API_ROOT}{path}"
    s = _session()
    resp = s.request(method, url, timeout=45, **kwargs)
    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise ValueError(f"HTTP {resp.status_code}: {detail}")
    if resp.status_code == 204 or not resp.content:
        return {}
    return resp.json()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "airflow_base_url": AIRFLOW_BASE_URL,
        "api_root": AIRFLOW_API_ROOT,
        "mutations_enabled": AIRFLOW_ALLOW_MUTATIONS,
        "auth_mode": "token" if AIRFLOW_API_TOKEN else ("basic" if (AIRFLOW_USERNAME or AIRFLOW_PASSWORD) else "none"),
        "ssl_verify": AIRFLOW_SSL_VERIFY,
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
                "serverInfo": {"name": "mcp-airflow-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "airflow_list_dags",
                        "description": "List DAGs (Airflow REST GET /dags)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"limit": {"type": "number", "default": 50}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_get_dag",
                        "description": "Get one DAG by id",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"dag_id": {"type": "string"}},
                            "required": ["dag_id"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_list_dag_runs",
                        "description": "List DAG runs for a DAG",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "dag_id": {"type": "string"},
                                "limit": {"type": "number", "default": 25},
                            },
                            "required": ["dag_id"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_get_dag_run",
                        "description": "Get a single DAG run",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"dag_id": {"type": "string"}, "dag_run_id": {"type": "string"}},
                            "required": ["dag_id", "dag_run_id"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_list_tasks",
                        "description": "List tasks for a DAG",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"dag_id": {"type": "string"}},
                            "required": ["dag_id"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_trigger_dag_run",
                        "description": "Trigger a DAG run (requires AIRFLOW_ALLOW_MUTATIONS=true)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "dag_id": {"type": "string"},
                                "conf": {"type": "object"},
                            },
                            "required": ["dag_id"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "airflow_set_dag_pause",
                        "description": "Pause or unpause a DAG (requires AIRFLOW_ALLOW_MUTATIONS=true)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "dag_id": {"type": "string"},
                                "paused": {"type": "boolean"},
                            },
                            "required": ["dag_id", "paused"],
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
        if tool_name == "airflow_list_dags":
            limit = int(args.get("limit", 50))
            limit = max(1, min(limit, 200))
            data = _airflow_request("GET", "/dags", params={"limit": limit})
            return _text_result(req_id, data)

        if tool_name == "airflow_get_dag":
            dag_id = str(args.get("dag_id", ""))
            data = _airflow_request("GET", f"/dags/{quote(dag_id, safe='')}")
            return _text_result(req_id, data)

        if tool_name == "airflow_list_dag_runs":
            dag_id = str(args.get("dag_id", ""))
            limit = int(args.get("limit", 25))
            limit = max(1, min(limit, 100))
            qid = quote(dag_id, safe="")
            data = _airflow_request("GET", f"/dags/{qid}/dagRuns", params={"limit": limit})
            return _text_result(req_id, data)

        if tool_name == "airflow_get_dag_run":
            dag_id = str(args.get("dag_id", ""))
            run_id = str(args.get("dag_run_id", ""))
            qd = quote(dag_id, safe="")
            qr = quote(run_id, safe="")
            data = _airflow_request("GET", f"/dags/{qd}/dagRuns/{qr}")
            return _text_result(req_id, data)

        if tool_name == "airflow_list_tasks":
            dag_id = str(args.get("dag_id", ""))
            qid = quote(dag_id, safe="")
            data = _airflow_request("GET", f"/dags/{qid}/tasks")
            return _text_result(req_id, data)

        if tool_name == "airflow_trigger_dag_run":
            if not AIRFLOW_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set AIRFLOW_ALLOW_MUTATIONS=true to enable trigger/pause."},
                )
            dag_id = str(args.get("dag_id", ""))
            conf = args.get("conf")
            body: dict[str, Any] = {}
            if isinstance(conf, dict):
                body["conf"] = conf
            qid = quote(dag_id, safe="")
            data = _airflow_request("POST", f"/dags/{qid}/dagRuns", json=body)
            return _text_result(req_id, data)

        if tool_name == "airflow_set_dag_pause":
            if not AIRFLOW_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set AIRFLOW_ALLOW_MUTATIONS=true to enable trigger/pause."},
                )
            dag_id = str(args.get("dag_id", ""))
            paused = bool(args.get("paused"))
            qid = quote(dag_id, safe="")
            data = _airflow_request("PATCH", f"/dags/{qid}", json={"is_paused": paused})
            return _text_result(req_id, data)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (requests.RequestException, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"Airflow error: {exc}"}]},
        )
