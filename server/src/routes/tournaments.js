import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireOrganizer, optionalAuth } from '../auth.js';
import { publicPlayer } from '../stats.js';

const router = Router();

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
  const registrations = db
    .prepare(
      `SELECT p.* FROM registrations rg JOIN players p ON p.id = rg.player_id
        WHERE rg.tournament_id = ? ORDER BY rg.created_at`
    )
    .all(req.params.id)
    .map(publicPlayer);
  const results = db
    .prepare(
      `SELECT r.*, p.name, p.nickname, p.suit, p.color
         FROM results r JOIN players p ON p.id = r.player_id
        WHERE r.tournament_id = ? ORDER BY r.position ASC`
    )
    .all(req.params.id);
  res.json({ tournament: t, registrations, results });
});

// Inscrição do jogador logado
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
  res.status(201).json({ ok: true });
});

router.delete('/:id/register', requireAuth, (req, res) => {
  db.prepare(
    'DELETE FROM registrations WHERE tournament_id = ? AND player_id = ?'
  ).run(req.params.id, req.user.id);
  res.json({ ok: true });
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
