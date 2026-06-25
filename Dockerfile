# ─── Estágio 1: build do frontend ───────────────────────────────
FROM node:22-bookworm-slim AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ─── Estágio 2: servidor + frontend buildado ────────────────────
FROM node:22-bookworm-slim AS server
# Ferramentas para compilar o better-sqlite3 (módulo nativo)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ ./
# Frontend buildado no caminho esperado pelo servidor (../web/dist)
COPY --from=web /app/web/dist /app/web/dist

ENV NODE_ENV=production
ENV PORT=4000
# Banco em volume persistente (ver docker-compose / render.yaml)
ENV DB_PATH=/data/river-club.db
ENV SEED_ON_START=true

EXPOSE 4000
CMD ["node", "src/index.js"]
