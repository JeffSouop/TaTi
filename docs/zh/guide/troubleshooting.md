# 故障排查

首次部署或更新后的常见现象 — **按顺序**排查以节省时间。

## 应用无响应或 502

1. `docker compose ps` — `app` 是否为 **Up**？
2. `docker compose logs app --tail 200` — **`DATABASE_URL`** 或迁移错误？
3. 从宿主看，`DATABASE_URL` 中的主机/端口是否可达？

## 连接 MCP 出现 « Connection refused »

1. 服务存在：`docker compose ps | grep mcp`。
2. `.env` 中端口与 Compose 映射一致（`MCP_*_PORT`）。
3. TaTi 中 URL 使用**正确 DNS**：
   - 从 `app` 容器：`http://mcp-postgres:8002/mcp`；
   - 宿主手动测试：`http://localhost:8002/mcp`（常为仅 POST — GET 返回 405 可能正常）。

## `.env` 修改似乎未生效

- 查找**重复键**：两行 `TATI_AUTH_REQUIRED` → 后者生效。
- 修改 `.env` 后重启：`docker compose up -d --force-recreate`。
- 确认编辑的 `.env` 与正在执行的 `docker-compose.yml` **在同一目录**。

## OpenMetadata 或 Dagster « unreachable »

URL 常用 `host.docker.internal`，仅当：

- 使用 Docker Desktop（Mac/Windows）或可解析该主机名的环境；
- 目标服务在预期接口监听。

纯 Linux 环境请改用宿主 IP 或 Docker `extra_hosts`。

## Elasticsearch MCP 无法启动

检查 `MCP_ELASTICSEARCH_URL` 与凭证；镜像可能在集群不可达时拒绝启动。见 `docker compose logs mcp-elasticsearch`。

## Slack / GitHub « unauthorized »

- 令牌过期或撤销 — 在厂商控制台重新生成。
- Scope 不足 — **最小幅度**提高权限。

## CI « Docs »：`deploy-pages` 失败（404）

合并到 `main` 后，**deploy** 可能报 `Creating Pages deployment failed` / `HttpError: Not Found`，提示需启用 Pages。

在仓库上**一次性**完成（需 **Admin**）：

1. **Settings** → **Pages**。
2. **Build and deployment** 下 **Source** 选 **GitHub Actions**（不要用「从分支部署」）。
3. 保存后必要时手动重跑 **Docs** workflow。

未启用时构件仍会生成，但 Pages API 返回 404。

## 社区求助

- [GitHub Issues](https://github.com/JeffSouop/TaTi/issues) — 附版本/镜像标签、**不含密钥**的日志片段。
- [Actions CI](https://github.com/JeffSouop/TaTi/actions) — 查看 `main` 是否已修复。
