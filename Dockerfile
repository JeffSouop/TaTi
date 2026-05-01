# =============================================================================
# Dockerfile multi-stage pour l'app TanStack Start
#   - stage `dev`  : bun run dev (hot reload, volume monté)
#   - stage `prod` : bun run build + serveur statique via `vite preview`
# =============================================================================

# --- base ---------------------------------------------------------------------
FROM oven/bun:latest AS base
WORKDIR /app
ENV NODE_ENV=development

# --- deps ---------------------------------------------------------------------
FROM base AS deps
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

# --- dev ----------------------------------------------------------------------
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# --- builder (pour prod) ------------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- prod ---------------------------------------------------------------------
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
# `vite build` produit `dist/` (client + serveur) ; pas de répertoire `.output` avec la config actuelle.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
# Build cible Cloudflare Worker : demarrer le runtime wrangler local en prod self-hosted.
CMD ["bunx", "wrangler", "dev", "--config", "dist/server/wrangler.json", "--ip", "0.0.0.0", "--port", "3000"]
