# 架构 {#architecture}

本文说明使用官方仓库运行 TaTi 时的**结构**：应用数据库、Web 服务、MCP 桥与用户配置。

## 概览

![TaTi 架构 — 浏览器、TanStack / Vite SSR 应用、PostgreSQL、MCP 桥](/tati_architecture_diagram.svg)

_图例：HTTP 流向应用；SQL 流向 Postgres（应用数据）；MCP 经可流式 HTTP 连接各桥（Slack、Postgres、GitHub、OM…）。示意图区分展示层、业务逻辑、数据与 MCP。_

## 应用层

- **前端 + SSR**：对话界面、设置（含 **MCP 服务器**）、`TATI_AUTH_REQUIRED=true` 时的登录页。
- **API**：用户会话与启用的 MCP URL 在服务端持久化（仓库内 schema；迁移由脚本或部署完成）。
- **`DATABASE_URL`**：**应用**使用的 Postgres 连接字符串 — 与 **`MCP_POSTGRES_DATABASE_URL`**（仅供 **Postgres MCP** 代表模型执行 SQL）不同。

## MCP 层

每个连接器是独立进程（常为 Docker 容器），通过 HTTP 实现 MCP（「可流式」传输）。在 TaTi 中注册：

- 指向 `/mcp` 路径（或 Gmail、Datadog 等官方 URL）的**基 URL**；
- 可选 **HTTP 头**（API 令牌、Datadog 密钥、Moodle Bearer、Google OAuth…）。

用户发送对话消息后，应用可根据配置与各桥暴露的工具调用这些服务。

### Docker 网络

同一 `docker-compose.yml` 内服务按**名称**解析：

- 示例：从 `app` 容器访问 `http://mcp-postgres:8002/mcp`。
- 从宿主机测试：`http://localhost:<端口>/mcp`，端口来自 `.env`（`MCP_*_PORT`）。

## 文件系统 MCP 安全

**Filesystem MCP** 将宿主目录（开发时常为 `./`）挂载到容器内 `FILESYSTEM_ROOT`（常为 `/workspace`）。读写限制在该根下：生产环境请收紧（专用卷、操作系统权限）。

## 本地认证

本地认证**不能替代** MCP 网络安全：即使登录用户，攻击者仍可能直接调用可达的 MCP。请将 MCP 置于**防火墙后**或私有网络。会话由 `TATI_SESSION_TTL_DAYS` 及仓库内 cookie / 服务端机制管理。

## 延伸阅读

- [快速开始](./quick-start.md) — 具体命令。
- [MCP 连接器](./mcp.md) — 按服务参考。
- [配置](./configuration.md) — 环境变量分组。
