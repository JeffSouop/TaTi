# MCP 连接器（参考）{#mcp-top}

TaTi 并不把所有集成逻辑塞进 Web 二进制：每个领域（Slack、云、数据库…）由 **MCP 桥**提供服务 —— 兼容 **Model Context Protocol** 的小型 HTTP 服务。用 Docker Compose（或手动）运行后，在界面 **设置 → MCP 服务器** 注册 **URL**（仓库预设对应服务名与 `/mcp` 路径）。界面 **预设网格**见 [简介 — 新建 MCP 服务器](./introduction.md#interface-presets-mcp)。

::: tip 提示
下表**端口**为 `.env.example` 默认**主机端口**，可修改：请保持 `.env`、`docker compose` 与 TaTi 中保存的 URL 一致（例如修改 `MCP_SLACK_PORT` 后，`http://localhost:…/mcp` 也会变）。
:::

## 汇总表

| 连接器            | 主机端口（默认） | 典型 URL（Compose 网络）            | 关键变量                                                    |
| ----------------- | ---------------- | ----------------------------------- | ----------------------------------------------------------- |
| OpenMetadata      | 8001             | `http://mcp-openmetadata:8001/mcp`  | `OPENMETADATA_URL`, `OPENMETADATA_JWT`                      |
| PostgreSQL        | 8002             | `http://mcp-postgres:8002/mcp`      | `MCP_POSTGRES_DATABASE_URL`, `MCP_POSTGRES_READ_ONLY`       |
| PDF               | 8003             | `http://mcp-pdf:8003/mcp`           | `MCP_PDF_PUBLIC_BASE_URL`                                   |
| Notion            | 8004             | `http://mcp-notion:8004/mcp`        | `MCP_NOTION_TOKEN`                                          |
| GitHub            | 8007             | `http://mcp-github:8007/mcp`        | `MCP_GITHUB_TOKEN`                                          |
| GitLab            | 8008             | `http://mcp-gitlab:8008/mcp`        | `MCP_GITLAB_TOKEN`, `MCP_GITLAB_URL`                        |
| Elasticsearch     | 8009→容器 8080   | `http://mcp-elasticsearch:8080/mcp` | `MCP_ELASTICSEARCH_*`                                       |
| Discord           | 8010             | `http://mcp-discord:8010/mcp`       | `MCP_DISCORD_*`                                             |
| Filesystem        | 8011             | `http://mcp-filesystem:8011/mcp`    | `MCP_FILESYSTEM_ROOT`                                       |
| AWS               | 8012             | `http://mcp-aws:8012/mcp`           | `AWS_*`                                                     |
| Azure             | 8013             | `http://mcp-azure:8013/mcp`         | `AZURE_*`                                                   |
| GCP               | 8014             | `http://mcp-gcp:8014/mcp`           | `GCP_*`                                                     |
| Email SMTP        | 8015             | `http://mcp-email:8015/mcp`         | `SMTP_*`                                                    |
| Dagster           | 8016             | `http://mcp-dagster:8016/mcp`       | `DAGSTER_GRAPHQL_URL`, `DAGSTER_API_TOKEN`                  |
| Apache Airflow    | 8017             | `http://mcp-airflow:8017/mcp`       | `AIRFLOW_BASE_URL`、`AIRFLOW_USERNAME` / `AIRFLOW_PASSWORD` |
| Slack             | 8006             | `http://mcp-slack:8006/mcp`         | `MCP_SLACK_*`                                               |
| Grafana           | 8020             | `http://mcp-grafana:8020/mcp`       | `MCP_GRAFANA_*`                                             |
| Prometheus        | 8021             | `http://mcp-prometheus:8021/mcp`    | `MCP_PROMETHEUS_*`                                          |
| Datadog           | —（HTTPS）       | 见 Datadog 小节                     | `MCP_DATADOG_*` + 头字段                                    |
| Google Gmail/日历 | —（HTTPS）       | Google MCP 端点                     | `GOOGLE_*`, OAuth                                           |
| Moodle            | —（HTTPS）       | Moodle 插件 URL                     | `MCP_MOODLE_*`                                              |

下文按 **角色**、**典型用途**、**桥接通常暴露的能力**、**配置** 与 **常见坑** 说明。

---

## MCP OpenMetadata {#mcp-openmetadata}

**角色**：查询（并可选择性修改）**OpenMetadata** 元数据的 MCP 工具 —— 表、列、词汇表、标签、血缘、业务属性。

**典型用途**：「哪张表支撑该报表？」「数据集负责人是谁？」「展示 _customers_ 周围血缘。」

**配置**：Compose 服务 `mcp-openmetadata`，端口 **8001**。TaTi 中 URL：`http://mcp-openmetadata:8001/mcp`。变量：`OPENMETADATA_URL`、`OPENMETADATA_JWT`，可选 `OPENMETADATA_ALLOW_MUTATIONS`、`OPENMETADATA_WRITE_CONFIRM_TOKEN`。

::: warning
目录写入敏感：在流程验证前保持 `OPENMETADATA_ALLOW_MUTATIONS=false`。
:::

---

## MCP PostgreSQL {#mcp-postgresql}

**角色**：对 Postgres 执行 **SQL**（常与 TaTi 或业务库同实例，注意边界）。

**典型用途**：探查 schema、只读分析（`SELECT`），避免手工拷贝导出。

**配置**：端口 **8002**，URL `http://mcp-postgres:8002/mcp`。变量：`MCP_POSTGRES_DATABASE_URL`、`MCP_POSTGRES_READ_ONLY`（探索环境建议 `true`）。

---

## MCP PDF {#mcp-pdf}

**角色**：**生成 PDF** 并返回可下载 **URL**。

**配置**：端口 **8003**，`MCP_PDF_PUBLIC_BASE_URL` 须对跟随链接的浏览器可达。

---

## MCP Notion {#mcp-notion}

**角色**：通过集成令牌权限访问 **Notion** 数据库与页面。

**配置**：端口 **8004**，`MCP_NOTION_TOKEN`。

---

## MCP Slack {#mcp-slack}

**角色**：按 scope 读取历史并**发帖**；可限制频道。

**配置**：端口 **8006**。变量：`MCP_SLACK_BOT_TOKEN`、`MCP_SLACK_TEAM_ID`、`MCP_SLACK_CHANNEL_IDS`（建议限制频道）。

---

## MCP Discord {#mcp-discord}

**角色**：Discord 侧与 Slack 桥类似 —— 公会频道与机器人权限。

**配置**：端口 **8010**，`MCP_DISCORD_BOT_TOKEN`、`MCP_DISCORD_GUILD_ID`、`MCP_DISCORD_CHANNEL_IDS`。

---

## MCP Filesystem {#mcp-filesystem}

**角色**：在单一根目录（`FILESYSTEM_ROOT`）下列表/读（有时写）文件。

**配置**：端口 **8011**，`MCP_FILESYSTEM_ROOT`。生产环境使用专用卷与严格权限。

---

## MCP GitHub {#mcp-github}

**角色**：自动化 GitHub 工作流 —— Issue、PR、CI 上下文。

**配置**：端口 **8007**，`MCP_GITHUB_TOKEN`、`MCP_WRITE_CONFIRM_TOKEN`（保护写入）。

---

## MCP GitLab {#mcp-gitlab}

**角色**：项目、Issue、合并请求 —— SaaS 或自建 GitLab。

**配置**：端口 **8008**，`MCP_GITLAB_TOKEN`、`MCP_GITLAB_URL`。

---

## MCP Elasticsearch {#mcp-elasticsearch}

**角色**：全文检索与索引操作 —— 取决于 MCP 镜像与栈版本。

**配置**：宿主 **8009** 映射容器 **8080**，URL `http://mcp-elasticsearch:8080/mcp`。变量：`MCP_ELASTICSEARCH_URL`、凭证、可选 `MCP_ELASTICSEARCH_SSL_SKIP_VERIFY`。

---

## MCP AWS {#mcp-aws}

**角色**：AWS API —— 多为**只读**盘点；变更风险高。

**配置**：端口 **8012**，`AWS_REGION`、`AWS_PROFILE` 或静态密钥/会话令牌。

---

## MCP Azure {#mcp-azure}

**角色**：Azure 资源 —— ARM 或桥接暴露的 API。

**配置**：端口 **8013**，服务主体或 `AZURE_ACCESS_TOKEN`。探索场景优先 **Reader**。

---

## MCP GCP {#mcp-gcp}

**角色**：GCP 项目资源 —— Compute、GKE、存储、IAM 等按服务账号只读。

**配置**：端口 **8014**，`GCP_PROJECT_ID`、`GCP_REGION`、`GCP_SERVICE_ACCOUNT_JSON`（切勿提交）。

---

## MCP Email (SMTP) {#mcp-email}

**角色**：通过 SMTP **发邮件** —— 不含 IMAP 收件。

**配置**：端口 **8015**，`SMTP_*`，**`SMTP_ALLOWED_RECIPIENTS`** 防滥用。

---

## MCP Dagster {#mcp-dagster}

**角色**：通过 **GraphQL** 驱动 Dagster —— 资产、作业、运行、分区。

**配置**：端口 **8016**，`DAGSTER_GRAPHQL_URL`、`DAGSTER_API_TOKEN`、`DAGSTER_ALLOW_MUTATIONS`。

---

## MCP Apache Airflow {#mcp-airflow}

**角色**：通过稳定的 **REST API**（`/api/v1`）查询与控制 **Apache Airflow**：DAG、dag run、任务；可选触发或暂停 DAG。

**典型用途**：列出 DAG、查看最近一次运行状态、在允许写入时触发运行。

**桥能力**：读取 DAG 列表与详情、列出/查看 dag run、列出任务；写入（触发运行、暂停/恢复 DAG）需 `AIRFLOW_ALLOW_MUTATIONS=true` 且 Airflow 账户权限足够。

**配置**：端口 **8017**（`MCP_AIRFLOW_PORT`）；TaTi 中 URL：`http://mcp-airflow:8017/mcp`。变量：`AIRFLOW_BASE_URL`（不含 `/api/v1`）、`AIRFLOW_USERNAME` / `AIRFLOW_PASSWORD`、可选 `AIRFLOW_API_TOKEN`、`AIRFLOW_SSL_VERIFY`、`AIRFLOW_ALLOW_MUTATIONS`。

---

## MCP Grafana {#mcp-grafana}

**角色**：官方 Grafana MCP —— 仪表盘、文件夹、告警。

**配置**：端口 **8020**，`MCP_GRAFANA_URL`、`MCP_GRAFANA_SERVICE_ACCOUNT_TOKEN`，可选组织 ID。

---

## MCP Prometheus {#mcp-prometheus}

**角色**：PromQL 查询、target、序列元数据。

**配置**：端口 **8021**，`MCP_PROMETHEUS_URL`，可选认证，`MCP_PROMETHEUS_SSL_VERIFY`。

---

## MCP Datadog {#mcp-datadog}

**角色**：**Datadog 托管** MCP（默认 Compose 不含容器）—— APM、日志、指标视产品而定。

**配置**：`MCP_DATADOG_MCP_URL`（美区/欧区）。密钥常以 **HTTP 头**在 TaTi 配置（`DD_API_KEY`、`DD_APPLICATION_KEY`）。

---

## Google Gmail 与日历（远程 MCP）{#mcp-google}

**角色**：通过 **Google 托管** MCP 访问 Gmail 与日历。

**配置**：`MCP_GMAIL_MCP_URL`、`MCP_GOOGLE_CALENDAR_MCP_URL`、`GOOGLE_CLOUD_PROJECT_ID`、OAuth 变量。按需配置 **Headers**。

---

## MCP Moodle {#mcp-moodle}

**角色**：Moodle 插件 MCP 端点 —— 课程与活动等。

**配置**：`MCP_MOODLE_MCP_URL`、`MCP_MOODLE_TOKEN` —— 令牌最小权限。

---

## 废弃与替代

- **Elasticsearch MCP 镜像**：`.env.example` 可能提示 Elastic 侧演进 —— 关注发行说明中的推荐端点。

## 另见

- [架构](./architecture.md) — UI、API 与 MCP 流量。
- [配置](./configuration.md) — 完整变量列表。
- [安全](./security.md) — 令牌、只读与网络。
