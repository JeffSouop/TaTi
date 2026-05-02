# 简介

TaTi 是一款**开源平台**，面向**交付**、**SRE** 与**运维**团队，希望将 **AI 副驾驶**接入真实工具链，而非泛泛的文本对话。

## 要解决的问题

缺乏上下文时，通用助手无法：

- 在 **Slack** 或 **Discord** 上读取状态；
- 在 **PostgreSQL** 上执行受控 **SQL**；
- 读取 **OpenMetadata** 目录或 **Grafana** 仪表盘；
- 在 **GitHub** / **GitLab** 上打开 **合并请求**。

TaTi 作为**编排层**：在单一界面配置 **MCP 服务器**（Model Context Protocol）。每个桥接暴露模型可调用的**工具**，URL 与密钥由**您**掌控。

## 主要组件

| 组件           | 作用                                                      |
| -------------- | --------------------------------------------------------- |
| **Web 应用**   | 对话、用户设置、MCP 列表、可选本地认证。                  |
| **PostgreSQL** | 应用持久化（会话、产品侧 MCP 配置）。                     |
| **MCP 服务**   | 每个工具族一个进程（或容器）：见 [MCP 连接器](./mcp.md)。 |

这不是封闭的「应用商店」：仓库里 `docker-compose.yml` 中的内容可按 **`.env`** 与令牌可用性**选择性启用**。

## 界面概览 {#interface-apercu}

### 登录页 {#interface-connexion}

启用**本地认证**（`TATI_AUTH_REQUIRED`）时，首页显示**登录**表单（邮箱、密码）、TaTi 标志与侧面展示区。

![TaTi — 登录界面](/screenshots/app-ecran-connexion.png)

### 登录后的首页 {#interface-accueil}

登录后**首页**包含对话流、侧边栏（新对话、会话列表、个人资料、已启用 **MCP 服务器**、设置）以及中央产品区（版本、快捷进入对话与配置）。

![TaTi — 登录后首页](/screenshots/app-accueil-apres-login.png)

### 设置 — AI 提供商 {#interface-parametres-providers}

**设置**可配置**模型提供商**（Claude、OpenAI、Mistral、Ollama 等）：API 密钥、默认模型、温度、最大工具轮数及**默认提供商**（「默认」徽章）。同页其他标签包括 **MCP 服务器**、**账户**、**用户**与内嵌**快速开始**。

![TaTi — 设置，AI 提供商标签](/screenshots/app-parametres-providers-ia.png)

_配图仅供参考；主题、文案与标签布局可能随版本变化。_

### 新建 MCP 服务器 — 预设 {#interface-presets-mcp}

在 **设置 → MCP 服务器** 中添加服务器时，**新建 MCP 服务器**窗口展示 **预设**网格：数据库、云、消息、可观测性等即用集成。URL、密钥、Compose 端口等细节见 **[MCP 连接器参考](./mcp.md)**。

![TaTi — 新建 MCP 服务器，预设网格](/screenshots/app-nouveau-serveur-mcp-presets.png)

_配图仅供参考；预设列表可能随版本演进。_

## 推荐阅读顺序

1. **[快速开始](./quick-start.md)** — 本地运行 Postgres、应用与若干 MCP。
2. **[架构](./architecture.md)** — 理解流量（浏览器 → 应用 → MCP）。
3. **[配置](./configuration.md)** — 稳定 `.env`（键不重复，密钥不入库）。
4. **[MCP 参考](./mcp.md)** — 逐个连接器（端口、`/mcp` URL、OAuth 头）。

## 术语

- **MCP**：向 AI 客户端暴露 **工具** / **资源** 的开放协议；TaTi 通过后端作为客户端连接您的桥接。
- **Streamable HTTP**：仓库中桥接用于 `/mcp` 的 HTTP 传输。
- **`DATABASE_URL`**：**TaTi 应用**的 Postgres 连接；与对话 SQL 使用的 **Postgres MCP** 连接不同。

---

下一步：[快速开始](./quick-start.md) 获取具体命令。
