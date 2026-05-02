# Déploiement

Ce guide résume comment passer d’un **essai local** à une installation **plus durable** : images versionnées, secrets, réseau et **mise à niveau**.

## Modes de déploiement

| Mode          | Fichier                              | Usage typique                                      |
| ------------- | ------------------------------------ | -------------------------------------------------- |
| Développement | `docker-compose.yml` (dans le clone) | Build de l’image `app`, volume du code, port 5173. |
| Distribution  | `docker-compose.dist.yml`            | Pas de clone : YAML + `.env`, pull d’images GHCR.  |

Les deux injètent `TATI_AUTH_REQUIRED` et `TATI_SESSION_TTL_DAYS` dans le service applicatif pour que le comportement d’auth suive votre `.env`.

## Images et registre

Les variables suivantes contrôlent **quel code** tourne en prod :

- **`TATI_IMAGE_REGISTRY`** — préfixe du registre (ex. `ghcr.io/jeffsouop` en minuscules pour GitHub Container Registry).
- **`TATI_IMAGE_TAG`** — tag aligné sur une [release](https://github.com/JeffSouop/TaTi/releases) ou `latest`.

Si vous forkez le dépôt et publiez vos propres images, mettez à jour ces deux clés en cohérence avec votre pipeline CI.

### Stratégie de tags

- En **test** : `latest` peut suffire mais les builds peuvent changer sans prévenir.
- En **prod** : épinglez un tag **semver** (`v0.x.y`) et documentez la valeur dans votre gestionnaire de config interne.

## Ports et exposition

- **`APP_PORT`** — port public de l’interface TaTi (mode dist).
- **`POSTGRES_PORT`** — n’exposez Postgres vers Internet sans firewall ; préférez réseau privé ou pas d’exposition publique.
- **Ports MCP** (`8001`, `8002`, …) — en production, **ne mappez que ce dont vous avez besoin** ou placez les MCP derrière un VPN / réseau interne.

Schéma mental : seule l’application TaTi doit être visible aux utilisateurs finaux ; les MCP sont des **backends techniques**.

## Secrets

- Ne committez jamais `.env`.
- Utilisez un **secret manager** (Vault, AWS Secrets Manager, etc.) et injectez les variables au runtime (systemd, Kubernetes secrets, GitHub Actions OIDC…).
- Pour GitHub/GitLab MCP : jetons **least privilege** ; activez les garde-fous `MCP_WRITE_CONFIRM_TOKEN` / OpenMetadata write confirm.

## Sauvegarde Postgres

Avant une mise à niveau majeure :

```bash
docker exec tati-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Adaptez le nom du conteneur si vous l’avez renommé.

## Mise à niveau {#mise-a-niveau}

1. Lire les **release notes** sur GitHub.
2. Sauvegarder la base (voir ci‑dessus).
3. Mettre à jour **`TATI_IMAGE_TAG`** si vous utilisez les images GHCR.
4. Fusionner les nouvelles clés : comparez votre `.env` avec `.env.example` du même tag.
5. `docker compose pull && docker compose up -d`.
6. Contrôler les logs : `docker compose logs -f app` et les services MCP critiques.

En cas d’échec de migration applicative, restaurez la sauvegarde SQL et repassez au tag d’image précédent.

## Haute disponibilité (hors scope détaillé)

Le dépôt vise un déploiement **Compose simple**. Pour du multi‑réplicas, orchestrateur Kubernetes, ou TLS terminé par un reverse proxy (Traefik, nginx), adaptez les manifestes et les healthchecks — les principes restent : Postgres durable, secrets injectés, MCP non exposés publiquement.

---

Pour la liste exhaustive des variables : [Configuration](./configuration.md).
