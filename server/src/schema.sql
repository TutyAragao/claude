-- River Club — modelo de dados
-- Escrito de forma portável para PostgreSQL. Tipos SQLite usados aqui:
--   INTEGER PRIMARY KEY  -> em Postgres vira  SERIAL / BIGSERIAL PRIMARY KEY
--   TEXT (JSON)          -> em Postgres pode virar  JSONB
--   datas em TEXT ISO-8601-> em Postgres pode virar  TIMESTAMPTZ
-- Ver docs/POSTGRES.md para o caminho de migração.

PRAGMA foreign_keys = ON;

-- Jogadores (conta única: acesso web + identidade presencial)
CREATE TABLE IF NOT EXISTS players (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'player',   -- 'player' | 'organizer'
  active        INTEGER NOT NULL DEFAULT 1,
  -- perfil personalizável
  name          TEXT NOT NULL,
  nickname      TEXT,                              -- apelido de mesa
  avatar_url    TEXT,
  suit          TEXT DEFAULT 'spade',              -- spade|heart|diamond|club
  color         TEXT DEFAULT '#9D4EDD',            -- cor de destaque
  phrase        TEXT,                              -- frase de mesa
  bio           TEXT,
  socials       TEXT DEFAULT '{}',                 -- JSON { instagram, twitter, ... }
  vip           INTEGER NOT NULL DEFAULT 0,        -- acesso antecipado a inscrições
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Temporadas (cada uma tem sua tabela de pontuação configurável)
CREATE TABLE IF NOT EXISTS seasons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  start_date    TEXT,
  end_date      TEXT,
  status        TEXT NOT NULL DEFAULT 'open',      -- 'open' | 'closed'
  scoring_table TEXT NOT NULL,                     -- JSON { positions:{}, participation, bountyPoints }
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Torneios presenciais
CREATE TABLE IF NOT EXISTS tournaments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id       INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  number          INTEGER,
  name            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'tournament', -- 'tournament' | 'cash' (expansão futura)
  modality        TEXT DEFAULT 'Texas Hold''em',
  date            TEXT,                                -- ISO datetime
  buy_in          REAL DEFAULT 0,
  starting_stack  INTEGER DEFAULT 0,
  blind_structure TEXT,                                -- texto livre / JSON
  rebuy           TEXT,                                -- regras de re-buy/add-on
  seats           INTEGER,                             -- vagas/lotação (9 por mesa, 18..40)
  vip_opens_at    TEXT,                                -- abertura das inscrições para VIPs
  opens_at        TEXT,                                -- abertura geral das inscrições
  status          TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled|running|finished
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Inscrições (jogadores inscritos num torneio, antes do resultado)
CREATE TABLE IF NOT EXISTS registrations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tournament_id, player_id)
);

-- Resultados lançados pelo organizador
CREATE TABLE IF NOT EXISTS results (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL,
  prize         REAL NOT NULL DEFAULT 0,
  points        INTEGER NOT NULL DEFAULT 0,
  bounties      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_results_tournament ON results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_results_player ON results(player_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_id);

-- Ranking NÃO é tabela: é derivado da soma de pontos por jogador na temporada.
-- Ver server/src/routes/ranking.js
