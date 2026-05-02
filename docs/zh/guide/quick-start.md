# 快速开始

本指南使用 **Docker Compose** 启动 **TaTi + Postgres + MCP 桥**。两种常见方式：

1. **不克隆仓库** — 仅下载 `docker-compose.dist.yml` + `.env.example`（预构建 GHCR 镜像）。
2. **克隆仓库** — 使用开发用 `docker-compose.yml`（本地构建应用、热重载）。

## 前置条件

- 已安装 **Docker** 与 **Docker Compose v2**。
- 若并行运行多个 MCP，建议至少 **4 GB** 可用内存（Elasticsearch、Grafana 等占用更高）。

## 方案 A — 发行包（无克隆）

适合快速试用 GitHub 容器仓库（`ghcr.io`）上的发布版本。

```bash
mkdir tati && cd tati
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/JeffSouop/TaTi/main/docker-compose.dist.yml
curl -fsSL -o .env.example https://raw.githubusercontent.com/JeffSouop/TaTi/main/.env.example
cp .env.example .env
```

### `.env` 最低修改

| 变量                                     | 说明                                          |
| ---------------------------------------- | --------------------------------------------- |
| `POSTGRES_PASSWORD`                      | 保护数据库；须与 `DATABASE_URL` 一致。        |
| `TATI_IMAGE_REGISTRY` / `TATI_IMAGE_TAG` | 指向已发布镜像（`ghcr.io/<owner>/…`、标签）。 |
| `APP_PORT`                               | 浏览器访问 UI 的端口。                        |

然后启用您持有令牌的 MCP（Slack、GitHub 等）；无令牌时部分容器可能反复重启或不可用。

```bash
docker compose pull
docker compose up -d
```

浏览器打开 `http://localhost:${APP_PORT:-3000}`（或您的 `APP_PORT`）。登录后进入应用首页 — **界面说明**见 [简介 — 界面概览](./introduction.md#interface-apercu)。

---

## 方案 B — 从克隆仓库开发

适合贡献代码或调试。

```bash
git clone https://github.com/JeffSouop/TaTi.git
cd TaTi
cp .env.example .env
# 编辑 .env — 至少保证 DATABASE_URL 与 Compose 内 Postgres 一致
```

若在宿主机单独运行 Vite，请先安装 JS 依赖：

```bash
npm install
```

启动 Compose：

```bash
docker compose up -d
```

- **`docker-compose.yml`** 将应用映射到 **`5173:8080`**：开发 UI 打开 **`http://localhost:5173`**（`app` 服务内 `bun run dev`）。
- MCP 端口来自 `.env`（`MCP_*_PORT`）。

停止：

```bash
docker compose down
```

（`docker compose down -v` 会删除 Postgres 卷 — **数据丢失**。）

---

## 快速检查

1. **Postgres**：`docker compose ps` → `postgres` 为 **healthy**。
2. **应用**：`docker compose logs -f app` → 无数据库连接错误。
3. **任一 MCP**：宿主机执行 `curl -sS -o /dev/null -w "%{http_code}" http://localhost:8002/mcp`（Postgres MCP）— 可能出现预期的方法错误，但不应 **connection refused**。

---

## 下一步

- 更稳妥部署：[部署](./deployment.md)。
- 变量详解：[配置](./configuration.md)。
- 接入工具：[MCP 连接器](./mcp.md)。
