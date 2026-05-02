"""Pont MCP HTTP (JSON-RPC minimal) vers le CLI dbt Core sur un projet monté."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request

app = FastAPI(title="MCP dbt Core Bridge", version="0.1.0")

DBT_CORE_PROJECT_DIR = os.getenv("DBT_CORE_PROJECT_DIR", "/workspace").rstrip("/")
DBT_PROFILES_DIR = os.getenv("DBT_PROFILES_DIR", "").strip()
DBT_TARGET = os.getenv("DBT_TARGET", "").strip()
DBT_ALLOW_MUTATIONS = os.getenv("DBT_ALLOW_MUTATIONS", "false").lower() == "true"


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(payload, ensure_ascii=True)}]})


def _project_root() -> Path:
    return Path(DBT_CORE_PROJECT_DIR)


def _env() -> dict[str, str]:
    e = dict(os.environ)
    if DBT_PROFILES_DIR:
        e["DBT_PROFILES_DIR"] = DBT_PROFILES_DIR
    return e


def _dbt(argv: list[str], timeout: int = 900) -> tuple[int, str, str]:
    root = _project_root()
    if not root.is_dir():
        raise ValueError(f"Project directory does not exist or is not a directory: {root}")
    proc = subprocess.run(
        ["dbt", *argv],
        cwd=str(root),
        capture_output=True,
        text=True,
        timeout=timeout,
        env=_env(),
    )
    return proc.returncode, proc.stdout or "", proc.stderr or ""


def _target_flag() -> list[str]:
    if DBT_TARGET:
        return ["--target", DBT_TARGET]
    return []


def _select_args(select_val: str | None) -> list[str]:
    if not select_val or not str(select_val).strip():
        return []
    return ["--select", str(select_val).strip()]


@app.get("/health")
def health() -> dict[str, Any]:
    root = _project_root()
    return {
        "status": "ok",
        "project_dir": str(root),
        "project_exists": root.is_dir(),
        "profiles_dir": DBT_PROFILES_DIR or None,
        "target": DBT_TARGET or None,
        "mutations_enabled": DBT_ALLOW_MUTATIONS,
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
                "serverInfo": {"name": "mcp-dbt-core-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "dbt_core_parse",
                        "description": "Run dbt parse (generate manifest under target/)",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "dbt_core_ls",
                        "description": "Run dbt ls (optionally --select, --resource-type)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "select": {"type": "string"},
                                "resource_type": {
                                    "type": "string",
                                    "description": "e.g. model, source, test, snapshot, seed",
                                },
                            },
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_core_compile",
                        "description": "Run dbt compile (optional --select)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"select": {"type": "string"}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_core_deps",
                        "description": "Run dbt deps (packages) — requires DBT_ALLOW_MUTATIONS=true",
                        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
                    },
                    {
                        "name": "dbt_core_run",
                        "description": "Run dbt run — requires DBT_ALLOW_MUTATIONS=true",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"select": {"type": "string"}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_core_test",
                        "description": "Run dbt test — requires DBT_ALLOW_MUTATIONS=true",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"select": {"type": "string"}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_core_build",
                        "description": "Run dbt build — requires DBT_ALLOW_MUTATIONS=true",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"select": {"type": "string"}},
                            "additionalProperties": False,
                        },
                    },
                    {
                        "name": "dbt_core_manifest_summary",
                        "description": "Read target/manifest.json and return counts + model names (truncated)",
                        "inputSchema": {
                            "type": "object",
                            "properties": {"max_models": {"type": "number", "default": 200}},
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
        tf = _target_flag()

        if tool_name == "dbt_core_parse":
            code, out, err = _dbt(["parse", *tf])
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_ls":
            cmd = ["ls", *tf]
            sel = args.get("select")
            cmd.extend(_select_args(sel if isinstance(sel, str) else None))
            rt = args.get("resource_type")
            if isinstance(rt, str) and rt.strip():
                cmd.extend(["--resource-type", rt.strip()])
            code, out, err = _dbt(cmd)
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_compile":
            sel = args.get("select")
            cmd = ["compile", *tf, *_select_args(sel if isinstance(sel, str) else None)]
            code, out, err = _dbt(cmd)
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_deps":
            if not DBT_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set DBT_ALLOW_MUTATIONS=true for deps/run/test/build."},
                )
            code, out, err = _dbt(["deps", *tf])
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_run":
            if not DBT_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set DBT_ALLOW_MUTATIONS=true for deps/run/test/build."},
                )
            sel = args.get("select")
            cmd = ["run", *tf, *_select_args(sel if isinstance(sel, str) else None)]
            code, out, err = _dbt(cmd)
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_test":
            if not DBT_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set DBT_ALLOW_MUTATIONS=true for deps/run/test/build."},
                )
            sel = args.get("select")
            cmd = ["test", *tf, *_select_args(sel if isinstance(sel, str) else None)]
            code, out, err = _dbt(cmd)
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_build":
            if not DBT_ALLOW_MUTATIONS:
                return _text_result(
                    req_id,
                    {"error": "Mutations disabled. Set DBT_ALLOW_MUTATIONS=true for deps/run/test/build."},
                )
            sel = args.get("select")
            cmd = ["build", *tf, *_select_args(sel if isinstance(sel, str) else None)]
            code, out, err = _dbt(cmd)
            return _text_result(req_id, {"returncode": code, "stdout": out, "stderr": err})

        if tool_name == "dbt_core_manifest_summary":
            max_models = int(args.get("max_models", 200))
            max_models = max(1, min(max_models, 2000))
            manifest_path = _project_root() / "target" / "manifest.json"
            if not manifest_path.is_file():
                return _text_result(
                    req_id,
                    {"error": f"No manifest at {manifest_path}. Run dbt_core_parse first.", "nodes": []},
                )
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            nodes = data.get("nodes") or {}
            model_names: list[str] = []
            for _nid, n in nodes.items():
                if isinstance(n, dict) and n.get("resource_type") == "model":
                    name = n.get("name")
                    if isinstance(name, str):
                        model_names.append(name)
            model_names.sort()
            truncated = model_names[:max_models]
            return _text_result(
                req_id,
                {
                    "metadata": data.get("metadata"),
                    "node_count": len(nodes),
                    "model_count": len(model_names),
                    "models_sample": truncated,
                    "truncated": len(model_names) > len(truncated),
                },
            )

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except subprocess.TimeoutExpired as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"dbt timeout: {exc}"}]},
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"dbt Core error: {exc}"}]},
        )
