import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import FastAPI, Request

app = FastAPI(title="MCP AWS Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
AWS_PROFILE = os.getenv("AWS_PROFILE", "")


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


def _session() -> boto3.Session:
    if AWS_PROFILE:
        return boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
    return boto3.Session(region_name=AWS_REGION)


def _client(service: str):
    return _session().client(service, region_name=AWS_REGION)


def _text_result(req_id: Any, payload: Any) -> dict[str, Any]:
    return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": json.dumps(_serialize(payload), ensure_ascii=True)}]})


@app.get("/health")
def health() -> dict[str, Any]:
    configured = bool(os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")) or bool(AWS_PROFILE)
    return {"status": "ok", "region": AWS_REGION, "profile": AWS_PROFILE or None, "configured": configured}


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
                "serverInfo": {"name": "mcp-aws-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {"name": "aws_ec2_list_instances", "description": "List EC2 instances and states", "inputSchema": {"type": "object", "properties": {"state": {"type": "string"}}, "additionalProperties": False}},
                    {"name": "aws_ec2_describe_security_group", "description": "Describe EC2 security group rules", "inputSchema": {"type": "object", "properties": {"group_id": {"type": "string"}}, "required": ["group_id"], "additionalProperties": False}},
                    {"name": "aws_lambda_list_functions", "description": "List Lambda functions", "inputSchema": {"type": "object", "properties": {"max_items": {"type": "number", "default": 50}}, "additionalProperties": False}},
                    {"name": "aws_ecs_list_services", "description": "List ECS services for a cluster", "inputSchema": {"type": "object", "properties": {"cluster": {"type": "string"}}, "required": ["cluster"], "additionalProperties": False}},
                    {"name": "aws_eks_list_clusters", "description": "List EKS clusters", "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}},
                    {"name": "aws_s3_list_buckets", "description": "List S3 buckets", "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}},
                    {"name": "aws_s3_get_public_access_block", "description": "Get S3 account-level public access block", "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False}},
                    {"name": "aws_dynamodb_list_tables", "description": "List DynamoDB tables", "inputSchema": {"type": "object", "properties": {"limit": {"type": "number", "default": 100}}, "additionalProperties": False}},
                    {"name": "aws_cloudwatch_recent_log_events", "description": "Fetch recent CloudWatch log events for a log group", "inputSchema": {"type": "object", "properties": {"log_group_name": {"type": "string"}, "minutes": {"type": "number", "default": 30}, "limit": {"type": "number", "default": 50}}, "required": ["log_group_name"], "additionalProperties": False}},
                    {"name": "aws_cloudtrail_lookup_events", "description": "Lookup CloudTrail events", "inputSchema": {"type": "object", "properties": {"attribute_key": {"type": "string"}, "attribute_value": {"type": "string"}, "max_results": {"type": "number", "default": 20}}, "additionalProperties": False}},
                    {"name": "aws_iam_get_role_summary", "description": "Get IAM role summary and attached policies", "inputSchema": {"type": "object", "properties": {"role_name": {"type": "string"}}, "required": ["role_name"], "additionalProperties": False}},
                    {"name": "aws_secretsmanager_list_secrets", "description": "List Secrets Manager metadata (not secret values)", "inputSchema": {"type": "object", "properties": {"max_results": {"type": "number", "default": 20}}, "additionalProperties": False}},
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "aws_ec2_list_instances":
            ec2 = _client("ec2")
            data = ec2.describe_instances()
            state_filter = str(args.get("state", "")).strip().lower()
            out = []
            for r in data.get("Reservations", []):
                for i in r.get("Instances", []):
                    state = (i.get("State") or {}).get("Name")
                    if state_filter and state != state_filter:
                        continue
                    out.append({"instance_id": i.get("InstanceId"), "state": state, "type": i.get("InstanceType"), "private_ip": i.get("PrivateIpAddress"), "public_ip": i.get("PublicIpAddress"), "security_groups": [g.get("GroupId") for g in i.get("SecurityGroups", [])]})
            return _text_result(req_id, out)

        if tool_name == "aws_ec2_describe_security_group":
            ec2 = _client("ec2")
            group_id = str(args.get("group_id", ""))
            data = ec2.describe_security_groups(GroupIds=[group_id]).get("SecurityGroups", [])
            return _text_result(req_id, data[0] if data else {})

        if tool_name == "aws_lambda_list_functions":
            lam = _client("lambda")
            max_items = int(args.get("max_items", 50))
            data = lam.list_functions(MaxItems=max_items).get("Functions", [])
            out = [{"function_name": f.get("FunctionName"), "runtime": f.get("Runtime"), "last_modified": f.get("LastModified"), "timeout": f.get("Timeout"), "memory_size": f.get("MemorySize")} for f in data]
            return _text_result(req_id, out)

        if tool_name == "aws_ecs_list_services":
            ecs = _client("ecs")
            cluster = str(args.get("cluster", ""))
            arns = ecs.list_services(cluster=cluster).get("serviceArns", [])
            if not arns:
                return _text_result(req_id, [])
            data = ecs.describe_services(cluster=cluster, services=arns).get("services", [])
            out = [{"service_name": s.get("serviceName"), "status": s.get("status"), "desired_count": s.get("desiredCount"), "running_count": s.get("runningCount"), "pending_count": s.get("pendingCount"), "task_definition": s.get("taskDefinition")} for s in data]
            return _text_result(req_id, out)

        if tool_name == "aws_eks_list_clusters":
            eks = _client("eks")
            names = eks.list_clusters().get("clusters", [])
            return _text_result(req_id, names)

        if tool_name == "aws_s3_list_buckets":
            s3 = _client("s3")
            data = s3.list_buckets().get("Buckets", [])
            return _text_result(req_id, [{"name": b.get("Name"), "creation_date": b.get("CreationDate")} for b in data])

        if tool_name == "aws_s3_get_public_access_block":
            s3c = _client("s3control")
            sts = _client("sts")
            account_id = sts.get_caller_identity().get("Account")
            data = s3c.get_public_access_block(AccountId=account_id)
            return _text_result(req_id, data.get("PublicAccessBlockConfiguration", {}))

        if tool_name == "aws_dynamodb_list_tables":
            ddb = _client("dynamodb")
            limit = int(args.get("limit", 100))
            data = ddb.list_tables(Limit=limit).get("TableNames", [])
            return _text_result(req_id, data)

        if tool_name == "aws_cloudwatch_recent_log_events":
            logs = _client("logs")
            group = str(args.get("log_group_name", ""))
            minutes = int(args.get("minutes", 30))
            limit = int(args.get("limit", 50))
            start = int((datetime.now(timezone.utc) - timedelta(minutes=minutes)).timestamp() * 1000)
            data = logs.filter_log_events(logGroupName=group, startTime=start, limit=limit).get("events", [])
            out = [{"timestamp": e.get("timestamp"), "message": e.get("message"), "stream": e.get("logStreamName")} for e in data]
            return _text_result(req_id, out)

        if tool_name == "aws_cloudtrail_lookup_events":
            ct = _client("cloudtrail")
            max_results = int(args.get("max_results", 20))
            attr_key = str(args.get("attribute_key", "")).strip()
            attr_val = str(args.get("attribute_value", "")).strip()
            kwargs: dict[str, Any] = {"MaxResults": max_results}
            if attr_key and attr_val:
                kwargs["LookupAttributes"] = [{"AttributeKey": attr_key, "AttributeValue": attr_val}]
            data = ct.lookup_events(**kwargs).get("Events", [])
            out = [{"event_time": e.get("EventTime"), "event_name": e.get("EventName"), "username": e.get("Username"), "resources": e.get("Resources")} for e in data]
            return _text_result(req_id, out)

        if tool_name == "aws_iam_get_role_summary":
            iam = _client("iam")
            role_name = str(args.get("role_name", ""))
            role = iam.get_role(RoleName=role_name).get("Role", {})
            attached = iam.list_attached_role_policies(RoleName=role_name).get("AttachedPolicies", [])
            inline = iam.list_role_policies(RoleName=role_name).get("PolicyNames", [])
            out = {"role_name": role.get("RoleName"), "arn": role.get("Arn"), "create_date": role.get("CreateDate"), "attached_policies": attached, "inline_policies": inline}
            return _text_result(req_id, out)

        if tool_name == "aws_secretsmanager_list_secrets":
            sm = _client("secretsmanager")
            max_results = int(args.get("max_results", 20))
            data = sm.list_secrets(MaxResults=max_results).get("SecretList", [])
            out = [{"name": s.get("Name"), "arn": s.get("ARN"), "last_changed_date": s.get("LastChangedDate"), "last_rotated_date": s.get("LastRotatedDate")} for s in data]
            return _text_result(req_id, out)

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (ClientError, BotoCoreError, ValueError) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"AWS error: {exc}"}]},
        )
