import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireOrganizer, optionalAuth } from '../auth.js';
import { publicPlayer } from '../stats.js';

const router = Router();

// Monta o roster de um torneio: confirmados x lista de espera.
// O status é DERIVADO da ordem de inscrição (created_at): as primeiras `seats`
// inscrições são confirmadas, o restante fica na espera. Assim a promoção ao
// cancelar é automática — basta recalcular na leitura.
function buildRoster(tournamentId, seats) {
  const rows = db
    .prepare(
      `SELECT p.*, rg.created_at AS registered_at
         FROM registrations rg JOIN players p ON p.id = rg.player_id
        WHERE rg.tournament_id = ? ORDER BY rg.created_at, rg.id`
    )
    .all(tournamentId);

  const limit = seats && seats > 0 ? seats : null; // null = vagas ilimitadas
  const confirmed = [];
  const waitlist = [];
  rows.forEach((row, i) => {
    const player = publicPlayer(row);
    player.registered_at = row.registered_at;
    if (limit === null || i < limit) {
      player.status = 'confirmed';
      confirmed.push(player);
    } else {
      player.status = 'waitlist';
      player.queue = i - limit + 1; // posição na fila (1 = próximo a entrar)
      waitlist.push(player);
    }
  });

  return {
    seats: limit,
    total: rows.length,
    confirmedCount: confirmed.length,
    waitlistCount: waitlist.length,
    spotsLeft: limit === null ? null : Math.max(0, limit - confirmed.length),
    isFull: limit !== null && confirmed.length >= limit,
    confirmed,
    waitlist,
  };
}

// Status de um jogador específico no roster.
function playerRosterStatus(roster, playerId) {
  const c = roster.confirmed.find((p) => p.id === playerId);
  if (c) return { status: 'confirmed' };
  const w = roster.waitlist.find((p) => p.id === playerId);
  if (w) return { status: 'waitlist', queue: w.queue };
  return { status: 'none' };
}

// Lobby: lista de torneios. Suporta ?status=scheduled|finished e ?mine=1
router.get('/', optionalAuth, (req, res) => {
  const clauses = [];
  const params = [];
  if (req.query.status) {
    clauses.push('t.status = ?');
    params.push(req.query.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  let rows = db
    .prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM registrations rg WHERE rg.tournament_id = t.id) AS registered,
              (SELECT COUNT(*) FROM results r WHERE r.tournament_id = t.id) AS players_count,
              (SELECT p.name FROM results r JOIN players p ON p.id = r.player_id
                WHERE r.tournament_id = t.id AND r.position = 1 LIMIT 1) AS champion,
              (SELECT SUM(r.prize) FROM results r WHERE r.tournament_id = t.id) AS prize_pool
         FROM tournaments t
         ${where}
         ORDER BY t.date DESC, t.id DESC`
    )
    .all(...params);

  // Filtro "Meus": torneios em que o jogador logado se inscreveu ou pontuou.
  if (req.query.mine === '1' && req.user) {
    const ids = new Set(
      db
        .prepare(
          `SELECT tournament_id FROM registrations WHERE player_id = ?
           UNION SELECT tournament_id FROM results WHERE player_id = ?`
        )
        .all(req.user.id, req.user.id)
        .map((r) => r.tournament_id)
    );
    rows = rows.filter((t) => ids.has(t.id));
  }
  res.json(rows);
});

// Próximo torneio em destaque
router.get('/next', (_req, res) => {
  const row = db
    .prepare(
      `SELECT * FROM tournaments
        WHERE status = 'scheduled'
        ORDER BY date ASC LIMIT 1`
    )
    .get();
  res.json(row || null);
});

// Detalhe de um torneio, com inscritos e resultado final
router.get('/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });
  const roster = buildRoster(t.id, t.seats);
  // registrations flat (confirmados + espera, em ordem) para compatibilidade
  const registrations = [...roster.confirmed, ...roster.waitlist];
  const results = db
    .prepare(
      `SELECT r.*, p.name, p.nickname, p.suit, p.color
         FROM results r JOIN players p ON p.id = r.player_id
        WHERE r.tournament_id = ? ORDER BY r.position ASC`
    )
    .all(req.params.id);
  res.json({ tournament: t, registrations, roster, results });
});

// Inscrição do jogador logado. Se o torneio estiver lotado, entra na lista de espera.
router.post('/:id/register', requireAuth, (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });
  if (t.status !== 'scheduled')
    return res.status(400).json({ error: 'Inscrições encerradas para este torneio' });
  try {
    db.prepare(
      'INSERT INTO registrations (tournament_id, player_id) VALUES (?, ?)'
    ).run(req.params.id, req.user.id);
  } catch {
    return res.status(409).json({ error: 'Você já está inscrito' });
  }
  const roster = buildRoster(t.id, t.seats);
  const me = playerRosterStatus(roster, req.user.id);
  res.status(201).json({ ok: true, ...me, roster });
});

// Cancela a inscrição. Promove automaticamente o primeiro da lista de espera
// (a promoção é implícita: o status é recalculado pela ordem na próxima leitura).
router.delete('/:id/register', requireAuth, (req, res) => {
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });
  db.prepare(
    'DELETE FROM registrations WHERE tournament_id = ? AND player_id = ?'
  ).run(req.params.id, req.user.id);
  const roster = buildRoster(t.id, t.seats);
  res.json({ ok: true, roster });
});

// --- Organizador: criar / editar torneios ---

const FIELDS = [
  'season_id', 'number', 'name', 'kind', 'modality', 'date', 'buy_in',
  'starting_stack', 'blind_structure', 'rebuy', 'seats', 'status',
];

router.post('/', requireAuth, requireOrganizer, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nome do torneio é obrigatório' });
  const cols = FIELDS.filter((f) => f in b);
  const placeholders = cols.map(() => '?').join(', ');
  const info = db
    .prepare(`INSERT INTO tournaments (${cols.join(', ')}) VALUES (${placeholders})`)
    .run(...cols.map((c) => b[c]));
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', requireAuth, requireOrganizer, (req, res) => {
  const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Torneio não encontrado' });
  const b = req.body || {};
  const cols = FIELDS.filter((f) => f in b);
  if (!cols.length) return res.status(400).json({ error: 'Nada para atualizar' });
  db.prepare(`UPDATE tournaments SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
    .run(...cols.map((c) => b[c]), req.params.id);
  const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  res.json(row);
});

export default router;
