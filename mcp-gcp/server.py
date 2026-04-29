import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import FastAPI, Request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

app = FastAPI(title="MCP GCP Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
GCP_REGION = os.getenv("GCP_REGION", "europe-west1")
GCP_SERVICE_ACCOUNT_JSON = os.getenv("GCP_SERVICE_ACCOUNT_JSON", "")

SCOPES = ["https://www.googleapis.com/auth/cloud-platform.read-only"]


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _serialize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    return value


def _credentials():
    if not GCP_SERVICE_ACCOUNT_JSON.strip():
        raise ValueError("GCP_SERVICE_ACCOUNT_JSON is required")
    info = json.loads(GCP_SERVICE_ACCOUNT_JSON)
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def _client(api: str, version: str):
    return build(api, version, credentials=_credentials(), cache_discovery=False)


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(
        req_id, {"content": [{"type": "text", "text": json.dumps(_serialize(payload), ensure_ascii=True)}]}
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "project_id": GCP_PROJECT_ID or None,
        "region": GCP_REGION,
        "configured": bool(GCP_PROJECT_ID and GCP_SERVICE_ACCOUNT_JSON),
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
                "serverInfo": {"name": "mcp-gcp-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "gcp_list_projects",
                        "description": "List accessible GCP projects",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "gcp_list_compute_instances",
                        "description": "List GCE instances in configured project",
                        "inputSchema": {"type": "object", "properties": {"zone": {"type": "string"}}, "additionalProperties": False},
                    },
                    {
                        "name": "gcp_list_gke_clusters",
                        "description": "List GKE clusters in configured project",
                        "inputSchema": {"type": "object", "properties": {"location": {"type": "string"}}, "additionalProperties": False},
                    },
                    {
                        "name": "gcp_list_storage_buckets",
                        "description": "List Cloud Storage buckets in configured project",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "gcp_recent_log_entries",
                        "description": "Fetch recent Cloud Logging entries",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "minutes": {"type": "number", "default": 30},
                                "limit": {"type": "number", "default": 50},
                                "filter": {"type": "string"},
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
        if tool_name == "gcp_list_projects":
            crm = _client("cloudresourcemanager", "v1")
            data = crm.projects().list().execute().get("projects", [])
            out = [{"project_id": p.get("projectId"), "name": p.get("name"), "lifecycle_state": p.get("lifecycleState")} for p in data]
            return _text_result(req_id, out)

        if not GCP_PROJECT_ID:
            raise ValueError("GCP_PROJECT_ID is required for this tool")

        if tool_name == "gcp_list_compute_instances":
            compute = _client("compute", "v1")
            zone = str(args.get("zone", ""))
            if zone:
                data = compute.instances().list(project=GCP_PROJECT_ID, zone=zone).execute().get("items", [])
                out = [{"name": i.get("name"), "zone": zone, "status": i.get("status"), "machine_type": i.get("machineType")} for i in data]
                return _text_result(req_id, out)
            data = compute.instances().aggregatedList(project=GCP_PROJECT_ID).execute().get("items", {})
            out = []
            for zone_name, content in data.items():
                for i in content.get("instances", []):
                    out.append({"name": i.get("name"), "zone": zone_name, "status": i.get("status"), "machine_type": i.get("machineType")})
            return _text_result(req_id, out)

        if tool_name == "gcp_list_gke_clusters":
            container = _client("container", "v1")
            location = str(args.get("location", "-"))
            parent = f"projects/{GCP_PROJECT_ID}/locations/{location}"
            data = container.projects().locations().clusters().list(parent=parent).execute()
            clusters = data.get("clusters", [])
            out = [{"name": c.get("name"), "location": c.get("location"), "status": c.get("status"), "endpoint": c.get("endpoint")} for c in clusters]
            return _text_result(req_id, out)

        if tool_name == "gcp_list_storage_buckets":
            storage = _client("storage", "v1")
            data = storage.buckets().list(project=GCP_PROJECT_ID).execute().get("items", [])
            out = [{"name": b.get("name"), "location": b.get("location"), "storage_class": b.get("storageClass")} for b in data]
            return _text_result(req_id, out)

        if tool_name == "gcp_recent_log_entries":
            logging = _client("logging", "v2")
            minutes = int(args.get("minutes", 30))
            limit = int(args.get("limit", 50))
            user_filter = str(args.get("filter", "")).strip()
            start = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
            base_filter = f'timestamp>="{start}"'
            full_filter = f"{base_filter} AND ({user_filter})" if user_filter else base_filter
            req = {
                "resourceNames": [f"projects/{GCP_PROJECT_ID}"],
                "pageSize": max(1, min(limit, 200)),
                "orderBy": "timestamp desc",
                "filter": full_filter,
            }
            data = logging.entries().list(body=req).execute().get("entries", [])
            out = [{"timestamp": e.get("timestamp"), "severity": e.get("severity"), "log_name": e.get("logName"), "text_payload": e.get("textPayload")} for e in data]
            return _text_result(req_id, out)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (HttpError, ValueError, json.JSONDecodeError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"GCP error: {exc}"}]},
        )
