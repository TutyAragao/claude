# Hospedar o River Club no Firebase Hosting

> **Importante:** o Firebase Hosting serve **só o frontend** (site estático). A
> **API** (Node/Express) precisa rodar à parte — o jeito mais simples é o
> Render, que já está configurado no repo (ver [`DEPLOY.md`](./DEPLOY.md)).
>
> Você **não precisa "adicionar um Web App"** no Firebase para hospedar: isso só
> é necessário se o site usar o SDK do Firebase (Auth/Firestore), o que ainda
> não é o caso. Para hospedar, basta o **Firebase Hosting**.

## Visão geral

```
[Firebase Hosting]  →  frontend (web/dist)
        |
        |  chamadas /api  ─────────►  [Render]  →  backend Node/Express + SQLite
```

## Passo 1 — Suba o backend (uma vez)

Siga o [`DEPLOY.md`](./DEPLOY.md) (Render Blueprint). No final você terá uma URL,
algo como `https://river-club.onrender.com`. Guarde-a.

## Passo 2 — Configure o frontend para apontar ao backend

Crie `web/.env` (copie de `web/.env.example`) com a URL do backend:

```
VITE_API_URL=https://river-club.onrender.com
```

## Passo 3 — Buildar e publicar no Firebase Hosting

```bash
# instale a CLI, se ainda não tiver
npm install -g firebase-tools
firebase login

# associe ao SEU projeto (substitui o .firebaserc)
firebase use --add        # escolha seu projeto e dê o alias "default"

# build do frontend
cd web && npm ci && npm run build && cd ..

# publica
firebase deploy --only hosting
```

Pronto: o site abre na URL do Firebase Hosting
(`https://SEU_PROJECT_ID.web.app`).

`firebase.json` e `.firebaserc` já estão no repo — só ajuste o `SEU_PROJECT_ID`
no `.firebaserc` (ou use `firebase use --add`).

---

## (Opcional) "Adicionar um Web App" — quando faz sentido

Se você quiser de fato registrar um **Web App** no Firebase (Configurações do
projeto → Seus apps → Web) e usar serviços do SDK, faz sentido quando formos
para a versão **Firebase nativa**: trocar o backend por **Cloud Functions** e o
banco por **Firestore** (ou **Firebase Auth** no lugar do JWT). Esse é um
trabalho maior (reescrita do data layer) — se quiser seguir por aí, me avise que
eu faço a migração e aí sim usamos o `firebaseConfig` do Web App.

## (Opcional) Tudo no Google: backend no Cloud Run

Dá para manter o frontend no Firebase Hosting e o backend no **Cloud Run**
(roda o `Dockerfile` do repo). O Hosting pode até reescrever `/api/**` para o
serviço do Cloud Run. Tem custo conforme uso e exige billing habilitado.
