import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

import requests
from fastapi import FastAPI, Request

app = FastAPI(title="MCP Azure Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
AZURE_SUBSCRIPTION_ID = os.getenv("AZURE_SUBSCRIPTION_ID", "")
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID", "")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID", "")
AZURE_CLIENT_SECRET = os.getenv("AZURE_CLIENT_SECRET", "")
AZURE_ACCESS_TOKEN = os.getenv("AZURE_ACCESS_TOKEN", "")

ARM_BASE = "https://management.azure.com"
ARM_SCOPE = "https://management.azure.com/.default"


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


def _token() -> str:
    if AZURE_ACCESS_TOKEN.strip():
        return AZURE_ACCESS_TOKEN.strip()
    if AZURE_TENANT_ID and AZURE_CLIENT_ID and AZURE_CLIENT_SECRET:
        url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
        resp = requests.post(
            url,
            data={
                "client_id": AZURE_CLIENT_ID,
                "client_secret": AZURE_CLIENT_SECRET,
                "grant_type": "client_credentials",
                "scope": ARM_SCOPE,
            },
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json().get("access_token", "")
    raise ValueError("Azure credentials missing. Set AZURE_ACCESS_TOKEN or tenant/client/secret.")


def _arm_get(path: str, api_version: str, params: dict[str, Any] | None = None) -> Any:
    token = _token()
    all_params = {"api-version": api_version}
    if params:
        all_params.update(params)
    resp = requests.get(
        f"{ARM_BASE}{path}",
        headers={"Authorization": f"Bearer {token}"},
        params=all_params,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(
        req_id,
        {"content": [{"type": "text", "text": json.dumps(_serialize(payload), ensure_ascii=True)}]},
    )


@app.get("/health")
def health() -> dict[str, Any]:
    configured = bool(AZURE_ACCESS_TOKEN or (AZURE_TENANT_ID and AZURE_CLIENT_ID and AZURE_CLIENT_SECRET))
    return {"status": "ok", "subscription_id": AZURE_SUBSCRIPTION_ID or None, "configured": configured}


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
                "serverInfo": {"name": "mcp-azure-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "azure_list_resource_groups",
                        "description": "List Azure Resource Groups in the configured subscription",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "azure_list_virtual_machines",
                        "description": "List Azure virtual machines in the configured subscription",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "azure_get_network_security_group",
                        "description": "Get Azure Network Security Group rules",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"resource_group": {"type": "string"}, "nsg_name": {"type": "string"}},
                            "required": ["resource_group", "nsg_name"],
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "azure_list_web_apps",
                        "description": "List Azure App Service web apps",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "azure_list_storage_accounts",
                        "description": "List Azure storage accounts",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "azure_list_key_vaults",
                        "description": "List Azure Key Vault resources",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "azure_activity_log_recent_events",
                        "description": "List recent Azure Activity Log events",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"hours": {"type": "number", "default": 24}, "max_items": {"type": "number", "default": 50}},
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
        if not AZURE_SUBSCRIPTION_ID:
            raise ValueError("AZURE_SUBSCRIPTION_ID is required")

        if tool_name == "azure_list_resource_groups":
            data = _arm_get(f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/resourcegroups", "2021-04-01")
            out = [{"name": rg.get("name"), "location": rg.get("location")} for rg in data.get("value", [])]
            return _text_result(req_id, out)

        if tool_name == "azure_list_virtual_machines":
            data = _arm_get(f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Compute/virtualMachines", "2023-07-01")
            out = []
            for vm in data.get("value", []):
                out.append(
                    {
                        "name": vm.get("name"),
                        "location": vm.get("location"),
                        "vm_size": ((vm.get("properties") or {}).get("hardwareProfile") or {}).get("vmSize"),
                        "provisioning_state": ((vm.get("properties") or {}).get("provisioningState")),
                    }
                )
            return _text_result(req_id, out)

        if tool_name == "azure_get_network_security_group":
            rg = str(args.get("resource_group", ""))
            nsg = str(args.get("nsg_name", ""))
            data = _arm_get(
                f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/resourceGroups/{quote(rg)}/providers/Microsoft.Network/networkSecurityGroups/{quote(nsg)}",
                "2023-09-01",
            )
            rules = ((data.get("properties") or {}).get("securityRules") or [])
            out = [
                {
                    "name": r.get("name"),
                    "priority": ((r.get("properties") or {}).get("priority")),
                    "direction": ((r.get("properties") or {}).get("direction")),
                    "access": ((r.get("properties") or {}).get("access")),
                    "protocol": ((r.get("properties") or {}).get("protocol")),
                    "destination_port": ((r.get("properties") or {}).get("destinationPortRange")),
                }
                for r in rules
            ]
            return _text_result(req_id, out)

        if tool_name == "azure_list_web_apps":
            data = _arm_get(f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Web/sites", "2023-12-01")
            out = [{"name": a.get("name"), "location": a.get("location"), "state": ((a.get("properties") or {}).get("state"))} for a in data.get("value", [])]
            return _text_result(req_id, out)

        if tool_name == "azure_list_storage_accounts":
            data = _arm_get(f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Storage/storageAccounts", "2023-05-01")
            out = [{"name": s.get("name"), "location": s.get("location"), "kind": s.get("kind"), "sku": ((s.get("sku") or {}).get("name"))} for s in data.get("value", [])]
            return _text_result(req_id, out)

        if tool_name == "azure_list_key_vaults":
            data = _arm_get(f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/providers/Microsoft.KeyVault/vaults", "2023-07-01")
            out = [{"name": kv.get("name"), "location": kv.get("location"), "tenant_id": ((kv.get("properties") or {}).get("tenantId"))} for kv in data.get("value", [])]
            return _text_result(req_id, out)

        if tool_name == "azure_activity_log_recent_events":
            hours = int(args.get("hours", 24))
            max_items = int(args.get("max_items", 50))
            start = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
            end = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            filt = f"eventTimestamp ge '{start}' and eventTimestamp le '{end}'"
            data = _arm_get(
                f"/subscriptions/{AZURE_SUBSCRIPTION_ID}/providers/microsoft.insights/eventtypes/management/values",
                "2015-04-01",
                {"$filter": filt},
            )
            events = data.get("value", [])[:max_items]
            out = [
                {
                    "event_timestamp": e.get("eventTimestamp"),
                    "operation_name": (e.get("operationName") or {}).get("value"),
                    "status": (e.get("status") or {}).get("value"),
                    "caller": e.get("caller"),
                    "resource_group": e.get("resourceGroupName"),
                }
                for e in events
            ]
            return _text_result(req_id, out)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (requests.RequestException, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"Azure error: {exc}"}]},
        )
