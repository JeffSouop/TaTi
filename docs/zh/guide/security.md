# 安全与认证

TaTi 涉及三层：**谁访问界面**、**哪些密钥发往 MCP**、**模型实际能执行哪些操作**。

## 1. 用户认证（TaTi UI）

- **`TATI_AUTH_REQUIRED`** — `true` 时用户需先登录再对话。
- **`TATI_SESSION_TTL_DAYS`** — 会话有效期；共享工作站应缩短。

本地认证**本身不能保护 MCP**：若攻击者到达 MCP 所在网络，可直接调用 MCP，无需经过 TaTi。请将 MCP 置于**防火墙后**或私有网络。

## 2. 密钥与令牌

| 实践     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| 不入 Git | `.env` 保持忽略；流水线用 CI Secret。                |
| 最小权限 | GitHub/GitLab 令牌最小 scope；Slack 机器人限制频道。 |
| 轮换     | 人员离职或疑似泄露后轮换令牌。                       |

## 3. 写入防护

多个桥接区分读/写：

- **PostgreSQL MCP** — 未验证写场景前保持 `MCP_POSTGRES_READ_ONLY=true`。
- **OpenMetadata** — `OPENMETADATA_ALLOW_MUTATIONS` + 敏感工具确认令牌。
- **GitHub / GitLab** — `MCP_WRITE_CONFIRM_TOKEN`：破坏性操作可能要求在工具调用中显式传值。

请在内部文档中明确**谁**有权绕过这些限制。

## 4. 网络与暴露

- 勿在无 TLS 与 ACL 的情况下将 MCP 端口暴露公网。
- OpenMetadata 或 Dagster 使用 `host.docker.internal` 时，MCP 容器与宿主通信路径必须可控。

## 5. 个人数据与合规

若对话或元数据包含个人信息，请按适用框架（如 GDPR）调整留存、日志与告知。本仓库不提供法律模板。

---

下一步：[故障排查](./troubleshooting.md) 处理网络与认证类症状。
