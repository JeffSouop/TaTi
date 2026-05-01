# TaTi — Self-hosted

Application TanStack Start + Postgres + pont MCP OpenMetadata, packagée pour
tourner intégralement en local via Docker Compose.

## Pré-requis

- Docker + Docker Compose v2
- (optionnel) Node 20+ / Bun si tu veux lancer hors Docker

## Qualité CI/CD (GitHub Actions)

Le projet inclut un pipeline CI volontairement strict, mais pragmatique :

- `lint` (ESLint)
- `typecheck` (TypeScript en `strict`)
- `test:coverage` (Vitest + seuils mini de couverture)
- `format:check` (Prettier)
- `build` (Vite)

Déclenchements :

- sur chaque `pull_request` vers `main`
- sur chaque `push` sur `main`
- optimisation via détection de changements (les jobs lourds ne tournent que si le code applicatif change)

Recommandation protection de branche GitHub :

- définir `CI / quality-status` comme check requis unique sur `main`

Sécurité open source :

- pour les PR venant d'un fork, ajoute le label `safe to test` avant exécution de la CI
- workflow dédié `Security Audit` (npm audit niveau `high+critical`) exécuté chaque semaine et sur changement de dépendances

E2E smoke :

- workflow `E2E Smoke` (Playwright) activé sur PR/push pour vérifier qu'un parcours minimal UI reste opérationnel
- au démarrage il est volontairement **non bloquant** (`continue-on-error`) pour stabilisation progressive
- une fois stable pendant quelques itérations, tu peux le rendre bloquant et l'ajouter aux checks requis de branche

Release :

- une **release GitHub** est créée automatiquement lorsque la **CI** réussit sur `main` (workflow `Release` : bump patch SemVer, tag, notes générées).
- les **images Docker** sont construites et publiées sur **GHCR** à chaque **publication de release** (workflow `Publish container images`). Pense à rendre les paquets `ghcr.io/...` **publics** dans les paramètres du compte ou de l’organisation si tu veux que tout le monde puisse les tirer sans authentification.

## Installation sans cloner le dépôt (compose + images)

Tu peux te limiter à un répertoire contenant un `.env` et le fichier `docker-compose.dist.yml`, sur le modèle d’OpenMetadata (images préconstruites + compose).

