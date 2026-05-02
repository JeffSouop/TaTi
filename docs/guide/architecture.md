# Architecture {#architecture}

Ce document décrit **comment TaTi est structuré** quand vous le faites tourner avec le dépôt officiel : base de données applicative, serveur web, ponts MCP et configuration utilisateur.

## Vue d’ensemble

![Architecture TaTi — navigateur, application TanStack / Vite SSR, PostgreSQL, ponts MCP](/tati_architecture_diagram.svg)

_Légende : flux HTTP vers l’application ; SQL vers Postgres (données applicatives) ; MCP en HTTP streamable vers les ponts (Slack, Postgres, GitHub, OM…). La légende du schéma distingue présentation, logique métier, données et MCP._

## Couche applicative

- **Frontend + SSR** : interface de chat, paramètres (dont **Serveurs MCP**), écran de login si `TATI_AUTH_REQUIRED=true`.
- **API** : les sessions utilisateur et la liste des URLs MCP activées sont persistées côté serveur (schéma défini dans le dépôt, migrations éventuelles via scripts ou déploiement).
- **`DATABASE_URL`** : chaîne Postgres utilisée **par l’application** — distincte de `MCP_POSTGRES_DATABASE_URL` qui sert uniquement au **serveur MCP Postgres** pour exécuter du SQL au nom du modèle.

## Couche MCP

Chaque connecteur est un **processus séparé** (souvent un conteneur Docker) qui implémente le protocole MCP sur HTTP (transport « streamable »). Dans les réglages TaTi, vous enregistrez :

- une **URL de base** pointant vers le chemin `/mcp` (ou l’URL officielle du fournisseur pour Gmail, Datadog, etc.) ;
- éventuellement des **en-têtes** (jetons API, clés Datadog, Bearer Moodle, OAuth Google…).

Quand l’utilisateur envoie un message dans le chat, l’application peut invoquer ces serveurs selon la configuration et les outils exposés par chaque pont.

### Réseau Docker

Sur un même `docker-compose.yml`, les services se résolvent par **nom** :

- Exemple : `http://mcp-postgres:8002/mcp` depuis le conteneur `app`.
- Depuis votre machine hôte (tests avec `curl`), utilisez `http://localhost:<port>/mcp` et le port défini dans `.env` (`MCP_*_PORT`).

## Fichiers et sécurité des ponts « fichiers »

Le service **MCP Filesystem** monte un répertoire hôte (`./` du projet en dev) dans le conteneur sous `FILESYSTEM_ROOT` (souvent `/workspace`). Toute lecture / écriture est limitée à cette racine : pensez à la verrouiller en production (volume dédié, permissions OS).

## Auth locale

L’authentification **ne remplace pas** la sécurité réseau des MCP : même avec login utilisateur, les services MCP doivent rester sur un réseau privé ou derrière un firewall. Les sessions utilisateur sont pilotées par `TATI_SESSION_TTL_DAYS` et le mécanisme du dépôt (cookies / stockage côté serveur).

## Prochaines lectures

- [Démarrage rapide](./quick-start.md) — enchaîner les commandes concrètes.
- [Connecteurs MCP](./mcp.md) — référence par service.
- [Configuration](./configuration.md) — toutes les variables d’environnement groupées.
