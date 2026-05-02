# Configuration (`.env`)

All TaTi infrastructure (Postgres, app, MCP bridges) is driven by **environment variables**. The repo’s **`.env.example`** is the **source of truth**: it is commented line by line. Copy it to **`.env`** and customize.

::: danger Never commit `.env`
Slack, GitHub, OpenMetadata, cloud keys, etc. must stay **out of Git** and screenshots.
:::

## Basics

- **One line per key**: if you duplicate a variable, **only the last** wins (standard `.env` parsers).
- **Docker / host consistency**: `DATABASE_URL` for the app must point to the **correct host** (`postgres` in Compose, `localhost` if the app runs on the host outside Compose).
- **`NODE_ENV`**: usually `development` in the repo Compose; production images follow the project Dockerfile.

---

## PostgreSQL (app data)

| Variable            | Description                                                                   |
| ------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_USER`     | User created in the Postgres container.                                       |
| `POSTGRES_PASSWORD` | Password — change outside dev.                                                |
| `POSTGRES_DB`       | TaTi application database name.                                               |
| `POSTGRES_PORT`     | Port **exposed on the host** if you map Postgres (avoid public exposure).     |
| `DATABASE_URL`      | Full string consumed by the SSR server (`postgres://user:pass@host:port/db`). |

---

## Application auth

| Variable                | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| `TATI_AUTH_REQUIRED`    | `true` to require login before the UI (recommended outside a personal sandbox). |
| `TATI_SESSION_TTL_DAYS` | Session lifetime in days.                                                       |

These are also passed to the `app` service in Compose files to avoid drift from a misread `.env`.

---

## GHCR images (`docker-compose.dist.yml` mode)

| Variable              | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `TATI_IMAGE_REGISTRY` | Image prefix (`ghcr.io/<owner>` lower-case for GitHub). |
| `TATI_IMAGE_TAG`      | Image tag (semver release or `latest`).                 |
| `APP_PORT`            | Port where you reach the UI.                            |

Optional: mounted paths for some MCPs (e.g. filesystem in dist mode).

---

## OpenMetadata

| Variable                           | Description                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `OPENMETADATA_URL`                 | OpenMetadata API URL reachable **from** the MCP container (`host.docker.internal` on Docker Desktop if OM runs on the host). |
| `OPENMETADATA_JWT`                 | OM API token.                                                                                                                |
| `OPENMETADATA_ALLOW_MUTATIONS`     | Allow writes to OM or not.                                                                                                   |
| `OPENMETADATA_WRITE_CONFIRM_TOKEN` | Expected value to confirm sensitive write tools.                                                                             |

---

## MCP Postgres (SQL for the model)

| Variable                    | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `MCP_POSTGRES_DATABASE_URL` | Database the bridge runs SQL against (often same as TaTi or a business DB). |
| `MCP_POSTGRES_PORT`         | Bridge HTTP port on the host.                                               |
| `MCP_POSTGRES_READ_ONLY`    | `true` to restrict to reads (SELECT / introspection).                       |

---

## Messaging & files

Slack, Discord, PDF, Notion, filesystem: see `MCP_SLACK_*`, `MCP_DISCORD_*`, `MCP_PDF_*`, `MCP_NOTION_TOKEN`, `MCP_FILESYSTEM_*` in `.env.example`. Default ports are listed in [MCP connectors](./mcp.md).

---

## Cloud & observability

Main groups in `.env.example`:

- **AWS** — `AWS_REGION`, credentials or `AWS_PROFILE`.
- **Azure** — Service Principal or `AZURE_ACCESS_TOKEN`.
- **GCP** — `GCP_PROJECT_ID`, service account JSON.
- **Email SMTP** — `SMTP_*`, allowlisted recipients.
- **Dagster** — Dagster GraphQL URL, API token, `DAGSTER_ALLOW_MUTATIONS`.
- **Apache Airflow** — `AIRFLOW_BASE_URL`, credentials or `AIRFLOW_API_TOKEN`, `AIRFLOW_ALLOW_MUTATIONS`, `AIRFLOW_SSL_VERIFY`.
- **dbt Cloud** — `DBT_CLOUD_DISCOVERY_URL`, `DBT_CLOUD_TOKEN`, `DBT_CLOUD_ENVIRONMENT_ID`, `DBT_SSL_VERIFY`.
- **dbt Core (CLI bridge)** — `DBT_CORE_HOST_PROJECT`, `DBT_CORE_PROJECT_DIR`, `DBT_PROFILES_DIR`, `DBT_CORE_TARGET`, `DBT_ALLOW_MUTATIONS`.
- **Elasticsearch** — cluster URL, API key or login/password.
- **Grafana / Prometheus** — monitoring stack URL + tokens if needed.
- **Datadog** — Datadog MCP URL + API / application keys (often as headers in TaTi UI).

---

## Git forge

| Variable                                    | Description                                              |
| ------------------------------------------- | -------------------------------------------------------- |
| `MCP_GITHUB_TOKEN` / `MCP_GITLAB_TOKEN`     | API access with minimal scope.                           |
| `MCP_GITLAB_URL`                            | GitLab instance (cloud or self-hosted).                  |
| `MCP_WRITE_CONFIRM_TOKEN`                   | String write tools may require to prevent accidents.     |
| `MCP_GITHUB_MCP_URL` / `MCP_GITLAB_MCP_URL` | Optional if your setup still references an explicit URL. |

---

## Google Workspace (remote MCP)

| Variable                                            | Description                                    |
| --------------------------------------------------- | ---------------------------------------------- |
| `MCP_GMAIL_MCP_URL` / `MCP_GOOGLE_CALENDAR_MCP_URL` | Official Google MCP endpoints.                 |
| `GOOGLE_CLOUD_PROJECT_ID`                           | GCP project where APIs are enabled.            |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET`                 | OAuth flow for tooling.                        |
| `GOOGLE_OAUTH_ACCESS_TOKEN`                         | Bearer for tests or header-based integrations. |

---

## Moodle

`MCP_MOODLE_MCP_URL` and `MCP_MOODLE_TOKEN` — plugin endpoint URL and Moodle external service token.

---

## When you’re stuck

1. Compare your `.env` with `.env.example` from the **same release tag** as your images.
2. Check MCP logs: `docker compose logs mcp-<name>`.
3. Re-read the dedicated section in [MCP connectors](./mcp.md).
