# River Club no Firebase (nativo)

Esta versão roda **100% no Firebase**, sem servidor próprio:

```
[Firebase Hosting]  →  frontend (web/dist)
        │  /api/**  (rewrite)
        ▼
[Cloud Functions]   →  API Express  →  [Firestore]
```

- **Frontend**: React buildado, servido pelo **Firebase Hosting**.
- **Backend**: a API Express empacotada numa **Cloud Function** (`functions/`),
  com o Firebase Hosting reescrevendo `/api/**` para ela.
- **Banco**: **Firestore** (coleções `players`, `seasons`, `tournaments`,
  `registrations`, `results`, `friendships`, `notifications`, `_counters`).

> O frontend é o mesmo da versão SQLite — a API mantém o mesmo contrato (inclui
> IDs numéricos, preservados via contador em `_counters`).

## Pré-requisitos

```bash
npm install -g firebase-tools
firebase login
```

E registre o projeto (substitui o `.firebaserc`):

```bash
firebase use --add        # escolha seu projeto Firebase, alias "default"
```

> **Plano Blaze:** Cloud Functions exige o plano *Blaze* (pay-as-you-go). O
> free-tier do Blaze costuma cobrir um home game com folga.

## Rodar localmente (emuladores)

```bash
cd functions && npm install && cd ..
cd web && npm install && npm run build && cd ..

# sobe Functions + Firestore + Hosting
firebase emulators:start --only functions,firestore,hosting --project demo-river

# em outro terminal: popular o Firestore do emulador com dados de demo
cd functions
FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=demo-river npm run seed
```

Abra a URL do **Hosting** mostrada pelo emulador (ex.: http://localhost:5050).

## Deploy

```bash
cd web && npm run build && cd ..       # gera web/dist
firebase deploy                        # functions + hosting + regras do Firestore
```

Site no ar em `https://SEU_PROJECT_ID.web.app`.

### Popular dados em produção (opcional)

Para semear o Firestore real com os dados de demonstração, rode o seed apontando
para o projeto (com credenciais de Admin / `GOOGLE_APPLICATION_CREDENTIALS`):

```bash
cd functions
GCLOUD_PROJECT=SEU_PROJECT_ID node seed.js
```

> Em produção, considere remover/trocar as senhas de demonstração.

## Segurança

`firestore.rules` **nega todo acesso direto do cliente** — somente o backend
(Admin SDK nas Functions) lê/escreve no Firestore. A autenticação continua via
JWT próprio (defina `JWT_SECRET` nas variáveis da Function em produção).

## Convivência com a versão SQLite

A pasta `server/` (Express + SQLite, para Docker/Render) continua no repo e
funcional. A versão Firebase vive em `functions/` — escolha um caminho conforme
o deploy. Ambas expõem a mesma API e usam o mesmo frontend.