1. Télécharge le compose pour la version souhaitée (remplace `vX.Y.Z` par un [tag de release](https://github.com/JeffSouop/TaTi/releases) réel) :

```bash
mkdir tati && cd tati
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/JeffSouop/TaTi/vX.Y.Z/docker-compose.dist.yml
```

2. Copie les variables d’environnement depuis le dépôt (même version) et adapte-les :

```bash
curl -fsSL -o .env.example https://raw.githubusercontent.com/JeffSouop/TaTi/vX.Y.Z/.env.example
cp .env.example .env
# éditer .env — au minimum Postgres, secrets MCP utilisés, etc.
```

3. Fixe le registre et le tag d’images (propriétaire GitHub en **minuscules** pour GHCR) :

```bash
export TATI_IMAGE_REGISTRY=ghcr.io/jeffsouop
export TATI_IMAGE_TAG=vX.Y.Z
docker compose -f docker-compose.yml pull
docker compose -f docker-compose.yml up -d
```

4. Ouvre l’app sur **http://localhost:3000** (port configurable via `APP_PORT` dans `.env`).

Si `docker compose pull` échoue avec « denied » ou « unauthorized », les paquets GHCR sont encore **privés** : dans GitHub → **Packages** → chaque image `tati-*` → **Package settings** → **Change visibility** → **Public**. Alternative : `docker login ghcr.io` avec un token ayant le scope `read:packages`.

**Remarques :**

- Les services MCP « amont » (Notion, Elasticsearch, Grafana, Prometheus, …) utilisent déjà des images publiques ; les ponts TaTi viennent de `ghcr.io`.
- Pour **mcp-filesystem**, en mode dist le volume hôte est `MCP_FILESYSTEM_HOST_PATH` (défaut `.` = répertoire courant du compose).
- Un run manuel du workflow **Publish container images** (`workflow_dispatch`) pousse uniquement le tag demandé (pas de mise à jour de `latest`, pour éviter les surprises).

## Démarrage rapide (développement, clone du dépôt)

```bash
# 1. Récupère le code
git clone <ton-repo>.git tati && cd tati

# 2. Crée ton .env (adapte les valeurs)
cp .env.example .env

# 3. Place ton server.py MCP-OpenMetadata
#    dans ./mcp-openmetadata/server.py
#    (cf. mcp-openmetadata/Dockerfile + requirements.txt déjà fournis)

# 4. Lance toute la stack (app dev + postgres + MCP)
docker compose up --build

# ou en mode prod (build SSR)
docker compose --profile prod up --build
```

### IA open source: installation et connexion a TaTi

TaTi supporte nativement les providers "openai-compatible" et Ollama.  
Tu peux donc connecter plusieurs moteurs open source, pas seulement Ollama.

#### Option A - Ollama (local, simple)

1. Installer Ollama:

- macOS/Linux: [https://ollama.com/download](https://ollama.com/download)

2. Lancer au moins un modele:

```bash
ollama pull llama3.1
ollama run llama3.1
```

3. Dans TaTi -> Parametres -> Providers LLM:

- Ajouter provider: `Ollama (local / self-hosted)`
- Base URL:
  - `http://host.docker.internal:11434` si TaTi tourne dans Docker
  - `http://localhost:11434` si TaTi tourne hors Docker
- Modele: `llama3.1` (ou autre modele installe)

#### Option B - OpenRouter (catalogue multi-modeles OSS)

OpenRouter expose une API OpenAI-compatible, pratique pour tester plusieurs modeles OSS sans infra locale.

1. Creer une cle API OpenRouter
2. Dans TaTi -> Providers LLM:

- Ajouter provider: `OpenAI (GPT)` (ou `Mistral`/autre provider openai-compatible)
- API key: `<ta_cle_openrouter>`
- Base URL: `https://openrouter.ai/api/v1`
- Modele: ex. `meta-llama/llama-3.1-70b-instruct`

#### Option C - Inference providers openai-compatible (HF, Together, Groq, etc.)

Si le provider expose `/chat/completions` au format OpenAI:

- utilise n'importe quel provider TaTi base sur l'adapter OpenAI-compatible
- renseigne simplement `API key` + `Base URL`
- choisis le nom exact du modele

Exemples usuels:

- Hugging Face Router: `https://router.huggingface.co/v1`
- NVIDIA: `https://integrate.api.nvidia.com/v1`
- Together: `https://api.together.xyz/v1`
- Groq: `https://api.groq.com/openai/v1`

#### Verification rapide

Dans la fiche provider:

1. `Tester la connexion`
2. `Enregistrer`
3. Ouvrir une conversation et selectionner le provider

#### Notes importantes

- Certains modeles open source n'implementent pas bien le tool-calling; privilegie les modeles "instruct/function-calling".
- Pour Docker + service local sur ta machine, pense a `host.docker.internal`.
- En entreprise, proxy/firewall peuvent bloquer certains endpoints externes.

Services :

- App (dev)→ http://localhost:5173
- Postgres → localhost:5432 (user/pass dans .env)
- MCP-OM → http://localhost:8001/mcp
- MCP-PG → http://localhost:8002/mcp
- MCP-PDF → http://localhost:8003/mcp
- MCP-Notion → http://localhost:8004/mcp
- MCP-Slack → http://localhost:8006/mcp
- MCP-Discord → http://localhost:8010/mcp
- MCP-Filesystem → http://localhost:8011/mcp
- MCP-AWS → http://localhost:8012/mcp
- MCP-Azure → http://localhost:8013/mcp
- MCP-GCP → http://localhost:8014/mcp
- MCP-Email → http://localhost:8015/mcp
- MCP-Dagster → http://localhost:8016/mcp
- MCP-GitHub → http://localhost:8007/mcp
- MCP-GitLab → http://localhost:8008/mcp
- MCP-Elastic → http://localhost:8009/mcp

Configuration recommandée dans l'interface TaTi (Serveurs MCP) :

- PostgreSQL → `http://mcp-postgres:8002/mcp` (car l'app tourne dans Docker)
- PDF Generator → `http://mcp-pdf:8003/mcp`
- Notion → `http://mcp-notion:8004/mcp`
- Slack → `http://mcp-slack:8006/mcp`
- Discord → `http://mcp-discord:8010/mcp`
- Filesystem → `http://mcp-filesystem:8011/mcp`
- AWS → `http://mcp-aws:8012/mcp`
- Azure → `http://mcp-azure:8013/mcp`
- GCP → `http://mcp-gcp:8014/mcp`
- Email (SMTP) → `http://mcp-email:8015/mcp`
- Dagster → `http://mcp-dagster:8016/mcp`
- GitHub → `http://mcp-github:8007/mcp`
- GitLab → `http://mcp-gitlab:8008/mcp`
- Elasticsearch → `http://mcp-elasticsearch:8080/mcp`
- Gmail (Google MCP distant) → `https://gmailmcp.googleapis.com/mcp/v1`
- Google Calendar (Google MCP distant) → `https://calendarmcp.googleapis.com/mcp/v1`

## Configuration Gmail + Google Calendar (MCP distants officiels)

Ces 2 serveurs MCP sont fournis par Google (pas besoin de conteneur local dédié).

Dans TaTi -> Paramètres -> Serveurs MCP -> Ajouter un serveur :

- Gmail:
  - URL: `https://gmailmcp.googleapis.com/mcp/v1`
  - Nom: `Gmail`
- Google Calendar:
  - URL: `https://calendarmcp.googleapis.com/mcp/v1`
  - Nom: `Google Calendar`

Authentification:

- Ces endpoints utilisent OAuth 2.0 Google.
- Si ton client MCP n'a pas de flow OAuth natif, tu peux passer un header `Authorization: Bearer <token>`.

Activation côté Google Cloud (projet concerné):

```bash
gcloud services enable gmailmcp.googleapis.com calendarmcp.googleapis.com --project=PROJECT_ID
```

## Configuration Slack et Notion

Dans `.env`, renseigne :

```bash
MCP_NOTION_TOKEN=secret_xxx
MCP_SLACK_BOT_TOKEN=xoxb-xxx
MCP_SLACK_TEAM_ID=T01234567
# optionnel (restriction de sécurité)
MCP_SLACK_CHANNEL_IDS=C01234567,C07654321
```

Puis relance :

```bash
docker compose up -d --build mcp-notion mcp-slack
```

### Scopes Slack recommandés

- `channels:read`
- `channels:history`
- `chat:write`
- `users:read`
- `users.profile:read`
- `reactions:write` (optionnel)

## Configuration Discord

Dans `.env`, renseigne :

```bash
MCP_DISCORD_BOT_TOKEN=xxxxxxxx
MCP_DISCORD_GUILD_ID=123456789012345678
# optionnel (restriction de sécurité)
MCP_DISCORD_CHANNEL_IDS=123456789012345678,234567890123456789
```

Puis relance :

```bash
docker compose up -d --build mcp-discord
```

Configuration TaTi :

- URL serveur MCP Discord : `http://mcp-discord:8010/mcp`
- outils exposés : `discord_list_channels`, `discord_post_message`, `discord_get_channel_history`

## Configuration Filesystem

Dans `.env`, ajuste si besoin :

```bash
MCP_FILESYSTEM_ROOT=/workspace
MCP_FILESYSTEM_PORT=8011
```

Puis relance :

```bash
docker compose up -d --build mcp-filesystem
```

Configuration TaTi :

- URL serveur MCP Filesystem : `http://mcp-filesystem:8011/mcp`
- outils exposés : `filesystem_list_directory`, `filesystem_read_file`,
  `filesystem_write_file`, `filesystem_make_directory`

## Configuration AWS

Dans `.env`, renseigne soit un profil AWS, soit des credentials:

```bash
AWS_REGION=eu-west-3
AWS_PROFILE=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
MCP_AWS_PORT=8012
```

Puis relance :

```bash
docker compose up -d --build mcp-aws
```

Configuration TaTi :

- URL serveur MCP AWS : `http://mcp-aws:8012/mcp`
- outils exposés :
  - `aws_ec2_list_instances`, `aws_ec2_describe_security_group`
  - `aws_lambda_list_functions`
  - `aws_ecs_list_services`, `aws_eks_list_clusters`
  - `aws_s3_list_buckets`, `aws_s3_get_public_access_block`
  - `aws_dynamodb_list_tables`
  - `aws_cloudwatch_recent_log_events`
  - `aws_cloudtrail_lookup_events`
  - `aws_iam_get_role_summary`
  - `aws_secretsmanager_list_secrets`

## Configuration Azure

Dans `.env`, renseigne soit un Service Principal, soit un access token ARM:

```bash
AZURE_SUBSCRIPTION_ID=
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
# ou token direct
AZURE_ACCESS_TOKEN=
MCP_AZURE_PORT=8013
```

Puis relance :

```bash
docker compose up -d --build mcp-azure
```

Configuration TaTi :

- URL serveur MCP Azure : `http://mcp-azure:8013/mcp`
- outils exposés :
  - `azure_list_resource_groups`
  - `azure_list_virtual_machines`
  - `azure_get_network_security_group`
  - `azure_list_web_apps`
  - `azure_list_storage_accounts`
  - `azure_list_key_vaults`
  - `azure_activity_log_recent_events`

## Configuration GCP

Dans `.env`, renseigne :

```bash
GCP_PROJECT_ID=mon-projet
GCP_REGION=europe-west1
GCP_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
MCP_GCP_PORT=8014
```

Puis relance :

```bash
docker compose up -d --build mcp-gcp
```

Configuration TaTi :

- URL serveur MCP GCP : `http://mcp-gcp:8014/mcp`
- outils exposés :
  - `gcp_list_projects`
  - `gcp_list_compute_instances`
  - `gcp_list_gke_clusters`
  - `gcp_list_storage_buckets`
  - `gcp_recent_log_entries`

## Configuration Email (SMTP)

Dans `.env`, renseigne :

```bash
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_USE_TLS=true
SMTP_FROM_EMAIL=reports@ton-domaine.com
# optionnel
SMTP_ALLOWED_RECIPIENTS=ops@ton-domaine.com,cto@ton-domaine.com
MCP_EMAIL_PORT=8015
```

Puis relance :

```bash
docker compose up -d --build mcp-email
```

Configuration TaTi :

- URL serveur MCP Email : `http://mcp-email:8015/mcp`
- outil exposé : `email_send_report`

## Configuration Dagster

Dans `.env`, renseigne :

```bash
DAGSTER_GRAPHQL_URL=http://host.docker.internal:3000/graphql
DAGSTER_API_TOKEN=
DAGSTER_ALLOW_MUTATIONS=false
MCP_DAGSTER_PORT=8016
```

Puis relance :

```bash
docker compose up -d --build mcp-dagster
```

Configuration TaTi :

- URL serveur MCP Dagster : `http://mcp-dagster:8016/mcp`
- outils exposés :
  - `dagster_list_repositories`
  - `dagster_list_jobs`
  - `dagster_recent_runs`
  - `dagster_get_run_info`
  - `dagster_launch_run` (si `DAGSTER_ALLOW_MUTATIONS=true`)
  - `dagster_terminate_run` (si `DAGSTER_ALLOW_MUTATIONS=true`)

## Intégrer GitHub / GitLab (MCP)

Objectif: lier incidents/données aux tickets, PR, MR et issues depuis TaTi.

1. Renseigne dans `.env`:

```bash
MCP_GITHUB_TOKEN=github_pat_xxx
MCP_GITLAB_TOKEN=glpat_xxx
# optionnel si GitLab self-hosted
MCP_GITLAB_URL=https://gitlab.com
# garde-fou d'ecriture (issue/comment)
MCP_WRITE_CONFIRM_TOKEN=CONFIRM
```

2. Lance les services:

```bash
docker compose up -d --build mcp-github mcp-gitlab
```

3. Dans TaTi -> Paramètres -> Serveurs MCP -> Ajouter un serveur:
   - utilise le preset `GitHub` et `GitLab`,
   - clique `Tester`, puis `Enregistrer`.

Notes:

- GitHub: préfère un token finement scoped (repo/issues/pull requests).
- GitLab: utilise un PAT avec scopes API requis sur les projets visés.
- Évite de committer des tokens dans des fichiers versionnés.
- Les actions d'écriture (create issue / comment) exigent `confirm=CONFIRM`
  (ou la valeur de `MCP_WRITE_CONFIRM_TOKEN`) pour éviter les actions accidentelles.

## Intégrer Elasticsearch (MCP)

Le serveur MCP Elasticsearch est configuré en mode `streamable-http` dans le compose.

Dans `.env`, renseigne au minimum:

```bash
MCP_ELASTICSEARCH_URL=https://ton-cluster:9200
MCP_ELASTICSEARCH_API_KEY=<api_key>
# ou username/password a la place
MCP_ELASTICSEARCH_PORT=8009
```

Puis relance:

```bash
docker compose up -d --build mcp-elasticsearch
```

Dans TaTi -> Paramètres -> Serveurs MCP:

- preset `Elasticsearch`
- URL: `http://mcp-elasticsearch:8080/mcp`
- Tester -> Enregistrer

Healthcheck HTTP:

```bash
curl http://localhost:8009/ping
```

Par défaut, le MCP PostgreSQL tourne en lecture seule.
Pour autoriser les modifications (INSERT/UPDATE/DELETE), mets dans `.env` :

```bash
MCP_POSTGRES_READ_ONLY=false
```

puis redémarre le service :

```bash
docker compose up -d --build mcp-postgres
```

## Architecture

```
┌────────────┐     fetch /api/db        ┌─────────────────┐
│ Browser    │ ───────────────────────▶ │  TanStack Start │
│ (React)    │ ◀─SSE /api/realtime────  │  (Bun, port     │
└────────────┘                          │   5173/3000)    │
                                        └────────┬────────┘
                                                 │ pg
                                        ┌────────▼────────┐
                                        │   Postgres 16   │
                                        │   (init.sql)    │
                                        └─────────────────┘
```

- **`src/lib/db.server.ts`** — pool `pg`, helper `dbAdmin` côté serveur.
- **`src/routes/api.db.ts`** — endpoint qui exécute les requêtes du browser.
- **`src/routes/api.realtime.ts`** — SSE basé sur Postgres `LISTEN/NOTIFY`.
- **`src/integrations/supabase/client.ts`** — wrapper navigateur compatible
  avec l'ancienne API Supabase (`from().select().eq()...`, `channel(...)`).

## Base de données

Le schéma est dans `db/init.sql` et appliqué automatiquement au premier
démarrage du container Postgres. Inclut les triggers `LISTEN/NOTIFY` pour le
realtime.

Pour repartir de zéro :

```bash
docker compose down -v
docker compose up --build
```

```bash
docker compose exec -T postgres psql -U tati -d tati \
  -c "\copy public.llm_providers FROM STDIN CSV HEADER" < ./exports/llm_providers.csv
# idem pour mcp_servers, conversations, messages
```

## Hors Docker (option dev local pur)

```bash
# 1. Lance juste Postgres via docker
docker compose up -d postgres

# 2. Installe + lance l'app sur ton hôte
bun install
echo 'DATABASE_URL=postgres://tati:tati_dev_password@localhost:5432/tati' >> .env
bun run dev
```

## Limites connues

- **Pas d'authentification** : tout le monde a accès à toutes les données
  (singleton local). Ne pas exposer publiquement sans rajouter une couche
  auth (reverse-proxy avec basic-auth ou ajouter de l'auth dans l'app).
- **Wrapper Supabase partiel** : ne supporte que les méthodes utilisées dans
  ce projet (`select`, `insert`, `update`, `delete`, `eq`, `neq`, `order`,
  `limit`, `single`, `maybeSingle`, `count: "exact"`, `head`, et le realtime
  postgres_changes). Si tu rajoutes du code utilisant `or`, `in`, `ilike`,
  RPC, etc., il faudra étendre `src/integrations/supabase/client.ts` et
  `src/routes/api.db.ts`.
- **Build prod** : le projet est configuré pour Cloudflare Workers via
  `@cloudflare/vite-plugin`. Le mode `prod` du compose utilise `vite preview`
  qui sert le build statique + SSR. Pour un déploiement prod plus sérieux,
  remplace ce plugin par `@tanstack/react-start/server`.
