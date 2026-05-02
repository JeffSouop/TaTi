# MCP connectors (reference) {#mcp-top}

TaTi does not embed all integration logic in the web binary: each domain (Slack, cloud, database…) is served by an **MCP bridge** — a small HTTP service compatible with the **Model Context Protocol**. Run them with Docker Compose (or manually), then register their **URL** in the UI: **Settings → MCP servers** (repo presets follow service names and `/mcp` paths). The UI **preset grid** is shown in [Introduction — New MCP server](./introduction.md#interface-presets-mcp).

::: tip Reminder
The **ports** below are **default host ports** from `.env.example`. You can change them: keep `.env`, `docker compose`, and the URL saved in TaTi consistent (e.g. if you change `MCP_SLACK_PORT`, `http://localhost:…/mcp` changes too).
:::

## Summary table

| Connector               | Host port (default)  | Typical URL (Compose network)       | Key variables                                         |
| ----------------------- | -------------------- | ----------------------------------- | ----------------------------------------------------- |
| OpenMetadata            | 8001                 | `http://mcp-openmetadata:8001/mcp`  | `OPENMETADATA_URL`, `OPENMETADATA_JWT`                |
| PostgreSQL              | 8002                 | `http://mcp-postgres:8002/mcp`      | `MCP_POSTGRES_DATABASE_URL`, `MCP_POSTGRES_READ_ONLY` |
| PDF                     | 8003                 | `http://mcp-pdf:8003/mcp`           | `MCP_PDF_PUBLIC_BASE_URL`                             |
| Notion                  | 8004                 | `http://mcp-notion:8004/mcp`        | `MCP_NOTION_TOKEN`                                    |
| GitHub                  | 8007                 | `http://mcp-github:8007/mcp`        | `MCP_GITHUB_TOKEN`                                    |
| GitLab                  | 8008                 | `http://mcp-gitlab:8008/mcp`        | `MCP_GITLAB_TOKEN`, `MCP_GITLAB_URL`                  |
| Elasticsearch           | 8009 → 8080 internal | `http://mcp-elasticsearch:8080/mcp` | `MCP_ELASTICSEARCH_*`                                 |
| Discord                 | 8010                 | `http://mcp-discord:8010/mcp`       | `MCP_DISCORD_*`                                       |
| Filesystem              | 8011                 | `http://mcp-filesystem:8011/mcp`    | `MCP_FILESYSTEM_ROOT`                                 |
| AWS                     | 8012                 | `http://mcp-aws:8012/mcp`           | `AWS_*`                                               |
| Azure                   | 8013                 | `http://mcp-azure:8013/mcp`         | `AZURE_*`                                             |
| GCP                     | 8014                 | `http://mcp-gcp:8014/mcp`           | `GCP_*`                                               |
| Email SMTP              | 8015                 | `http://mcp-email:8015/mcp`         | `SMTP_*`                                              |
| Dagster                 | 8016                 | `http://mcp-dagster:8016/mcp`       | `DAGSTER_GRAPHQL_URL`, `DAGSTER_API_TOKEN`            |
| Slack                   | 8006                 | `http://mcp-slack:8006/mcp`         | `MCP_SLACK_*`                                         |
| Grafana                 | 8020                 | `http://mcp-grafana:8020/mcp`       | `MCP_GRAFANA_*`                                       |
| Prometheus              | 8021                 | `http://mcp-prometheus:8021/mcp`    | `MCP_PROMETHEUS_*`                                    |
| Datadog                 | — (HTTPS)            | See Datadog section                 | `MCP_DATADOG_*` + headers                             |
| Google Gmail / Calendar | — (HTTPS)            | Google MCP endpoints                | `GOOGLE_*`, OAuth                                     |
| Moodle                  | — (HTTPS)            | Moodle plugin URL                   | `MCP_MOODLE_*`                                        |

The sections below cover **role**, **typical use**, **what the bridge usually exposes**, **configuration**, and **pitfalls**.

---

## MCP OpenMetadata {#mcp-openmetadata}

**Role**: MCP tools to query (and optionally change) metadata in **OpenMetadata** — tables, columns, glossaries, tags, lineage, business properties.

**Typical use**: “Which table feeds this report?”, “Who owns this dataset?”, “Show lineage around _customers_.”

**Setup**: Compose service `mcp-openmetadata`, port **8001**. URL in TaTi: `http://mcp-openmetadata:8001/mcp`. Vars: `OPENMETADATA_URL`, `OPENMETADATA_JWT`, optional `OPENMETADATA_ALLOW_MUTATIONS`, `OPENMETADATA_WRITE_CONFIRM_TOKEN`.

::: warning
Catalog mutations are sensitive: keep `OPENMETADATA_ALLOW_MUTATIONS=false` until flows are validated.
:::

---

## MCP PostgreSQL {#mcp-postgresql}

**Role**: Run **SQL** against Postgres (often a business DB — may be the same instance as TaTi; scope carefully).

**Typical use**: schema exploration, read-only analytics (`SELECT`), avoid dumping copies manually.

**Setup**: Port **8002**, URL `http://mcp-postgres:8002/mcp`. Vars: `MCP_POSTGRES_DATABASE_URL`, `MCP_POSTGRES_READ_ONLY` (`true` recommended for discovery).

::: tip
Even read-only `SELECT` can load the DB — isolate networks and define SQL policy.
:::

---

## MCP PDF {#mcp-pdf}

**Role**: **Generate PDFs** and return **download URLs**.

**Setup**: Port **8003**, `MCP_PDF_PUBLIC_BASE_URL` must be reachable by browsers following links.

---

## MCP Notion {#mcp-notion}

**Role**: Access **Notion** databases and pages via integration token permissions.

**Setup**: Port **8004**, `MCP_NOTION_TOKEN`.

---

## MCP Slack {#mcp-slack}

**Role**: Read history (per scopes) and **post** via a bot; optionally restrict channels.

**Setup**: Port **8006**. Vars: `MCP_SLACK_BOT_TOKEN`, `MCP_SLACK_TEAM_ID`, `MCP_SLACK_CHANNEL_IDS` (recommended to limit channels).

---

## MCP Discord {#mcp-discord}

**Role**: Discord equivalent of the Slack bridge — guild channels and bot permissions.

**Setup**: Port **8010**, `MCP_DISCORD_BOT_TOKEN`, `MCP_DISCORD_GUILD_ID`, `MCP_DISCORD_CHANNEL_IDS`.

---

## MCP Filesystem {#mcp-filesystem}

**Role**: List/read (and sometimes write) files under a **single root** (`FILESYSTEM_ROOT`).

**Setup**: Port **8011**, `MCP_FILESYSTEM_ROOT`. In production use a dedicated volume and strict permissions.

---

## MCP GitHub {#mcp-github}

**Role**: Automate GitHub workflows — issues, PRs, CI context.

**Setup**: Port **8007**, `MCP_GITHUB_TOKEN`, `MCP_WRITE_CONFIRM_TOKEN` for guarded writes.

---

## MCP GitLab {#mcp-gitlab}

**Role**: Projects, issues, merge requests — SaaS or self-hosted GitLab.

**Setup**: Port **8008**, `MCP_GITLAB_TOKEN`, `MCP_GITLAB_URL`.

---

## MCP Elasticsearch {#mcp-elasticsearch}

**Role**: Full-text search and index operations — depends on MCP image and stack version.

**Setup**: Host **8009** mapped to **8080** in container — URL `http://mcp-elasticsearch:8080/mcp`. Vars: `MCP_ELASTICSEARCH_URL`, credentials, optional `MCP_ELASTICSEARCH_SSL_SKIP_VERIFY`.

---

## MCP AWS {#mcp-aws}

**Role**: AWS APIs — often **read-only** inventory; mutations are high-risk.

**Setup**: Port **8012**, `AWS_REGION`, `AWS_PROFILE` or static keys / session token.

---

## MCP Azure {#mcp-azure}

**Role**: Azure resources via ARM or APIs exposed by the bridge.

**Setup**: Port **8013**, Service Principal or `AZURE_ACCESS_TOKEN`. Prefer **Reader** for exploration.

---

## MCP GCP {#mcp-gcp}

**Role**: GCP project resources — Compute, GKE, storage, IAM reads per service account.

**Setup**: Port **8014**, `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_SERVICE_ACCOUNT_JSON` (never commit).

---

## MCP Email (SMTP) {#mcp-email}

**Role**: Send mail via SMTP — no IMAP inbox in scope.

**Setup**: Port **8015**, `SMTP_*`, **`SMTP_ALLOWED_RECIPIENTS`** to prevent misuse.

---

## MCP Dagster {#mcp-dagster}

**Role**: Dagster via **GraphQL** — assets, jobs, runs, partitions.

**Setup**: Port **8016**, `DAGSTER_GRAPHQL_URL`, `DAGSTER_API_TOKEN`, `DAGSTER_ALLOW_MUTATIONS`.

---

## MCP Grafana {#mcp-grafana}

**Role**: Official Grafana MCP — dashboards, folders, alerts.

**Setup**: Port **8020**, `MCP_GRAFANA_URL`, `MCP_GRAFANA_SERVICE_ACCOUNT_TOKEN`, optional org ID.

---

## MCP Prometheus {#mcp-prometheus}

**Role**: PromQL queries, targets, series metadata.

**Setup**: Port **8021**, `MCP_PROMETHEUS_URL`, optional auth, `MCP_PROMETHEUS_SSL_VERIFY`.

---

## MCP Datadog {#mcp-datadog}

**Role**: **Hosted Datadog MCP** (not a default Compose container) — APM, logs, metrics per product.

**Setup**: `MCP_DATADOG_MCP_URL` (US/EU). Keys often passed as **headers** in TaTi (`DD_API_KEY`, `DD_APPLICATION_KEY`).

---

## Google Gmail & Calendar (remote MCP) {#mcp-google}

**Role**: Gmail and Calendar via **Google-hosted** MCP endpoints.

**Setup**: `MCP_GMAIL_MCP_URL`, `MCP_GOOGLE_CALENDAR_MCP_URL`, `GOOGLE_CLOUD_PROJECT_ID`, OAuth vars. Configure **headers** in TaTi if required.

---

## MCP Moodle {#mcp-moodle}

**Role**: Moodle plugin MCP endpoint for courses and activities.

**Setup**: `MCP_MOODLE_MCP_URL`, `MCP_MOODLE_TOKEN` — least-privilege token.

---

## Deprecations and alternatives

- **Elasticsearch MCP image**: `.env.example` may note Elastic-side evolution — watch release notes for recommended endpoints.

## See also

- [Architecture](./architecture.md) — UI, API, and MCP flows.
- [Configuration](./configuration.md) — full variable list.
- [Security](./security.md) — tokens, read-only, networking.
