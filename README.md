# ♠ ♥ ♦ ♣ River Club

Plataforma web para gestão de um **home game de poker presencial**. Registra os
resultados dos torneios e os transforma em **perfis de jogadores personalizáveis**
e em um **ranking de temporada** — o grande diferencial do clube.

> A plataforma **não** inclui jogo online (não há mesas virtuais). "Online" é o
> próprio site: jogadores acessam perfis, estatísticas e ranking pela web. Todos
> os dados vêm dos jogos presenciais, lançados pelo organizador.

Esta entrega cobre as **Fases 1 e 2** do roadmap da especificação:

- **Fase 1 — Base:** cadastro/login (conta única), perfis personalizáveis,
  modelo de dados completo e identidade visual preto/roxo.
- **Fase 2 — Ranking:** painel do organizador, lançamento de resultados, cálculo
  automático de pontos e leaderboard da temporada funcionando ponta a ponta.
- **Fase 3 (parcial) — Lobby de inscrições:**
  - Torneios multi-mesa: **9 pessoas por mesa**, lotação de **18 a 40 vagas**.
    O roster confirmado é agrupado por mesa automaticamente.
  - **Lista de espera:** ao lotar, as inscrições seguintes entram numa fila e a
    promoção é automática quando alguém cancela.
  - **Acesso antecipado VIP:** jogadores marcados como VIP podem se inscrever
    durante uma janela exclusiva, antes da abertura geral do torneio.
- **Lado social:**
  - **Amizades:** pedidos de amizade, aceitar/recusar, lista de amigos e
    diretório de jogadores com busca.
  - **Card de perfil público** com estatísticas, badges e rede de amigos.
  - **Avatares-personagem** (ex.: 🐵 Macaco Mafioso, 🦈 Tubarão, 🃏 Coringa…)
    ou URL de imagem personalizada.

## Stack

| Camada      | Tecnologia                       |
| ----------- | -------------------------------- |
| Frontend    | React + Vite + Tailwind CSS      |
| Backend     | Node.js + Express                |
| Banco       | SQLite (portável para PostgreSQL) |
| Auth        | JWT + bcrypt (conta única)       |

### Por que SQLite agora?

O ambiente de desenvolvimento é efêmero. O SQLite roda sem infraestrutura
externa e o schema (`server/src/schema.sql`) foi escrito de forma portável.
Para migrar a Postgres em produção (como sugere a spec), veja
[`docs/POSTGRES.md`](docs/POSTGRES.md).

## Como rodar

Pré-requisitos: Node 18+.

```bash
# 1. Backend
cd server
npm install
npm run seed     # cria o banco e popula dados de demonstração
npm run dev      # API em http://localhost:4000

# 2. Frontend (em outro terminal)
cd web
npm install
npm run dev      # app em http://localhost:5173
```

O Vite faz proxy de `/api` para o backend, então basta abrir o frontend.

### Contas de demonstração (criadas pelo seed)

| Papel        | E-mail                 | Senha     |
| ------------ | ---------------------- | --------- |
| Organizador  | `admin@riverclub.gg`   | `river123` |
| Jogador      | `arthur@riverclub.gg`  | `river123` |

## Estrutura

```
server/   API Express, regras de pontuação, banco SQLite
  src/
    schema.sql      modelo de dados (jogador, temporada, torneio, resultado)
    db.js           conexão + bootstrap do schema
    scoring.js      cálculo de pontos por posição/participação
    seed.js         dados de demonstração
    routes/         auth, players, seasons, tournaments, ranking, admin
web/      SPA React + Tailwind na identidade preto/roxo
  src/
    pages/          Login, Home/Perfil, EditarPerfil, Ranking, Lobby, Painel
    components/      PlayerCard, Layout, etc.
    context/        AuthContext
```

## Modelo de dados (entidades principais)

- **Jogador** — id, nome, apelido, avatar, naipe, cor, frase, bio, redes. (1:N Resultados)
- **Temporada** — id, nome, início, fim, tabela de pontuação. (1:N Torneios)
- **Torneio** — id, número, data, buy-in, stack, status, temporada_id. (1:N Resultados)
- **Resultado** — id, torneio_id, jogador_id, posição, premiação, pontos, bounties.
- **Ranking** — derivado: soma de pontos por jogador na temporada (calculado).

O modelo já antecipa a **expansão** (torneios em paralelo e cash games): torneios
têm `season_id` e `kind`, e o status comporta sessões contínuas no futuro.
