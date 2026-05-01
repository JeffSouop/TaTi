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

## Documentation

La documentation complete (architecture, connecteurs MCP, administration, CI/CD, securite, troubleshooting, etc.) est maintenue dans la documentation web du projet.

En attendant la version finale du portail docs:

- [Releases](https://github.com/JeffSouop/TaTi/releases)
- [Actions](https://github.com/JeffSouop/TaTi/actions)
- [Issues](https://github.com/JeffSouop/TaTi/issues)

## Licence

Voir le fichier de licence du depot.
