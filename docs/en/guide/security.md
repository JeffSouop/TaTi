# Security & authentication

TaTi involves three layers: **who reaches the UI**, **which secrets go to MCPs**, and **what actions the model can actually perform** on your systems.

## 1. User auth (TaTi UI)

- **`TATI_AUTH_REQUIRED`** — when `true`, users must sign in before chat.
- **`TATI_SESSION_TTL_DAYS`** — session lifetime; shorten it on shared workstations.

Local auth **does not secure MCPs by itself**: if an attacker reaches the network where MCP bridges run, they can call them without TaTi. Put MCPs **behind a firewall** or private network.

## 2. Secrets and tokens

| Practice           | Detail                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------- |
| Never in Git       | `.env` stays ignored; use CI secrets for pipelines.                                      |
| Least privilege    | GitHub/GitLab tokens with minimal scopes; Slack bots limited to required channels.      |
| Rotation           | Rotate tokens after someone leaves or a suspected leak.                                |

## 3. Write safeguards

Several bridges separate read vs write:

- **PostgreSQL MCP** — `MCP_POSTGRES_READ_ONLY=true` until you validate write use cases.
- **OpenMetadata** — `OPENMETADATA_ALLOW_MUTATIONS` + confirmation token for sensitive tools.
- **GitHub / GitLab** — `MCP_WRITE_CONFIRM_TOKEN`: destructive actions may require an explicit value in the tool call.

Document internally **who** may bypass these safeguards.

## 4. Network and exposure

- Do **not** expose MCP ports on the internet without TLS and ACLs.
- For OpenMetadata or Dagster on `host.docker.internal`, the MCP container talks to your host — that path must be controlled.

## 5. Personal data and compliance

If chats or metadata contain personal data, adjust retention, logging, and notices under your framework (GDPR, etc.). This repo does not provide legal templates.

---

Next: [Troubleshooting](./troubleshooting.md) for network symptoms and auth errors.
