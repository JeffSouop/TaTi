# 配置（`.env`）

TaTi 全套基础设施（Postgres、应用、MCP 桥）由**环境变量**驱动。仓库 **`.env.example`** 为**权威来源**，逐行注释。复制为 **`.env`** 后按需修改。

::: danger 切勿提交 `.env`
Slack、GitHub、OpenMetadata、云密钥等必须**不入 Git**、不出现在截图中。
:::

## 基本原则

- **每键一行**：重复变量时**仅最后一行**生效（常见 `.env` 解析行为）。
- **Docker / 宿主一致**：应用的 `DATABASE_URL` 必须指向**正确主机**（Compose 内为 `postgres`，应用在宿主直连时为 `localhost`）。
- **`NODE_ENV`**：仓库 Compose 中一般为 `development`；生产镜像遵循项目 Dockerfile。

---

## PostgreSQL（应用数据）

| 变量                | 说明                                                          |
| ------------------- | ------------------------------------------------------------- |
| `POSTGRES_USER`     | 容器内创建的数据库用户。                                      |
| `POSTGRES_PASSWORD` | 密码 — 非开发环境务必更换。                                   |
| `POSTGRES_DB`       | TaTi 应用数据库名。                                           |
| `POSTGRES_PORT`     | 映射到宿主时的端口（避免公网暴露）。                          |
| `DATABASE_URL`      | SSR 使用的完整连接串（`postgres://user:pass@host:port/db`）。 |

---

## 应用认证

| 变量                    | 说明                                             |
| ----------------------- | ------------------------------------------------ |
| `TATI_AUTH_REQUIRED`    | `true` 则必须先登录再使用 UI（个人沙箱外建议）。 |
| `TATI_SESSION_TTL_DAYS` | 会话天数。                                       |

仓库 Compose 文件中也会注入上述变量，避免只读错 `.env`。

---

## GHCR 镜像（`docker-compose.dist.yml`）

| 变量                  | 说明                                          |
| --------------------- | --------------------------------------------- |
| `TATI_IMAGE_REGISTRY` | 镜像前缀（GitHub 用小写 `ghcr.io/<owner>`）。 |
| `TATI_IMAGE_TAG`      | 标签（semver 或 `latest`）。                  |
| `APP_PORT`            | 浏览器访问 UI 的端口。                        |

可选：部分 MCP 的挂载路径（如发行模式下的 filesystem）。

---

## OpenMetadata

| 变量                               | 说明                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `OPENMETADATA_URL`                 | MCP 容器**内**可访问的 OM API（OM 在宿主时常用 `host.docker.internal`）。 |
| `OPENMETADATA_JWT`                 | OM API 令牌。                                                             |
| `OPENMETADATA_ALLOW_MUTATIONS`     | 是否允许写入 OM。                                                         |
| `OPENMETADATA_WRITE_CONFIRM_TOKEN` | 敏感写操作确认值。                                                        |

---

## MCP Postgres（模型侧 SQL）

| 变量                        | 说明                                              |
| --------------------------- | ------------------------------------------------- |
| `MCP_POSTGRES_DATABASE_URL` | 桥接执行 SQL 的目标库（常与 TaTi 或业务库相同）。 |
| `MCP_POSTGRES_PORT`         | 桥上 HTTP 在宿主的端口。                          |
| `MCP_POSTGRES_READ_ONLY`    | `true` 限制为读（SELECT / introspection）。       |

---

## 消息与文件

Slack、Discord、PDF、Notion、filesystem：见 `.env.example` 中 `MCP_SLACK_*`、`MCP_DISCORD_*`、`MCP_PDF_*`、`MCP_NOTION_TOKEN`、`MCP_FILESYSTEM_*`。默认端口见 [MCP 连接器](./mcp.md)。

---

## 云与可观测性

`.env.example` 主要分组：

- **AWS** — `AWS_REGION`、凭证或 `AWS_PROFILE`。
- **Azure** — 服务主体或 `AZURE_ACCESS_TOKEN`。
- **GCP** — `GCP_PROJECT_ID`、服务账号 JSON。
- **SMTP** — `SMTP_*`、收件人白名单。
- **Dagster** — GraphQL URL、API 令牌、`DAGSTER_ALLOW_MUTATIONS`。
- **Apache Airflow** — `AIRFLOW_BASE_URL`、账号或 `AIRFLOW_API_TOKEN`、`AIRFLOW_ALLOW_MUTATIONS`、`AIRFLOW_SSL_VERIFY`。
- **dbt Cloud** — `DBT_CLOUD_DISCOVERY_URL`、`DBT_CLOUD_TOKEN`、`DBT_CLOUD_ENVIRONMENT_ID`、`DBT_SSL_VERIFY`。
- **dbt Core（CLI 桥）** — `DBT_CORE_HOST_PROJECT`、`DBT_CORE_PROJECT_DIR`、`DBT_PROFILES_DIR`、`DBT_CORE_TARGET`、`DBT_ALLOW_MUTATIONS`。
- **Elasticsearch** — 集群 URL、API 密钥或账号密码。
- **Grafana / Prometheus** — 监控栈 URL 与令牌。
- **Datadog** — Datadog MCP URL + API / 应用密钥（常在 TaTi UI 配头）。

---

## Git 托管

| 变量                                        | 说明                          |
| ------------------------------------------- | ----------------------------- |
| `MCP_GITHUB_TOKEN` / `MCP_GITLAB_TOKEN`     | 最小权限 API 访问。           |
| `MCP_GITLAB_URL`                            | GitLab 实例（云或自建）。     |
| `MCP_WRITE_CONFIRM_TOKEN`                   | 写操作可能要求的确认串。      |
| `MCP_GITHUB_MCP_URL` / `MCP_GITLAB_MCP_URL` | 若配置仍使用显式 URL 则可选。 |

---

## Google Workspace（远程 MCP）

| 变量                                                | 说明                   |
| --------------------------------------------------- | ---------------------- |
| `MCP_GMAIL_MCP_URL` / `MCP_GOOGLE_CALENDAR_MCP_URL` | 官方 Google MCP 端点。 |
| `GOOGLE_CLOUD_PROJECT_ID`                           | 启用 API 的 GCP 项目。 |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET`                 | OAuth 客户端。         |
| `GOOGLE_OAUTH_ACCESS_TOKEN`                         | 测试或基于头的集成。   |

---

## Moodle

`MCP_MOODLE_MCP_URL` 与 `MCP_MOODLE_TOKEN` — 插件端点 URL 与 Moodle 外部服务令牌。

---

## 卡住时

1. 将 `.env` 与**同一镜像标签**的 `.env.example` 比对。
2. 查看 MCP 日志：`docker compose logs mcp-<名称>`。
3. 重读 [MCP 连接器](./mcp.md) 对应小节。
