# Sécurité & authentification

TaTi combine trois niveaux de réflexion : **qui accède à l’interface**, **quel secret va aux MCP**, et **quelles actions le modèle peut réellement exécuter** sur vos systèmes.

## 1. Auth utilisateur (interface TaTi)

- **`TATI_AUTH_REQUIRED`** — lorsque `true`, les utilisateurs passent par un écran de login avant le chat.
- **`TATI_SESSION_TTL_DAYS`** — durée de vie des sessions ; réduisez-la si les postes sont partagés.

L’auth locale **ne sécurise pas** les MCP par elle-même : si un attaquant atteint le réseau où tournent les ponts MCP, il peut les appeler directement sans passer par TaTi. Mettez les MCP **derrière un firewall** ou un réseau privé.

## 2. Secrets et jetons

| Bon réflexe       | Détail                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| Jamais dans Git   | `.env` reste ignoré ; utilisez des secrets CI pour les pipelines.                      |
| Moindre privilège | Jetons GitHub/GitLab avec scopes minimaux ; bots Slack limités aux canaux nécessaires. |
| Rotation          | Changez les jetons après départ d’un membre ou fuite suspecte.                         |

## 3. Garde-fous d’écriture

Plusieurs ponts distinguent lecture et écriture :

- **PostgreSQL MCP** — `MCP_POSTGRES_READ_ONLY=true` tant que vous n’avez pas validé les usages en écriture.
- **OpenMetadata** — `OPENMETADATA_ALLOW_MUTATIONS` + jeton de confirmation pour les tools sensibles.
- **GitHub / GitLab** — `MCP_WRITE_CONFIRM_TOKEN` : les actions destructrices peuvent exiger une valeur explicite dans l’appel d’outil.

Documentez en interne **qui** a le droit de passer ces garde-fous.

## 4. Réseau et exposition

- N’exposez **pas** les ports MCP sur Internet sans TLS ni ACL.
- Pour OpenMetadata ou Dagster sur `host.docker.internal`, comprenez que le conteneur MCP parle à votre machine hôte — ce chemin doit être maîtrisé.

## 5. Données personnelles et conformité

Si vos conversations ou métadonnées contiennent des données personnelles, adaptez durée de rétention, journalisation et mentions légales selon votre cadre (RGPD, etc.). Ce dépôt ne fournit pas de mapping juridique prêt à l’emploi.

---

Suite logique : [Dépannage](./troubleshooting.md) pour les symptômes réseau et erreurs d’auth.
