import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireOrganizer, hashPassword } from '../auth.js';
import { publicPlayer } from '../stats.js';
import { pointsFor } from '../scoring.js';

const router = Router();
router.use(requireAuth, requireOrganizer);

// Visão geral (KPIs)
router.get('/overview', (_req, res) => {
  const season = db
    .prepare("SELECT * FROM seasons WHERE status = 'open' ORDER BY id DESC LIMIT 1")
    .get();
  const activePlayers = db.prepare('SELECT COUNT(*) c FROM players WHERE active = 1').get().c;
  const tournamentsInSeason = season
    ? db.prepare('SELECT COUNT(*) c FROM tournaments WHERE season_id = ?').get(season.id).c
    : 0;
  const prizePaid = season
    ? db
        .prepare(
          `SELECT COALESCE(SUM(r.prize),0) s FROM results r
             JOIN tournaments t ON t.id = r.tournament_id
            WHERE t.season_id = ?`
        )
        .get(season.id).s
    : 0;
  // Jogadores "na mesa do dia": inscritos no próximo torneio agendado
  const next = db
    .prepare("SELECT id FROM tournaments WHERE status IN ('scheduled','running') ORDER BY date ASC LIMIT 1")
    .get();
  const atTable = next
    ? db.prepare('SELECT COUNT(*) c FROM registrations WHERE tournament_id = ?').get(next.id).c
    : 0;

  res.json({
    season: season ? { id: season.id, name: season.name } : null,
    kpis: { activePlayers, tournamentsInSeason, prizePaid, atTable },
  });
});

// Gerenciar jogadores: criar (cadastro pelo organizador)
router.post('/players', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  const exists = db.prepare('SELECT 1 FROM players WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });
  const info = db
    .prepare(`INSERT INTO players (email, password_hash, name, role, vip) VALUES (?, ?, ?, ?, ?)`)
    .run(
      email.toLowerCase(),
      hashPassword(password),
      name.trim(),
      role === 'organizer' ? 'organizer' : 'player',
      req.body.vip ? 1 : 0
    );
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(publicPlayer(row));
});

// Editar / ativar / desativar jogador
router.put('/players/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Jogador não encontrado' });
  const b = req.body || {};
  const fields = [];
  const values = [];
  for (const key of ['name', 'nickname', 'role']) {
    if (key in b) { fields.push(`${key} = ?`); values.push(b[key]); }
  }
  if ('active' in b) { fields.push('active = ?'); values.push(b.active ? 1 : 0); }
  if ('vip' in b) { fields.push('vip = ?'); values.push(b.vip ? 1 : 0); }
  if (b.password) { fields.push('password_hash = ?'); values.push(hashPassword(b.password)); }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });
  values.push(req.params.id);
  db.prepare(`UPDATE players SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  res.json(publicPlayer(row));
});

// ---- FLUXO CENTRAL: lançar resultado de um torneio ----
// Recebe a lista de jogadores em ordem de classificação (posição = índice + 1),
// com premiação e bounties opcionais. Calcula os pontos pela tabela da temporada,
// grava os resultados (substituindo os anteriores) e marca o torneio como finished.
// Ao salvar, ranking e perfis passam a refletir automaticamente os novos pontos.
router.post('/tournaments/:id/results', (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneio não encontrado' });

  const entries = Array.isArray(req.body?.results) ? req.body.results : [];
  if (!entries.length) return res.status(400).json({ error: 'Envie ao menos um resultado' });

  // Tabela de pontuação da temporada do torneio
  const season = tournament.season_id
    ? db.prepare('SELECT * FROM seasons WHERE id = ?').get(tournament.season_id)
    : db.prepare("SELECT * FROM seasons WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();
  const scoring = season?.scoring_table;

  const normalized = entries.map((e, i) => {
    const position = Number(e.position ?? i + 1);
    const bounties = Number(e.bounties || 0);
    // Pontos: calculados pela posição (tabela da temporada), mas o organizador
    // pode enviar um valor manual que sobrescreve o automático.
    const hasOverride =
      e.points !== undefined && e.points !== null && e.points !== '' && !Number.isNaN(Number(e.points));
    const points = hasOverride
      ? Number(e.points)
      : pointsFor({ position, bounties }, scoring);
    return {
      player_id: Number(e.player_id),
      position,
      prize: Number(e.prize || 0),
      bounties,
      points,
    };
  });

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM results WHERE tournament_id = ?').run(tournament.id);
    const ins = db.prepare(
      `INSERT INTO results (tournament_id, player_id, position, prize, points, bounties)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const r of normalized) {
      ins.run(tournament.id, r.player_id, r.position, r.prize, r.points, r.bounties);
    }
    db.prepare("UPDATE tournaments SET status = 'finished' WHERE id = ?").run(tournament.id);
  });
  tx();

  const results = db
    .prepare(
      `SELECT r.*, p.name, p.nickname FROM results r
         JOIN players p ON p.id = r.player_id
        WHERE r.tournament_id = ? ORDER BY r.position`
    )
    .all(tournament.id);
  res.status(201).json({ ok: true, results });
});

export default router;
