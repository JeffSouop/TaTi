# Démarrage rapide

Ce guide vous permet d’avoir **TaTi + Postgres + ponts MCP** en route avec **Docker Compose**. Deux contextes courants :

1. **Sans cloner le dépôt** — vous téléchargez uniquement `docker-compose.dist.yml` + `.env.example` (images pré‑buildées GHCR).
2. **Avec le dépôt cloné** — vous utilisez le `docker-compose.yml` de développement (build local de l’app, hot reload).

## Prérequis

- **Docker** et **Docker Compose v2** installés.
- Au moins **4 Go RAM** libres si vous lancez plusieurs MCP en parallèle (Elasticsearch, Grafana… consomment davantage).

## Option A — Distribution « dist » (sans clone)

Idéal pour tester rapidement une release publiée sur le registre GitHub (`ghcr.io`).

```bash
mkdir tati && cd tati
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/JeffSouop/TaTi/main/docker-compose.dist.yml
curl -fsSL -o .env.example https://raw.githubusercontent.com/JeffSouop/TaTi/main/.env.example
cp .env.example .env
```

### Ce que vous devez éditer dans `.env`

Au minimum :

| Variable                                 | Pourquoi                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                      | Sécuriser la base ; doit correspondre à `DATABASE_URL`.                 |
| `TATI_IMAGE_REGISTRY` / `TATI_IMAGE_TAG` | Pointer vers les images publiées (`ghcr.io/<owner>/…`, tag de release). |
| `APP_PORT`                               | Port où vous joignez l’UI dans le navigateur.                           |

Ensuite : activez les MCP dont vous avez les jetons (Slack, GitHub, etc.) — sans jeton, certains conteneurs peuvent redémarrer en boucle ou rester inutilisables.

```bash
docker compose pull
docker compose up -d
```

Ouvrez `http://localhost:${APP_PORT:-3000}` (ou la valeur que vous avez mise dans `APP_PORT`). Une fois connecté, vous arrivez sur l’accueil de l’application — voir un **aperçu visuel** dans [Introduction — Aperçu de l’interface](./introduction.md#interface-apercu).

---

## Option B — Développement depuis le dépôt cloné

Idéal pour contribuer au code ou déboguer.

```bash
git clone https://github.com/JeffSouop/TaTi.git
cd TaTi
cp .env.example .env
# Éditer .env — au minimum DATABASE_URL cohérent avec Postgres compose
```

Installez les dépendances JS (sur l’hôte) si vous lancez aussi Vite hors Docker :

```bash
npm install
```

Lancez la stack Compose du repo :

```bash
docker compose up -d
```

- Le fichier **`docker-compose.yml`** mappe l’app sur **`5173:8080`** : ouvrez **`http://localhost:5173`** pour l’UI en mode dev conteneurisé (commande `bun run dev` dans le service `app`).
- Les services MCP sont exposés sur les ports définis dans `.env` (`MCP_*_PORT`).

Pour arrêter :

```bash
docker compose down
```

(`docker compose down -v` supprime aussi le volume Postgres — **perte de données**.)

---

## Vérifications rapides

1. **Postgres** : `docker compose ps` → service `postgres` « healthy ».
2. **Application** : logs `docker compose logs -f app` → pas d’erreur de connexion DB.
3. **Un MCP** : depuis l’hôte, testez `curl -sS -o /dev/null -w "%{http_code}" http://localhost:8002/mcp` (Postgres MCP) — vous pouvez obtenir une erreur méthode POST attendue, mais pas « connection refused ».

---

## Étape suivante

- Déploiement plus robuste : [Déploiement](./deployment.md).
- Détail de chaque variable : [Configuration](./configuration.md).
- Brancher les outils : [Connecteurs MCP](./mcp.md).
