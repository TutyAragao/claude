# Deploy do River Club

A aplicação é empacotada como **um único serviço**: o servidor Express serve a
API em `/api/*` e também o frontend buildado (SPA) em produção.

## Opção A — Docker (local ou qualquer host com Docker)

```bash
# build + run (SQLite em volume persistente, com seed inicial)
docker compose up --build
# app em http://localhost:4000
```

O `docker-compose.yml` já inclui um serviço **PostgreSQL** desligado por padrão
(perfil `postgres`), pronto para a migração futura:

```bash
docker compose --profile postgres up --build
```

Variáveis relevantes:

| Variável        | Padrão                       | Descrição                                  |
| --------------- | ---------------------------- | ------------------------------------------ |
| `PORT`          | `4000`                       | porta do servidor                          |
| `JWT_SECRET`    | —                            | **defina em produção** (assina os tokens)  |
| `DB_PATH`       | `/data/river-club.db`        | caminho do SQLite (use um volume)          |
| `SEED_ON_START` | `true` (Docker)              | popula dados de demo se o banco estiver vazio |
| `WEB_DIST`      | `../web/dist`                | pasta do frontend buildado                 |
| `DATABASE_URL`  | —                            | reservada para o Postgres (ver abaixo)     |

## Opção B — Render (1 clique via Blueprint)

O repositório traz um `render.yaml`. No [Render](https://render.com):

1. **New → Blueprint** e aponte para este repositório.
2. O Render cria um Web Service (Docker) com **disco persistente** em `/data`
   para o SQLite e gera o `JWT_SECRET` automaticamente.
3. Health check já configurado em `/api/health`.

> Hosts equivalentes (Railway, Fly.io, Koyeb) funcionam com o mesmo Dockerfile.
> Garanta um **volume/disco persistente** montado em `/data`.

## Build manual (sem Docker)

```bash
cd web && npm ci && npm run build      # gera web/dist
cd ../server && npm ci
NODE_ENV=production JWT_SECRET=algo-secreto npm start
# o servidor detecta web/dist e serve o SPA
```

## PostgreSQL

A aplicação roda hoje em **SQLite** (simples e persistente em volume — suficiente
para a escala de um home game). O caminho para promover a Postgres está em
[`POSTGRES.md`](./POSTGRES.md): o acesso a dados está isolado em
`server/src/db.js`, e o `docker-compose.yml` já provê a instância Postgres.
