# Configuration (`.env`)

Toute l’infrastructure TaTi (Postgres, application, ponts MCP) est pilotée par des **variables d’environnement**. Le fichier **`.env.example`** du dépôt est la **source de vérité** : il est commenté ligne par ligne. Copiez-le vers **`.env`** et adaptez.

::: danger Ne jamais commiter `.env`
Les jetons Slack, GitHub, OpenMetadata, clés cloud, etc. doivent rester **hors Git** et hors captures d’écran.
:::

## Règles de base

- **Une seule ligne par clé** : si dupliquez une variable, **seule la dernière** est prise en compte (comportement standard des parsers `.env`).
- **Cohérence Docker / hôte** : `DATABASE_URL` utilisée par l’app doit pointer vers le **bon hôte** (`postgres` dans Compose, `localhost` si l’app tourne sur l’hôte sans réseau Compose).
- **`NODE_ENV`** : en général `development` dans le compose du dépôt ; les images de prod suivent le Dockerfile du projet.

---

## PostgreSQL (données applicatives)

| Variable            | Description                                                                         |
| ------------------- | ----------------------------------------------------------------------------------- |
| `POSTGRES_USER`     | Utilisateur créé dans le conteneur Postgres.                                        |
| `POSTGRES_PASSWORD` | Mot de passe — à changer hors dev.                                                  |
| `POSTGRES_DB`       | Nom de la base applicative TaTi.                                                    |
| `POSTGRES_PORT`     | Port **exposé sur l’hôte** si vous mappez Postgres (évitez l’exposition publique).  |
| `DATABASE_URL`      | Chaîne complète consommée par le serveur SSR (`postgres://user:pass@hôte:port/db`). |

---

## Auth applicative

| Variable                | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `TATI_AUTH_REQUIRED`    | `true` pour forcer un login avant l’UI (recommandé hors sandbox personnelle). |
| `TATI_SESSION_TTL_DAYS` | Durée de vie des sessions en jours.                                           |

Ces variables sont aussi passées au service `app` dans les fichiers Compose du dépôt pour éviter les écarts avec le seul `.env` mal relu.

---

## Images GHCR (mode `docker-compose.dist.yml`)

| Variable              | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `TATI_IMAGE_REGISTRY` | Préfixe des images (`ghcr.io/<owner>` en minuscules pour GitHub). |
| `TATI_IMAGE_TAG`      | Tag d’image (release semver ou `latest`).                         |
| `APP_PORT`            | Port sur lequel vous joignez l’interface utilisateur.             |

Optionnel : chemins montés pour certains MCP (ex. filesystem en mode dist).

---

## OpenMetadata

| Variable                           | Description                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `OPENMETADATA_URL`                 | URL API OpenMetadata joignable **depuis le conteneur** MCP (`host.docker.internal` sur Docker Desktop si OM tourne sur l’hôte). |
| `OPENMETADATA_JWT`                 | Jeton d’API OM.                                                                                                                 |
| `OPENMETADATA_ALLOW_MUTATIONS`     | Autoriser ou non les écritures vers OM.                                                                                         |
| `OPENMETADATA_WRITE_CONFIRM_TOKEN` | Valeur attendue pour confirmer les tools d’écriture sensibles.                                                                  |

---

## MCP Postgres (SQL pour le modèle)

| Variable                    | Description                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `MCP_POSTGRES_DATABASE_URL` | Base sur laquelle le pont exécute du SQL (souvent la même que TaTi ou une base métier). |
| `MCP_POSTGRES_PORT`         | Port HTTP du pont sur l’hôte.                                                           |
| `MCP_POSTGRES_READ_ONLY`    | `true` pour limiter aux lectures (SELECT / introspection).                              |

---

## Messagerie & fichiers

Slack, Discord, PDF, Notion, filesystem : voir les préfixes `MCP_SLACK_*`, `MCP_DISCORD_*`, `MCP_PDF_*`, `MCP_NOTION_TOKEN`, `MCP_FILESYSTEM_*` dans `.env.example`. Les ports par défaut sont rappelés dans [Connecteurs MCP](./mcp.md).

---

## Cloud & observabilité

Groupes principaux dans `.env.example` :

- **AWS** — `AWS_REGION`, credentials ou `AWS_PROFILE`.
- **Azure** — Service Principal ou `AZURE_ACCESS_TOKEN`.
- **GCP** — `GCP_PROJECT_ID`, JSON de compte de service.
- **Email SMTP** — `SMTP_*`, liste autorisée des destinataires.
- **Dagster** — URL GraphQL Dagster, jeton API, `DAGSTER_ALLOW_MUTATIONS`.
- **Apache Airflow** — `AIRFLOW_BASE_URL`, identifiants ou `AIRFLOW_API_TOKEN`, `AIRFLOW_ALLOW_MUTATIONS`, `AIRFLOW_SSL_VERIFY`.
- **dbt Cloud** — `DBT_CLOUD_DISCOVERY_URL`, `DBT_CLOUD_TOKEN`, `DBT_CLOUD_ENVIRONMENT_ID`, `DBT_SSL_VERIFY`.
- **dbt Core (pont CLI)** — `DBT_CORE_HOST_PROJECT`, `DBT_CORE_PROJECT_DIR`, `DBT_PROFILES_DIR`, `DBT_CORE_TARGET`, `DBT_ALLOW_MUTATIONS`.
- **Elasticsearch** — URL cluster, clé API ou login/mot de passe.
- **Grafana / Prometheus** — URL du stack monitoring + jetons si besoin.
- **Datadog** — URL MCP Datadog + clés API / application (souvent dans les headers côté UI TaTi).

---

## Forge Git

| Variable                                    | Description                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `MCP_GITHUB_TOKEN` / `MCP_GITLAB_TOKEN`     | Accès API avec périmètre minimal.                                         |
| `MCP_GITLAB_URL`                            | Instance GitLab (cloud ou self‑hosted).                                   |
| `MCP_WRITE_CONFIRM_TOKEN`                   | Chaîne que les tools d’écriture peuvent exiger pour éviter les accidents. |
| `MCP_GITHUB_MCP_URL` / `MCP_GITLAB_MCP_URL` | Optionnel si votre configuration référence encore une URL explicite.      |

---

## Google Workspace (MCP distants)

| Variable                                            | Description                                     |
| --------------------------------------------------- | ----------------------------------------------- |
| `MCP_GMAIL_MCP_URL` / `MCP_GOOGLE_CALENDAR_MCP_URL` | Endpoints officiels Google MCP.                 |
| `GOOGLE_CLOUD_PROJECT_ID`                           | Projet GCP où les APIs sont activées.           |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET`                 | Pour flux OAuth côté outillage.                 |
| `GOOGLE_OAUTH_ACCESS_TOKEN`                         | Bearer pour tests ou intégrations header-based. |

---

## Moodle

`MCP_MOODLE_MCP_URL` et `MCP_MOODLE_TOKEN` — URL du endpoint plugin et jeton de service externe Moodle.

---

## Quand vous êtes bloqué

1. Comparez votre `.env` avec `.env.example` **du même tag de release** que vos images.
2. Vérifiez les logs du service MCP : `docker compose logs mcp-<nom>`.
3. Relisez la section dédiée dans [Connecteurs MCP](./mcp.md).
