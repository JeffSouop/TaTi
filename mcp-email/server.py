import os
import secrets
import smtplib
from email.message import EmailMessage
from typing import Any

from fastapi import FastAPI, Request

app = FastAPI(title="MCP Email Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() != "false"
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
ALLOWED_RECIPIENTS = {r.strip().lower() for r in os.getenv("SMTP_ALLOWED_RECIPIENTS", "").split(",") if r.strip()}


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _guard_recipients(recipients: list[str]) -> None:
    if not ALLOWED_RECIPIENTS:
        return
    for recipient in recipients:
        if recipient.lower() not in ALLOWED_RECIPIENTS:
            raise ValueError(f"Recipient {recipient} is not allowed by SMTP_ALLOWED_RECIPIENTS")


def _send_email(to: list[str], subject: str, text: str, html: str | None = None) -> dict[str, Any]:
    msg = EmailMessage()
    msg["From"] = SMTP_FROM_EMAIL
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.set_content(text or "")
    if html:
        msg.add_alternative(html, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
        smtp.ehlo()
        if SMTP_USE_TLS:
            smtp.starttls()
            smtp.ehlo()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(msg)
    return {"ok": True, "to": to, "subject": subject}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "configured": bool(SMTP_HOST and SMTP_FROM_EMAIL),
        "smtp_host": SMTP_HOST or None,
        "smtp_port": SMTP_PORT,
        "tls": SMTP_USE_TLS,
        "restricted_recipients": sorted(ALLOWED_RECIPIENTS),
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
                "serverInfo": {"name": "mcp-email-local", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "email_send_report",
                        "description": "Send an email report via SMTP",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "to": {"type": "array", "items": {"type": "string"}},
                                "subject": {"type": "string"},
                                "text": {"type": "string"},
                                "html": {"type": "string"},
                            },
                            "required": ["to", "subject", "text"],
                            "additionalProperties": False,
                        },
                    }
                ]
            },
        )

    if method != "tools/call":
        return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")

    if not SMTP_HOST or not SMTP_FROM_EMAIL:
        return _jsonrpc_result(
            req_id,
            {
                "isError": True,
                "content": [
                    {
                        "type": "text",
                        "text": "Email non configure: renseigne SMTP_HOST et SMTP_FROM_EMAIL dans .env",
                    }
                ],
            },
        )

    tool_name = params.get("name")
    args = params.get("arguments") or {}

    try:
        if tool_name == "email_send_report":
            to = args.get("to") or []
            if not isinstance(to, list) or not to:
                return _jsonrpc_error(req_id, -32602, "to must be a non-empty array")
            recipients = [str(x).strip() for x in to if str(x).strip()]
            if not recipients:
                return _jsonrpc_error(req_id, -32602, "to must contain valid addresses")
            _guard_recipients(recipients)
            result = _send_email(
                to=recipients,
                subject=str(args.get("subject", "")),
                text=str(args.get("text", "")),
                html=str(args.get("html", "")) if args.get("html") is not None else None,
            )
            return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(result)}]})

        return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {tool_name}")
    except (ValueError, smtplib.SMTPException) as exc:
        return _jsonrpc_result(
            req_id,
            {"isError": True, "content": [{"type": "text", "text": f"Email error: {exc}"}]},
        )
