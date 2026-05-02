# Quick start

This guide gets **TaTi + Postgres + MCP bridges** running with **Docker Compose**. Two common setups:

1. **Without cloning** — download only `docker-compose.dist.yml` + `.env.example` (pre-built GHCR images).
2. **With a cloned repo** — use the development `docker-compose.yml` (local app build, hot reload).

## Prerequisites

- **Docker** and **Docker Compose v2** installed.
- At least **4 GB RAM** free if you run several MCPs at once (Elasticsearch, Grafana… use more).

## Option A — “Dist” bundle (no clone)

Best for quickly testing a published release from the GitHub registry (`ghcr.io`).

```bash
mkdir tati && cd tati
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/JeffSouop/TaTi/main/docker-compose.dist.yml
curl -fsSL -o .env.example https://raw.githubusercontent.com/JeffSouop/TaTi/main/.env.example
cp .env.example .env
```

### Minimum edits in `.env`

| Variable                                 | Why                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                      | Secure the DB; must match `DATABASE_URL`.                            |
| `TATI_IMAGE_REGISTRY` / `TATI_IMAGE_TAG` | Point to published images (`ghcr.io/<owner>/…`, release tag).      |
| `APP_PORT`                               | Port where you reach the UI in the browser.                         |

Then enable the MCPs you have tokens for (Slack, GitHub, etc.) — without tokens, some containers may restart or stay unusable.

```bash
docker compose pull
docker compose up -d
```

Open `http://localhost:${APP_PORT:-3000}` (or your `APP_PORT`). After sign-in you land on the app home — see a **visual overview** in [Introduction — UI overview](./introduction.md#interface-apercu).

---

## Option B — Development from a cloned repo

Best for contributing or debugging.

```bash
git clone https://github.com/JeffSouop/TaTi.git
cd TaTi
cp .env.example .env
# Edit .env — at minimum DATABASE_URL consistent with Compose Postgres
```

Install JS dependencies on the host if you also run Vite outside Docker:

```bash
npm install
```

Start the Compose stack:

```bash
docker compose up -d
```

- **`docker-compose.yml`** maps the app to **`5173:8080`**: open **`http://localhost:5173`** for the containerized dev UI (`bun run dev` in the `app` service).
- MCP services listen on ports from `.env` (`MCP_*_PORT`).

To stop:

```bash
docker compose down
```

(`docker compose down -v` also removes the Postgres volume — **data loss**.)

---

## Quick checks

1. **Postgres**: `docker compose ps` → `postgres` service **healthy**.
2. **App**: `docker compose logs -f app` → no DB connection errors.
3. **One MCP**: from the host, `curl -sS -o /dev/null -w "%{http_code}" http://localhost:8002/mcp` (Postgres MCP) — you may get an expected POST/method error, but not **connection refused**.

---

## Next steps

- Harder deployment: [Deployment](./deployment.md).
- Every variable: [Configuration](./configuration.md).
- Wire up tools: [MCP connectors](./mcp.md).
