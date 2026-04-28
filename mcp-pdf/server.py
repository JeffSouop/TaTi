import os
import re
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

app = FastAPI(title="MCP PDF Bridge", version="0.1.0")

SESSION_ID = secrets.token_hex(16)
OUTPUT_DIR = Path(os.getenv("PDF_OUTPUT_DIR", "/app/output")).resolve()
PUBLIC_BASE_URL = os.getenv("PDF_PUBLIC_BASE_URL", "http://localhost:8003").rstrip("/")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _jsonrpc_error(req_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": code, "message": message}}


def _safe_name(name: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_-]+", "-", name.strip()).strip("-").lower()
    return base or "document"


def _draw_wrapped_lines(c: canvas.Canvas, text: str, x: float, y: float, max_width: float, line_height: float) -> float:
    words = text.split()
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if pdfmetrics.stringWidth(test, "Helvetica", 11) <= max_width:
            line = test
            continue
        c.drawString(x, y, line)
        y -= line_height
        line = word
    if line:
        c.drawString(x, y, line)
        y -= line_height
    return y


def generate_pdf(title: str, content: str, filename: str | None = None) -> dict[str, Any]:
    now = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    safe = _safe_name(filename or title)
    out_name = f"{safe}-{now}.pdf"
    out_path = OUTPUT_DIR / out_name

    c = canvas.Canvas(str(out_path), pagesize=A4)
    width, height = A4
    margin = 2 * cm
    max_width = width - 2 * margin
    y = height - margin

    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin, y, title or "Document")
    y -= 1.2 * cm

    c.setFont("Helvetica", 11)
    for para in (content or "").splitlines():
        if y < margin:
            c.showPage()
            y = height - margin
            c.setFont("Helvetica", 11)
        if not para.strip():
            y -= 0.6 * cm
            continue
        y = _draw_wrapped_lines(c, para, margin, y, max_width, 0.55 * cm)

    c.showPage()
    c.save()

    stat = out_path.stat()
    return {
        "filename": out_name,
        "path": str(out_path),
        "download_url": f"{PUBLIC_BASE_URL}/files/{out_name}",
        "size_bytes": stat.st_size,
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/files/{filename}")
def get_file(filename: str) -> FileResponse:
    f = OUTPUT_DIR / filename
    if not f.exists() or not f.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=f, media_type="application/pdf", filename=filename)


@app.post("/mcp")
async def mcp_endpoint(request: Request) -> dict[str, Any]:
    payload = await request.json()
    method = payload.get("method")
    req_id = payload.get("id")
    params = payload.get("params") or {}

    if method == "notifications/initialized":
        return {"jsonrpc": "2.0", "result": {}}

    if method == "initialize":
        return _jsonrpc_result(
            req_id,
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "mcp-pdf", "version": "0.1.0"},
            },
        )

    if method == "tools/list":
        return _jsonrpc_result(
            req_id,
            {
                "tools": [
                    {
                        "name": "generate_pdf",
                        "description": "Generate a PDF file from title and text content",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "content": {"type": "string"},
                                "filename": {"type": "string"},
                            },
                            "required": ["title", "content"],
                            "additionalProperties": False,
                        },
                    }
                ]
            },
        )

    if method == "tools/call":
        name = params.get("name")
        args = params.get("arguments") or {}
        if name != "generate_pdf":
            return _jsonrpc_error(req_id, -32602, f"Unsupported tool: {name}")
        title = str(args.get("title", "")).strip()
        content = str(args.get("content", "")).strip()
        filename = str(args.get("filename", "")).strip() or None
        if not title or not content:
            return _jsonrpc_error(req_id, -32602, "title and content are required")
        info = generate_pdf(title=title, content=content, filename=filename)
        return _jsonrpc_result(req_id, {"content": [{"type": "text", "text": str(info)}]})

    return _jsonrpc_error(req_id, -32601, f"Method not found: {method}")
