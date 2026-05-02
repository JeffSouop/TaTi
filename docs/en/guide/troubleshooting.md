# Troubleshooting

Common symptoms on first deploy or after an update — **ordered** checks to save time.

## App down or 502

1. `docker compose ps` — is `app` **Up**?
2. `docker compose logs app --tail 200` — **`DATABASE_URL`** or migration error?
3. From the host, is Postgres reachable at the host/port in `DATABASE_URL`?

## “Connection refused” to an MCP

1. Service exists: `docker compose ps | grep mcp`.
2. Port in `.env` matches Compose mapping (`MCP_*_PORT`).
3. URL in TaTi uses the **correct DNS name**:
   - from `app` container: `http://mcp-postgres:8002/mcp`;
   - from your browser for a manual test: `http://localhost:8002/mcp` (often POST-only — GET may return 405, which is OK).

## `.env` changes seem ignored

- Look for **duplicates**: two `TATI_AUTH_REQUIRED` lines → last wins.
- After editing `.env`, restart: `docker compose up -d --force-recreate`.
- Edit the `.env` **next to** the `docker-compose.yml` you actually run.

## OpenMetadata or Dagster “unreachable”

URLs often use `host.docker.internal`, which only works if:

- you are on Docker Desktop (Mac/Windows) or a stack that resolves that hostname;
- the target service listens on the expected interface.

On plain Linux, replace with the host IP or Docker `extra_hosts`.

## Elasticsearch MCP won’t start

Check `MCP_ELASTICSEARCH_URL` and credentials; the image may refuse to start without a reachable cluster. See `docker compose logs mcp-elasticsearch`.

## Slack / GitHub “unauthorized”

- Token expired or revoked — regenerate in the vendor console.
- Insufficient scopes — increase **minimally** what you need.

## CI “Docs”: `deploy-pages` fails (404 Not Found)

After merging to `main`, **deploy** may fail with `Creating Pages deployment failed` / `HttpError: Not Found`, often _Ensure GitHub Pages has been enabled_.

Do **once** on the repo (**Admin**):

1. **Settings** → **Pages** (`https://github.com/<org>/<repo>/settings/pages`).
2. Under **Build and deployment**, **Source**: choose **GitHub Actions** (not “Deploy from a branch”).
3. Save, then re-run the **Docs** workflow manually if needed.

Without this, the artifact builds but the Pages API returns 404.

## Community help

- [GitHub Issues](https://github.com/JeffSouop/TaTi/issues) — include version / image tag, log excerpts **without secrets**.
- [Actions CI](https://github.com/JeffSouop/TaTi/actions) — check if the issue is already handled on `main`.
