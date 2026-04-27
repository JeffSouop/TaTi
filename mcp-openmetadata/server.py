"""
Serveur placeholder MCP -> OpenMetadata.

Ce fichier permet au conteneur de démarrer même si le pont métier
OpenMetadata n'est pas encore implémenté.
"""

from fastapi import FastAPI, HTTPException


app = FastAPI(title="MCP OpenMetadata Bridge", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/mcp")
def mcp_placeholder() -> dict[str, str]:
    raise HTTPException(
        status_code=501,
        detail=(
            "Le serveur MCP OpenMetadata n'est pas encore implemente. "
            "Remplace mcp-openmetadata/server.py avec ton implementation."
        ),
    )
