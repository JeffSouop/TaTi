# 部署

本文概述如何从**本地试用**过渡到**更持久**的安装：版本化镜像、密钥、网络与**升级**。

## 部署模式

| 模式   | 文件                        | 典型用途                             |
| ------ | --------------------------- | ------------------------------------ |
| 开发   | 克隆内 `docker-compose.yml` | 构建 `app` 镜像、代码卷、端口 5173。 |
| 发行包 | `docker-compose.dist.yml`   | 无需克隆：YAML + `.env`，拉取 GHCR。 |

二者都会将 `TATI_AUTH_REQUIRED`、`TATI_SESSION_TTL_DAYS` 注入应用服务，使认证行为与 `.env` 一致。

## 镜像与仓库

以下变量控制生产环境**运行的代码**：

- **`TATI_IMAGE_REGISTRY`** — 仓库前缀（如 GHCR 用小写 `ghcr.io/jeffsouop`）。
- **`TATI_IMAGE_TAG`** — 与 [发行版](https://github.com/JeffSouop/TaTi/releases) 对齐的标签或 `latest`。

若 fork 并发布自有镜像，请与 CI 流水线保持这两项一致。

### 标签策略

- **测试**：`latest` 可用，但构建可能悄然变化。
- **生产**：固定 **semver** 标签（`v0.x.y`）并在内部配置中备案。

## 端口与暴露

- **`APP_PORT`** — 发行模式下 TaTi UI 的对外端口。
- **`POSTGRES_PORT`** — 勿在无防火墙情况下将 Postgres 暴露到公网；优先私有网络或不映射。
- **MCP 端口**（`8001`、`8002`…）— 生产环境**仅映射所需**，或将 MCP 置于 VPN / 内网。

心智模型：最终用户只需访问 TaTi 应用；MCP 为**后端技术组件**。

## 密钥

- 切勿提交 `.env`。
- 使用**密钥管理器**（Vault、云厂商密钥服务等），在运行时注入（systemd、K8s Secret、GitHub Actions OIDC…）。
- GitHub/GitLab MCP：**最小权限**令牌；启用 `MCP_WRITE_CONFIRM_TOKEN` / OpenMetadata 写确认等防护。

## Postgres 备份

大版本升级前：

```bash
docker exec tati-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

若重命名容器请相应修改。

## 升级 {#upgrade}

1. 阅读 GitHub **发行说明**。
2. 备份数据库（见上）。
3. 若使用 GHCR 镜像，更新 **`TATI_IMAGE_TAG`**。
4. 合并新键：将 `.env` 与同标签的 `.env.example` 比对。
5. `docker compose pull && docker compose up -d`。
6. 查看日志：`docker compose logs -f app` 及关键 MCP。

若应用迁移失败，恢复 SQL 备份并回滚镜像标签。

## 高可用（本文不展开）

仓库面向简单 **Compose**。多副本 Kubernetes、Traefik/nginx 终止 TLS 等请自行调整清单与健康检查 — 原则不变：Postgres 持久化、密钥注入、MCP 不公网暴露。

---

变量完整列表：[配置](./configuration.md)。
