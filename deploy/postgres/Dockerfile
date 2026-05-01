# Image Postgres TaTi avec schéma initial (évite de monter ./db depuis l'hôte).
FROM postgres:16-alpine
COPY db/init.sql /docker-entrypoint-initdb.d/01-init.sql
