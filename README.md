# TaTi — Self-hosted

Application TanStack Start + Postgres + pont MCP OpenMetadata, packagée pour
tourner intégralement en local via Docker Compose.

## Pré-requis

- Docker + Docker Compose v2
- (optionnel) Node 20+ / Bun si tu veux lancer hors Docker

## Démarrage rapide

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

Services :
- App (dev)→ http://localhost:5173
- Postgres → localhost:5432 (user/pass dans .env)
- MCP-OM   → http://localhost:8001/mcp
- MCP-PG   → http://localhost:8002/mcp
- MCP-PDF  → http://localhost:8003/mcp

Configuration recommandée dans l'interface TaTi (Serveurs MCP) :
- PostgreSQL → `http://mcp-postgres:8002/mcp` (car l'app tourne dans Docker)
- PDF Generator → `http://mcp-pdf:8003/mcp`

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

## Restaurer les données depuis Lovable Cloud

Si tu as exporté tes tables en CSV depuis Lovable :

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
```
