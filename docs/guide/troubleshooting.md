# Dépannage

Symptômes fréquents lors du premier déploiement ou après une mise à jour — et pistes **ordonnées** pour gagner du temps.

## L’application ne répond pas ou erreur 502

1. `docker compose ps` — le service `app` est-il **Up** ?
2. `docker compose logs app --tail 200` — erreur **`DATABASE_URL`** ou migration ?
3. Depuis l’hôte, Postgres est-il joignable au même host/port que dans `DATABASE_URL` ?

## « Connection refused » vers un MCP

1. Le service existe : `docker compose ps | grep mcp`.
2. Le port dans `.env` correspond au mapping (`MCP_*_PORT`).
3. L’URL dans TaTi utilise le **bon nom DNS** :
   - depuis le conteneur app : `http://mcp-postgres:8002/mcp` ;
   - depuis votre navigateur pour un test manuel : `http://localhost:8002/mcp` (souvent POST uniquement — un GET peut retourner 405, ce qui est normal).

## Variables `.env` qui semblent ignorées

- Cherchez les **doublons** : deux lignes `TATI_AUTH_REQUIRED` → la dernière gagne.
- Après modification de `.env`, redémarrez : `docker compose up -d --force-recreate`.
- Vérifiez que vous éditez le `.env` **au même endroit** que le `docker-compose.yml` que vous exécutez.

## OpenMetadata ou Dagster « unreachable »

Les URLs pointent souvent vers `host.docker.internal` : cela ne fonctionne que si :

- vous êtes sur Docker Desktop (Mac/Windows) ou une stack où ce hostname est résolu ;
- le service cible (OpenMetadata, Dagster) écoute bien sur l’interface attendue.

Sur Linux pur, remplacez par l’IP de l’hôte ou une route Docker `extra_hosts`.

## Elasticsearch MCP ne démarre pas

Vérifiez `MCP_ELASTICSEARCH_URL` et les credentials ; l’image officielle peut refuser de démarrer sans cluster joignable. Consultez les logs `docker compose logs mcp-elasticsearch`.

## Slack / GitHub « unauthorized »

- Jeton expiré ou révoqué — régénérez dans la console du fournisseur.
  -Scopes insuffisants — augmentez les permissions **minimalement** nécessaires.

## Besoin d’aide communautaire

- [Issues GitHub](https://github.com/JeffSouop/TaTi/issues) — joignez version / tag d’image, extrait de logs **sans secrets**.
- [Actions CI](https://github.com/JeffSouop/TaTi/actions) — vérifier si un problème est déjà traité sur `main`.
