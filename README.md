# TaTi

TaTi est une plateforme open source de copilote IA orientee delivery/ops, connectee a des services externes via MCP (Model Context Protocol).

## Lancer rapidement (self-hosted)

Prerequis:

- Docker + Docker Compose v2

Installation minimale:

```bash
mkdir tati && cd tati
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/JeffSouop/TaTi/main/docker-compose.dist.yml
curl -fsSL -o .env.example https://raw.githubusercontent.com/JeffSouop/TaTi/main/.env.example
cp .env.example .env
# editer .env
docker compose pull
docker compose up -d
```

Application:

- http://localhost:3000

## Licence

Voir le fichier de licence du depot.
