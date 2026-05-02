# Introduction

TaTi est une **plateforme open source** pensée pour les équipes **delivery**, **SRE** et **ops** qui veulent un **copilote IA** branché sur leur toolchain réelle — pas seulement sur du texte générique.

## Problème résolu

Sans contexte, un assistant générique ne peut pas :

- consulter votre état sur **Slack** ou **Discord** ;
- exécuter du **SQL** contrôlé sur **PostgreSQL** ;
- lire votre **catalogue OpenMetadata** ou vos **dashboards Grafana** ;
- ouvrir une **merge request** sur **GitHub** / **GitLab**.

TaTi sert de **couche d’orchestration** : une interface unique où vous configurez des **serveurs MCP** (Model Context Protocol). Chaque pont expose des **outils** que le modèle peut invoquer, avec des URLs et secrets que **vous** maîtrisez.

## Principaux composants

| Élément             | Rôle                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Application web** | Chat, paramètres utilisateurs, liste des MCP, auth locale optionnelle.               |
| **PostgreSQL**      | Persistance applicative (sessions, configuration des serveurs MCP côté produit).     |
| **Services MCP**    | Un processus (ou conteneur) par famille d’outils : voir [Connecteurs MCP](./mcp.md). |

Ce n’est pas un « magasin d’apps » fermé : tout ce qui est dans le dépôt `docker-compose.yml` peut être **activé ou non** selon vos variables `.env` et la disponibilité des jetons.

## Parcours conseillé pour un lecteur pressé

1. **[Démarrage rapide](./quick-start.md)** — faire tourner Postgres + app + quelques MCP en local.
2. **[Architecture](./architecture.md)** — comprendre les flux (navigateur → app → MCP).
3. **[Configuration](./configuration.md)** — stabiliser `.env` (pas de doublons de clés, secrets hors Git).
4. **[Référence MCP](./mcp.md)** — régler chaque connecteur (ports, URL `/mcp`, headers OAuth).

## Glossaire rapide

- **MCP** : protocole ouvert pour exposer des **tools** / **ressources** à un client IA ; TaTi agit comme client (via son backend) vers vos ponts.
- **Streamable HTTP** : transport HTTP utilisé par les ponts du dépôt pour `/mcp`.
- **`DATABASE_URL`** : connexion Postgres **de l’application TaTi** ; distincte de la connexion utilisée par le **MCP Postgres** pour le SQL conversationnel.

---

Ensuite : passez au [démarrage rapide](./quick-start.md) pour les commandes concrètes.
