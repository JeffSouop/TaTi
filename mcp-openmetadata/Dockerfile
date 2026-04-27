# Dockerfile pour le pont MCP -> OpenMetadata.
# Construit l'image attendue par le service `mcp-openmetadata` du compose.
# Le code Python (server.py + requirements.txt) doit vivre dans ce dossier.
FROM python:3.12-slim

WORKDIR /app

# Dépendances Python (à adapter selon ton requirements.txt)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
