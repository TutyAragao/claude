# Migração SQLite → PostgreSQL

A spec sugere PostgreSQL em produção. Esta entrega usa **SQLite** para rodar sem
infraestrutura no ambiente de desenvolvimento, mas o modelo foi escrito de forma
portável. Abaixo, o caminho para promover a Postgres.

## 1. Equivalência de tipos

| SQLite (atual)              | PostgreSQL                         |
| --------------------------- | ---------------------------------- |
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGSERIAL PRIMARY KEY` (ou `GENERATED ALWAYS AS IDENTITY`) |
| `TEXT` com JSON (`socials`, `scoring_table`) | `JSONB` |
| `TEXT` com data ISO-8601    | `TIMESTAMPTZ` |
| `REAL`                      | `NUMERIC(12,2)` (valores monetários) |
| `INTEGER` booleano (`active`) | `BOOLEAN` |
| `datetime('now')`           | `now()` |

O arquivo [`server/src/schema.sql`](../server/src/schema.sql) tem comentários
apontando cada caso.

## 2. Trocar o driver

Hoje o acesso passa por um único ponto: [`server/src/db.js`](../server/src/db.js),
que usa `better-sqlite3` (API **síncrona**). As queries vivem em
`server/src/routes/*` e `server/src/stats.js`.

Para Postgres, troque o driver por `pg` e exponha o mesmo formato de retorno.
Como o `pg` é assíncrono, as funções de query passam a retornar `Promise` — os
handlers de rota precisam virar `async` e usar `await`. Recomendado encapsular:

```js
// db.js (Postgres)
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const query = (sql, params) => pool.query(sql, params).then((r) => r.rows);
```

> Alternativa de menor esforço: adotar um ORM/query builder (Prisma, Knex,
> Drizzle) que abstrai os dois bancos com a mesma API.

## 3. Placeholders

SQLite usa `?`. Postgres usa `$1, $2, …`. Ao migrar as queries, renumere os
placeholders (ou use um builder que cuide disso).

## 4. Configuração

Defina `DATABASE_URL` no ambiente do backend (Railway/Render, como sugere a spec)
e remova o `DB_PATH` do SQLite. O `seed.js` pode ser adaptado para popular o
Postgres com os mesmos dados de demonstração.

## 5. O que NÃO muda

- O contrato da API (`/api/...`) permanece idêntico — o frontend não muda.
- As regras de pontuação (`scoring.js`) e o cálculo de estatísticas
  (`stats.js`) são lógica de aplicação e migram sem alteração.
