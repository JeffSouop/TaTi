# Deployment

This guide summarizes moving from a **local trial** to a **more durable** setup: versioned images, secrets, networking, and **upgrades**.

## Deployment modes

| Mode        | File                         | Typical use                                      |
| ----------- | ---------------------------- | ------------------------------------------------ |
| Development | `docker-compose.yml` (clone) | Build `app` image, code volume, port 5173.       |
| Distribution | `docker-compose.dist.yml` | No clone: YAML + `.env`, pull GHCR images.      |

Both inject `TATI_AUTH_REQUIRED` and `TATI_SESSION_TTL_DAYS` into the app service so auth follows your `.env`.

## Images and registry

These variables control **which code** runs in production:

- **`TATI_IMAGE_REGISTRY`** — registry prefix (e.g. `ghcr.io/jeffsouop` lower-case for GHCR).
- **`TATI_IMAGE_TAG`** — tag aligned with a [release](https://github.com/JeffSouop/TaTi/releases) or `latest`.

If you fork and publish your own images, keep both keys aligned with your CI pipeline.

### Tag strategy

- **Testing**: `latest` may be fine but builds can change without notice.
- **Production**: pin a **semver** tag (`v0.x.y`) and document it in your internal config management.

## Ports and exposure

- **`APP_PORT`** — public port for the TaTi UI (dist mode).
- **`POSTGRES_PORT`** — do not expose Postgres to the internet without a firewall; prefer private network or no public exposure.
- **MCP ports** (`8001`, `8002`, …) — in production, **map only what you need** or put MCPs behind VPN / internal network.

Mental model: only the TaTi app should be visible to end users; MCPs are **technical backends**.

## Secrets

- Never commit `.env`.
- Use a **secret manager** (Vault, AWS Secrets Manager, etc.) and inject at runtime (systemd, Kubernetes secrets, GitHub Actions OIDC…).
- For GitHub/GitLab MCP: **least-privilege** tokens; enable safeguards like `MCP_WRITE_CONFIRM_TOKEN` / OpenMetadata write confirm.

## Postgres backup

Before a major upgrade:

```bash
docker exec tati-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Adjust the container name if you renamed it.

## Upgrade {#upgrade}

1. Read **release notes** on GitHub.
2. Back up the database (above).
3. Update **`TATI_IMAGE_TAG`** if you use GHCR images.
4. Merge new keys: compare your `.env` with `.env.example` for the same tag.
5. `docker compose pull && docker compose up -d`.
6. Check logs: `docker compose logs -f app` and critical MCP services.

If app migrations fail, restore the SQL backup and roll back to the previous image tag.

## High availability (not detailed here)

The repo targets a simple **Compose** deployment. For multi-replica Kubernetes, TLS termination with Traefik/nginx, etc., adapt manifests and healthchecks — principles remain: durable Postgres, injected secrets, MCPs not publicly exposed.

---

Full variable list: [Configuration](./configuration.md).
