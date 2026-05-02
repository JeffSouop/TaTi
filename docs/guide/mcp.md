# Connecteurs MCP (référence) {#mcp-top}

TaTi ne « embarque » pas toute la logique des intégrations dans le binaire web : chaque domaine (Slack, cloud, base de données…) est servi par un **pont MCP** — petit service HTTP compatible **Model Context Protocol**. Vous les lancez via Docker Compose (ou à la main), puis vous déclarez leur **URL** dans l’interface : **Paramètres → Serveurs MCP** (les préréglages du dépôt reprennent les noms de service et chemins `/mcp`). La grille **presets** de l’UI est illustrée dans [Introduction — Nouveau serveur MCP](./introduction.md#interface-presets-mcp).

::: tip Rappel
Les **ports** ci‑dessous sont les **ports hôte par défaut** du fichier `.env.example`. Ils sont modifiables : gardez la cohérence entre `.env`, `docker compose` et l’URL enregistrée dans TaTi (ex. si vous changez `MCP_SLACK_PORT`, l’URL `http://localhost:…/mcp` change aussi).
:::

## Tableau récapitulatif

| Connecteur            | Port hôte (défaut)  | URL type (dans le réseau Compose)   | Variables clés                                                           |
| --------------------- | ------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| OpenMetadata          | 8001                | `http://mcp-openmetadata:8001/mcp`  | `OPENMETADATA_URL`, `OPENMETADATA_JWT`                                   |
| PostgreSQL            | 8002                | `http://mcp-postgres:8002/mcp`      | `MCP_POSTGRES_DATABASE_URL`, `MCP_POSTGRES_READ_ONLY`                    |
| PDF                   | 8003                | `http://mcp-pdf:8003/mcp`           | `MCP_PDF_PUBLIC_BASE_URL`                                                |
| Notion                | 8004                | `http://mcp-notion:8004/mcp`        | `MCP_NOTION_TOKEN`                                                       |
| GitHub                | 8007                | `http://mcp-github:8007/mcp`        | `MCP_GITHUB_TOKEN`                                                       |
| GitLab                | 8008                | `http://mcp-gitlab:8008/mcp`        | `MCP_GITLAB_TOKEN`, `MCP_GITLAB_URL`                                     |
| Elasticsearch         | 8009 → 8080 interne | `http://mcp-elasticsearch:8080/mcp` | `MCP_ELASTICSEARCH_*`                                                    |
| Discord               | 8010                | `http://mcp-discord:8010/mcp`       | `MCP_DISCORD_*`                                                          |
| Filesystem            | 8011                | `http://mcp-filesystem:8011/mcp`    | `MCP_FILESYSTEM_ROOT`                                                    |
| AWS                   | 8012                | `http://mcp-aws:8012/mcp`           | `AWS_*`                                                                  |
| Azure                 | 8013                | `http://mcp-azure:8013/mcp`         | `AZURE_*`                                                                |
| GCP                   | 8014                | `http://mcp-gcp:8014/mcp`           | `GCP_*`                                                                  |
| Email SMTP            | 8015                | `http://mcp-email:8015/mcp`         | `SMTP_*`                                                                 |
| Dagster               | 8016                | `http://mcp-dagster:8016/mcp`       | `DAGSTER_GRAPHQL_URL`, `DAGSTER_API_TOKEN`                               |
| Apache Airflow        | 8017                | `http://mcp-airflow:8017/mcp`       | `AIRFLOW_BASE_URL`, `AIRFLOW_USERNAME` / `AIRFLOW_PASSWORD`              |
| dbt Cloud             | 8018                | `http://mcp-dbt:8018/mcp`           | `DBT_CLOUD_DISCOVERY_URL`, `DBT_CLOUD_TOKEN`, `DBT_CLOUD_ENVIRONMENT_ID` |
| dbt Core              | 8019                | `http://mcp-dbt-core:8019/mcp`      | `DBT_CORE_HOST_PROJECT`, `DBT_PROFILES_DIR`, `DBT_ALLOW_MUTATIONS`     |
| Slack                 | 8006                | `http://mcp-slack:8006/mcp`         | `MCP_SLACK_*`                                                            |
| Grafana               | 8020                | `http://mcp-grafana:8020/mcp`       | `MCP_GRAFANA_*`                                                          |
| Prometheus            | 8021                | `http://mcp-prometheus:8021/mcp`    | `MCP_PROMETHEUS_*`                                                       |
| Datadog               | — (HTTPS)           | Voir section Datadog                | `MCP_DATADOG_*` + headers                                                |
| Google Gmail / Agenda | — (HTTPS)           | Endpoints Google MCP                | `GOOGLE_*`, OAuth                                                        |
| Moodle                | — (HTTPS)           | URL du plugin Moodle                | `MCP_MOODLE_*`                                                           |

Les sections suivantes détaillent **rôle**, **cas d’usage**, **ce que le pont expose en général**, puis **configuration** et **pièges courants**.

---

## MCP OpenMetadata {#mcp-openmetadata}

**Rôle** : exposer des outils MCP pour interroger (et éventuellement modifier) les métadonnées gérées par une instance **OpenMetadata** — tables, colonnes, glossaires, tags, lignage et propriétés métier selon votre modèle de données dans OM.

**Cas d’usage avec TaTi**

- Répondre à « quelle table alimente ce rapport ? », « qui est propriétaire de ce dataset ? », « montre le lignage autour de _customers_ ».
- Préparer une revue de conformité ou un onboarding data en s’appuyant sur le catalogue plutôt que sur des exports manuels.

**Capacités typiques du pont**

- Recherche et navigation dans les entités cataloguées (schemas, tables, pipelines, dashboards reliés si OM les ingère).
- Lecture du lignage et des relations ; éventuelles **mutations** (descriptions, tags) si vous les activez explicitement côté pont.

**Configuration**

- **Compose** : service `mcp-openmetadata`, port **8001**.
- **URL dans TaTi** : `http://mcp-openmetadata:8001/mcp` (depuis le conteneur app).
- **Variables** : `OPENMETADATA_URL` (API OM joignable depuis le conteneur, ex. `http://host.docker.internal:8585`), `OPENMETADATA_JWT`, options `OPENMETADATA_ALLOW_MUTATIONS`, `OPENMETADATA_WRITE_CONFIRM_TOKEN`.

::: warning
Les mutations sur le catalogue sont sensibles : gardez `OPENMETADATA_ALLOW_MUTATIONS=false` tant que vous n’avez pas validé les flux ; utilisez un jeton de confirmation d’écriture si le pont l’exige.
:::

---

## MCP PostgreSQL {#mcp-postgresql}

**Rôle** : permettre au modèle d’exécuter du **SQL** sur une base Postgres (souvent une base métier ou la même instance que TaTi — dans ce dernier cas le périmètre doit être réfléchi : données applicatives vs données utilisateur).

**Cas d’usage avec TaTi**

- Explorateur de schéma : lister tables, contraintes, tailles approximatives pour documenter une release.
- Requêtes analytiques en lecture (`SELECT`, agrégats) pour répondre à des questions ops (« combien d’échecs hier ? »).
- Éviter de copier-coller des dumps : le modèle interroge la base via le pont, sous les garde-fous du serveur MCP.

**Capacités typiques**

- Introspection (`information_schema`, équivalent de `\d` via SQL).
- Exécution de requêtes ; en `MCP_POSTGRES_READ_ONLY=true`, les écritures sont refusées côté pont — **recommandé** pour la découverte et les environnements non isolés.

**Configuration**

- **Port** : **8002** (`MCP_POSTGRES_PORT`).
- **URL** : `http://mcp-postgres:8002/mcp`.
- **Variables** : `MCP_POSTGRES_DATABASE_URL`, `MCP_POSTGRES_READ_ONLY` (`true` = lecture seule).

::: tip
Ne pointez pas une production critique sans réseau isolé et sans policy SQL claire : même en lecture, des `SELECT` lourds peuvent charger la base.
:::

---

## MCP PDF {#mcp-pdf}

**Rôle** : **générer des PDF** (rapports, synthèses, annexes) et renvoyer des **URLs de téléchargement** utilisables par l’utilisateur final.

**Cas d’usage avec TaTi**

- Produire une note de synthèse ou un export « snapshot » après une analyse dans le chat.
- Générer une pièce jointe pour un ticket ou un canal (Slack / email) si vous enchaînez avec d’autres MCP.

**Capacités typiques**

- Création de documents à partir de contenu fourni (Markdown/HTML selon l’implémentation du pont).
- Retour d’URL **publiquement résolvables** pour le navigateur : sans `MCP_PDF_PUBLIC_BASE_URL` correcte, les liens peuvent être cassés pour les utilisateurs distants.

**Configuration**

- **Port** : **8003**.
- **URL** : `http://mcp-pdf:8003/mcp`.
- **Variables** : `MCP_PDF_PUBLIC_BASE_URL` joignable **par le navigateur** ou les clients qui suivent les liens (souvent `http://localhost:8003` en local ; en prod, URL HTTPS derrière reverse proxy).

---

## MCP Notion {#mcp-notion}

**Rôle** : accès aux **bases**, **pages** et blocs Notion via un serveur MCP (souvent le flux officiel ou une image du dépôt), avec les permissions du jeton d’intégration.

**Cas d’usage avec TaTi**

- Exploiter la documentation vivante (runbooks, specs) dans une conversation sans dupliquer Notion ailleurs.
- Mettre à jour une page de suivi d’incident ou une base « décisions » après une analyse dans TaTi.

**Capacités typiques**

- Lecture de bases et filtres ; création / mise à jour de pages ou d’entrées de base selon les capacités du serveur et les droits du token.

**Configuration**

- **Port** : **8004**.
- **URL** : `http://mcp-notion:8004/mcp`.
- **Variables** : `MCP_NOTION_TOKEN` (secret d’intégration Notion — limiter l’accès aux pages nécessaires dans l’UI Notion).

---

## MCP Slack {#mcp-slack}

**Rôle** : **lire l’historique** (selon scopes) et **publier** dans Slack via un bot dédié, avec restriction possible aux canaux listés.

**Cas d’usage avec TaTi**

- Synthétiser un fil d’incident et proposer un message de statut pour `#incidents`.
- Récupérer le contexte d’une décision déjà discutée dans un canal avant de rédiger une action.

**Capacités typiques**

- Liste des canaux autorisés, lecture de messages récents, envoi de messages (parfois threads).
- Les **OAuth scopes** du bot déterminent ce qui est réellement possible : sans `history` ou équivalent, la lecture peut être limitée.

**Configuration**

- **Port** : **8006**.
- **URL** : `http://mcp-slack:8006/mcp`.
- **Variables** : `MCP_SLACK_BOT_TOKEN`, `MCP_SLACK_TEAM_ID`, `MCP_SLACK_CHANNEL_IDS` (facultatif, pour **restreindre** les canaux accessibles — fortement conseillé).

---

## MCP Discord {#mcp-discord}

**Rôle** : équivalent **Discord** du bridge Slack : salons d’une guilde, bot avec permissions Discord.

**Cas d’usage avec TaTi**

- Même logique que Slack pour les équipes sur Discord : résumés, annonces, récupération de contexte sur un salon support ou ops.

**Capacités typiques**

- Lecture / envoi sur les salons configurés ; le comportement exact dépend des intents et permissions du bot sur Discord Developer Portal.

**Configuration**

- **Port** : **8010**.
- **URL** : `http://mcp-discord:8010/mcp`.
- **Variables** : `MCP_DISCORD_BOT_TOKEN`, `MCP_DISCORD_GUILD_ID`, `MCP_DISCORD_CHANNEL_IDS`.

---

## MCP Filesystem {#mcp-filesystem}

**Rôle** : **liste**, **lecture** et parfois **écriture** de fichiers sous une **racine unique** dans le conteneur (`FILESYSTEM_ROOT`), sans sortir de cet arbre.

**Cas d’usage avec TaTi**

- Parcourir un dépôt de docs ou de scripts montés en volume pour répondre « où est définie cette variable ? ».
- Générer un fichier de config ou un patch **dans le workspace autorisé** (jamais la racine système).

**Capacités typiques**

- `list_dir`, `read_file`, opérations d’écriture si activées par l’image du pont.

**Configuration**

- **Port** : **8011**.
- **URL** : `http://mcp-filesystem:8011/mcp`.
- **Variables** : `MCP_FILESYSTEM_ROOT` — en dev le compose monte souvent le repo sous `/workspace`.

::: warning
En production, utilisez un volume dédié et des permissions OS strictes : ce MCP équivaut à donner un shell fichier au modèle dans la limite du dossier monté.
:::

---

## MCP GitHub {#mcp-github}

**Rôle** : automatiser les workflows **GitHub** : issues, pull requests, recherche de code, actions de CI — selon les outils exposés par le pont.

**Cas d’usage avec TaTi**

- « Résume les PR ouvertes sur ce repo », « quels checks ont échoué sur la dernière CI ? ».
- Préparer un commentaire de revue ou une issue à partir du contexte métier déjà dans le chat.

**Capacités typiques**

- Lecture API GitHub v4/v3 ; création ou mise à jour d’issues/PR si autorisé ; déclenchements sensibles souvent derrière **confirmation** (`MCP_WRITE_CONFIRM_TOKEN`).

**Configuration**

- **Port** : **8007**.
- **URL** : `http://mcp-github:8007/mcp`.
- **Variables** : `MCP_GITHUB_TOKEN` (PAT ou fine-grained avec périmètre minimal), `MCP_WRITE_CONFIRM_TOKEN` pour les écritures.

---

## MCP GitLab {#mcp-gitlab}

**Rôle** : **projets**, **issues**, **merge requests** et API GitLab pour une instance **SaaS** ou **self-hosted**.

**Cas d’usage avec TaTi**

- Même famille que GitHub : état des pipelines GitLab, liste des MR, liens avec Jira éventuels côté GitLab.

**Capacités typiques**

- Accès API avec le jeton fourni ; écritures soumises au même type de garde-fou que GitHub selon l’image.

**Configuration**

- **Port** : **8008**.
- **URL** : `http://mcp-gitlab:8008/mcp`.
- **Variables** : `MCP_GITLAB_TOKEN`, `MCP_GITLAB_URL`, confirmation d’écriture comme pour GitHub.

---

## MCP Elasticsearch {#mcp-elasticsearch}

**Rôle** : **recherche plein texte**, interrogation d’**indices**, métadonnées de cluster — selon l’image MCP Elastic et la version du stack.

**Cas d’usage avec TaTi**

- Investiguer des logs ou événements indexés (« erreurs contenant _timeout_ dans les 24 h »).
- Comprendre la cartographie des indices avant une migration ou une purge.

**Capacités typiques**

- Requêtes DSL ou simplifiées ; opérations d’administration **risquées** (suppression d’index, snapshots) si le pont les expose — à réserver aux environnements maîtrisés.

**Configuration**

- **Port hôte** : **8009** (mappé sur **8080** dans le conteneur — URL interne `http://mcp-elasticsearch:8080/mcp`).
- **Variables** : `MCP_ELASTICSEARCH_URL`, clé API ou login/mot de passe, `MCP_ELASTICSEARCH_SSL_SKIP_VERIFY` si besoin.

---

## MCP AWS {#mcp-aws}

**Rôle** : interagir avec les APIs **AWS** (souvent **lecture** : inventaire EC2, Lambda, S3, IAM en introspection limitée — le détail dépend du bridge et des politiques IAM attachées au rôle ou aux clés).

**Cas d’usage avec TaTi**

- « Quelles instances tournent dans cette région ? », « résume les buckets S3 publics signalés » (si le pont et les droits le permettent).
- Aide au diagnostic avant d’ouvrir la console AWS.

**Capacités typiques**

- Appels `Describe*` et listages ; toute **mutation** (stop/start, suppression) doit être traitée comme **hautement sensible** — IAM minimal, compte séparé pour les tests.

**Configuration**

- **Port** : **8012**.
- **URL** : `http://mcp-aws:8012/mcp`.
- **Variables** : `AWS_REGION`, `AWS_PROFILE` ou `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`.

---

## MCP Azure {#mcp-azure}

**Rôle** : **ressources Azure** (Resource Groups, VMs, App Services, etc.) via ARM ou APIs exposées par le pont.

**Cas d’usage avec TaTi**

- Vue d’ensemble d’un environnement staging pour une revue avant déploiement.
- Corrélation entre tickets et ressources nommées de façon prévisible.

**Capacités typiques**

- Lecture de métadonnées et états ; écritures selon bridge — Service Principal avec **rôle Reader** pour limiter les dégâts en exploration.

**Configuration**

- **Port** : **8013**.
- **URL** : `http://mcp-azure:8013/mcp`.
- **Variables** : Service Principal (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`) ou `AZURE_ACCESS_TOKEN` pour des tests ponctuels.

---

## MCP GCP {#mcp-gcp}

**Rôle** : **projet GCP**, **Compute**, **GKE**, stockage, IAM en lecture selon le compte de service fourni.

**Cas d’usage avec TaTi**

- Inventaire rapide des ressources d’un projet pour une question delivery (« où est hébergée l’API X ? »).
- Passerelle vers une doc interne en croisant noms de clusters et namespaces.

**Capacités typiques**

- Appels API GCP en fonction des rôles IAM du JSON de compte de service ; évitez les rôles `Editor` ou `Owner` pour un usage « assistant ».

**Configuration**

- **Port** : **8014**.
- **URL** : `http://mcp-gcp:8014/mcp`.
- **Variables** : `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_SERVICE_ACCOUNT_JSON` (fichier ou secret monté — ne jamais commiter).

---

## MCP Email (SMTP) {#mcp-email}

**Rôle** : **envoyer des e-mails** via SMTP (notifications, résumés d’incident, rapports) — pas de boîte de réception IMAP dans ce périmètre.

**Cas d’usage avec TaTi**

- Envoyer un compte-rendu à une liste fermée après validation dans le chat.
- Alerte « soft » vers une équipe lorsque combiné à une règle métier (toujours avec liste de destinataires contrôlée).

**Capacités typiques**

- Composition d’un message (objet, corps, pièces jointes selon le pont) ; envoi via le relais configuré.

**Configuration**

- **Port** : **8015**.
- **URL** : `http://mcp-email:8015/mcp`.
- **Variables** : `SMTP_HOST`, `SMTP_PORT`, identifiants, **`SMTP_ALLOWED_RECIPIENTS`** pour limiter les destinataires autorisés (indispensable pour éviter l’envoi spam ou erreur du modèle).

---

## MCP Dagster {#mcp-dagster}

**Rôle** : piloter **Dagster** via **GraphQL** : assets, jobs, runs, partitions selon les outils du serveur MCP.

**Cas d’usage avec TaTi**

- « Quel est le dernier run du job _daily_sales_ ? », « liste les assets en échec ».
- Préparer une relance ou une investigation sur un partitionnement après un incident data.

**Capacités typiques**

- Requêtes de lecture sur l’API Dagster ; **mutations** (lancement de run, cancel) si `DAGSTER_ALLOW_MUTATIONS` et les droits du token le permettent.

**Configuration**

- **Port** : **8016**.
- **URL** : `http://mcp-dagster:8016/mcp`.
- **Variables** : `DAGSTER_GRAPHQL_URL`, `DAGSTER_API_TOKEN`, `DAGSTER_ALLOW_MUTATIONS`.

---

## MCP Apache Airflow {#mcp-airflow}

**Rôle** : interroger et piloter **Apache Airflow** via l’**API REST stable** (`/api/v1`) : DAGs, exécutions (dag runs), tâches ; déclenchement ou pause selon configuration.

**Cas d’usage avec TaTi**

- « Liste les DAGs actifs », « quel est l’état du dernier run de `daily_etl` ? », « déclenche une run avec ce `conf` » (si mutations activées).

**Capacités typiques du pont**

- Lecture : liste des DAGs, détail d’un DAG, liste des dag runs, détail d’un run, liste des tâches d’un DAG.
- Écriture (**optionnelle**) : déclencher une run (`AIRFLOW_ALLOW_MUTATIONS=true`), mettre un DAG en pause / le réactiver — uniquement si vous activez explicitement le garde-fou et que le compte Airflow le permet.

**Configuration**

- **Port** : **8017** (`MCP_AIRFLOW_PORT` dans `.env`).
- **URL dans TaTi** : `http://mcp-airflow:8017/mcp` (Compose) ou `http://localhost:8017/mcp` depuis la machine hôte.
- **Variables** :
  - **`AIRFLOW_BASE_URL`** : URL de base du serveur web Airflow (_sans_ `/api/v1`), par ex. `http://host.docker.internal:8080` si Airflow tourne sur la machine hôte, ou `http://airflow-webserver:8080` si le scheduler/webserver est sur le même réseau Docker étendu.
  - **Auth** : **`AIRFLOW_USERNAME`** et **`AIRFLOW_PASSWORD`** (HTTP Basic, recommandé avec un compte dédié lecture / ops selon le besoin). Alternative **`AIRFLOW_API_TOKEN`** si votre déploiement expose un jeton Bearer compatible avec l’API REST.
  - **`AIRFLOW_SSL_VERIFY`** : `true` par défaut ; passez à `false` seulement pour du HTTPS avec certificat auto-signé en environnement de test.
  - **`AIRFLOW_ALLOW_MUTATIONS`** : `false` par défaut (lecture seule). Passez à `true` pour autoriser trigger et pause/unpause via le pont.

**Pièges courants**

- Confondre l’URL du **bridge MCP** (TaTi → `…:8017/mcp`) avec **`AIRFLOW_BASE_URL`** (bridge → API Airflow). Les deux sont nécessaires.
- Droits RBAC Airflow : un utilisateur « lecture seule » ne pourra pas déclencher de runs même si `AIRFLOW_ALLOW_MUTATIONS=true`.

---

## MCP dbt Cloud (Discovery API) {#mcp-dbt}

**Rôle** : interroger les **métadonnées** d’un projet **dbt Cloud** via l’**API Discovery** (GraphQL) : modèles, sources, lignage avancé avec des requêtes personnalisées.

**Cas d’usage avec TaTi**

- « Liste les modèles exposés dans l’environnement X », « quelles sources alimentent ce modèle ? » (via `dbt_discovery_graphql` et la doc du schéma Discovery).

**Capacités typiques du pont**

- **`dbt_discovery_graphql`** : exécute une requête GraphQL Discovery (variables optionnelles).
- **`dbt_list_models`** / **`dbt_list_sources`** : raccourcis sur un **environment** dbt Cloud (ID passé en argument ou via `DBT_CLOUD_ENVIRONMENT_ID`).

**Configuration**

- **Port** : **8018** (`MCP_DBT_PORT`).
- **URL dans TaTi** : `http://mcp-dbt:8018/mcp` (Compose) ou `http://localhost:8018/mcp` depuis la machine hôte.
- **Variables** :
  - **`DBT_CLOUD_DISCOVERY_URL`** : URL GraphQL indiquée dans **dbt Cloud → Account settings → Access URLs** (forme typique multi-tenant : `https://<prefix>.metadata.<region>.dbt.com/graphql`).
  - **`DBT_CLOUD_TOKEN`** : **jeton de service** dbt Cloud autorisé pour l’API Discovery (souvent scope _Metadata_ — suivre la doc dbt).
  - **`DBT_CLOUD_ENVIRONMENT_ID`** : ID numérique de l’**environnement** (facultatif mais pratique pour les outils liste sans argument à chaque appel).
  - **`DBT_SSL_VERIFY`** : `true` par défaut.

**Limites**

- Ce pont cible **dbt Cloud** (Discovery). Pour un projet **dbt Core** local (sans Discovery), utilisez le pont **[MCP dbt Core](#mcp-dbt-core)**.

---

## MCP dbt Core (CLI projet local) {#mcp-dbt-core}

**Rôle** : exécuter le **CLI dbt Core** dans un conteneur sur un **répertoire projet** monté depuis l’hôte (`dbt_project.yml`, modèles, etc.) — `parse`, `ls`, `compile`, lecture partielle du `manifest`, et éventuellement `deps` / `run` / `test` / `build` si vous activez les mutations.

**Cas d’usage avec TaTi**

- « Liste les modèles du projet », « compile ce sous-graphe », « résume le manifest après parse » sans passer par dbt Cloud.

**Capacités typiques du pont**

- **`dbt_core_parse`** / **`dbt_core_ls`** / **`dbt_core_compile`** : toujours disponibles (selon credentials warehouse pour compile/run).
- **`dbt_core_manifest_summary`** : lit `target/manifest.json` après un parse réussi.
- **`dbt_core_deps`**, **`dbt_core_run`**, **`dbt_core_test`**, **`dbt_core_build`** : uniquement si **`DBT_ALLOW_MUTATIONS=true`** (installe paquets, écrit dans le warehouse).

**Configuration**

- **Port** : **8019** (`MCP_DBT_CORE_PORT`).
- **URL dans TaTi** : `http://mcp-dbt-core:8019/mcp` (Compose) ou `http://localhost:8019/mcp` depuis l’hôte.
- **Montage** : **`DBT_CORE_HOST_PROJECT`** pointe vers le dossier du projet dbt sur la machine hôte ; dans le conteneur il est monté sur **`/workspace`** par défaut (`DBT_CORE_PROJECT_DIR`).
- **Variables** : **`DBT_PROFILES_DIR`** (chemin des profiles dans le conteneur si vous montez `profiles.yml` ailleurs), **`DBT_CORE_TARGET`** (équivalent `--target`), **`DBT_ALLOW_MUTATIONS`**.

**Pièges**

- L’image inclut **dbt-postgres** ; pour un autre adaptateur, étendez l’image ou utilisez un montage/outillage adapté.
- `run` / `test` / `build` nécessitent des **identifiants warehouse** valides dans le profile — traitez ce service comme du **contrôle d’exécution**, pas comme une simple lecture de métadonnées.

---

## MCP Grafana {#mcp-grafana}

**Rôle** : serveur MCP **officiel** Grafana — **dashboards**, dossiers, **alertes**, utilisateurs (selon version et périmètre du token de service).

**Cas d’usage avec TaTi**

- « Quel dashboard couvre l’API checkout ? », « résume les alertes actives sur ce dossier ».
- Aide à corréler un incident applicatif avec des panneaux existants sans ouvrir dix onglets.

**Capacités typiques**

- Navigation dans l’organisation Grafana ciblée ; requêtes liées aux UID de dashboards et aux règles d’alerting.

**Configuration**

- **Port** : **8020**.
- **URL** : `http://mcp-grafana:8020/mcp`.
- **Variables** : `MCP_GRAFANA_URL`, `MCP_GRAFANA_SERVICE_ACCOUNT_TOKEN`, `MCP_GRAFANA_ORG_ID` si plusieurs orgs.

---

## MCP Prometheus {#mcp-prometheus}

**Rôle** : exécuter des requêtes **PromQL**, inspecter les **targets**, métadonnées de séries — pour le **monitoring** et le **SRE**.

**Cas d’usage avec TaTi**

- « Quelle est la latence p95 sur _http_requests_ depuis 1 h ? »
- Vérifier si un scrape target est `DOWN` avant de creuser dans les logs.

**Capacités typiques**

- `query` / `query_range` équivalents ; labels et cardinalité à surveiller sur de grosses instances.

**Configuration**

- **Port** : **8021**.
- **URL** : `http://mcp-prometheus:8021/mcp`.
- **Variables** : `MCP_PROMETHEUS_URL`, auth optionnelle, `MCP_PROMETHEUS_SSL_VERIFY`.

---

## MCP Datadog {#mcp-datadog}

**Rôle** : serveur MCP **hébergé par Datadog** (pas de conteneur dans le compose par défaut) — **APM**, **logs**, **métriques**, **RUM** selon le produit activé et les clés.

**Cas d’usage avec TaTi**

- Questions transverses sur un incident : corréler métriques infrastructure et traces applicatives via les APIs exposées par le MCP Datadog.
- Synthèses pour post-mortem sans exporter manuellement des tableaux de bord.

**Capacités typiques**

- Dépend entièrement du contrat du MCP Datadog (version US/EU, endpoints). Les outils agrègent souvent recherche et métadonnées sur spans, logs indexés, etc.

**Configuration**

- **URL** : `MCP_DATADOG_MCP_URL` (site US ou EU).
- **Secrets** : `DD_API_KEY`, `DD_APPLICATION_KEY` souvent passés en **en-têtes** dans l’UI TaTi — voir la documentation Datadog MCP pour les noms exacts des headers.

---

## Google Gmail & Agenda (MCP distants) {#mcp-google}

**Rôle** : accès **Gmail** et **Google Calendar** via les endpoints MCP **hébergés par Google** (pas le même modèle que les conteneurs locaux du compose).

**Cas d’usage avec TaTi**

- Proposer des créneaux ou résumer des threads pour de la coordination d’équipe (en respectant la confidentialité et les politiques internes).
- Préparer des brouillons d’e-mails à valider humainement avant envoi si votre process l’exige.

**Capacités typiques**

- Lecture / envoi selon **scopes OAuth** accordés au projet Google Cloud ; pas d’accès « admin » implicite.

**Configuration**

- **URLs** : `MCP_GMAIL_MCP_URL`, `MCP_GOOGLE_CALENDAR_MCP_URL`.
- **Variables** : `GOOGLE_CLOUD_PROJECT_ID`, flux OAuth (`GOOGLE_OAUTH_*`, `GOOGLE_OAUTH_ACCESS_TOKEN`) selon votre mode d’auth.

Configurez les **headers** dans TaTi si le fournisseur les exige (Bearer, etc.).

---

## MCP Moodle {#mcp-moodle}

**Rôle** : exposer le **plugin MCP** natif Moodle (`.../webservice/mcp/server.php`) pour cours, activités, utilisateurs — selon les capacités du webservice et du token.

**Cas d’usage avec TaTi**

- Assistance pédagogique ou administrative : lister des éléments de cours, états de remise de devoirs (si exposé), sans remplacer le LMS.

**Capacités typiques**

- Dépend de la version Moodle et des fonctions activées sur le service externe ; limitez le rôle du **token** au strict nécessaire (principe du moindre privilège).

**Configuration**

- **Variables** : `MCP_MOODLE_MCP_URL`, `MCP_MOODLE_TOKEN` (souvent `Authorization: Bearer` dans les réglages du serveur MCP côté TaTi).

---

## Dépréciations et alternatives

- **Elasticsearch MCP image** : le fichier `.env.example` signale une évolution côté Elastic ; surveillez les notes de release pour migrer vers les endpoints recommandés.

## Voir aussi

- [Architecture](./architecture.md) — flux entre UI, API et ponts.
- [Configuration](./configuration.md) — liste complète des variables.
- [Sécurité](./security.md) — jetons, lecture seule, réseau.
