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

## Aperçu de l’interface {#interface-apercu}

### Écran de connexion {#interface-connexion}

Lorsque l’**authentification locale** est activée (`TATI_AUTH_REQUIRED`), la première page affiche le formulaire **Connexion** (email, mot de passe), le logo TaTi et une zone latérale de présentation (visuels / messages produit).

![TaTi — écran de connexion](/screenshots/app-ecran-connexion.png)

### Accueil après connexion {#interface-accueil}

Une fois connecté, l’**accueil** regroupe le fil de conversation, la barre latérale (nouveau chat, liste des discussions, profil, **serveurs MCP** actifs, paramètres) et une zone centrale de présentation du produit (version, accès rapide à une conversation et à la configuration).

![TaTi — écran d’accueil après connexion (barre latérale, accueil, raccourcis)](/screenshots/app-accueil-apres-login.png)

### Paramètres — Providers IA {#interface-parametres-providers}

L’écran **Paramètres** permet notamment de **configurer les fournisseurs de modèles** (Claude, OpenAI, Mistral, Ollama, etc.) : clés API, modèle par défaut, température, itérations max d’outils, ainsi que le **provider par défaut** (badge « Par défaut »). Les autres onglets du même écran couvrent les **serveurs MCP**, le **compte**, les **utilisateurs** et un **démarrage rapide** intégré.

![TaTi — Paramètres, onglet Providers IA](/screenshots/app-parametres-providers-ia.png)

_Captures indicatives ; thème, libellés et disposition des onglets peuvent évoluer selon la version._

### Nouveau serveur MCP — presets {#interface-presets-mcp}

Lorsque vous ajoutez un serveur depuis **Paramètres → Serveurs MCP**, la fenêtre **Nouveau serveur MCP** affiche une grille de **presets** : intégrations prêtes à l’emploi (bases de données, clouds, messagerie, observabilité, etc.). Les réglages fins (URL, secrets, ports Compose) sont décrits dans la **[référence Connecteurs MCP](./mcp.md)**.

![TaTi — Nouveau serveur MCP, grille des presets](/screenshots/app-nouveau-serveur-mcp-presets.png)

_Capture indicative ; la liste des presets peut évoluer selon la version._

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
