import { Router } from 'express';
import db from '../db.js';

const router = Router();

function resolveSeasonId(query) {
  if (query.seasonId) return Number(query.seasonId);
  const s = db
    .prepare("SELECT id FROM seasons WHERE status = 'open' ORDER BY id DESC LIMIT 1")
    .get();
  return s?.id ?? null;
}

// Leaderboard derivado: soma de pontos por jogador.
// ?seasonId=N  -> temporada específica
// ?period=all  -> histórico (all-time, ignora temporada)
// ?period=month-> mês corrente
router.get('/', (req, res) => {
  const period = req.query.period;
  const params = [];
  let timeFilter = '';

  if (period === 'all') {
    // sem filtro de temporada nem data
  } else if (period === 'month') {
    timeFilter = "AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')";
  } else {
    const seasonId = resolveSeasonId(req.query);
    if (!seasonId) return res.json({ seasonId: null, leaderboard: [] });
    timeFilter = 'AND t.season_id = ?';
    params.push(seasonId);
  }

  const leaderboard = db
    .prepare(
      `SELECT p.id, p.name, p.nickname, p.suit, p.color, p.avatar_url,
              SUM(r.points)                         AS points,
              COUNT(*)                              AS played,
              SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END) AS wins,
              SUM(CASE WHEN r.prize > 0 THEN 1 ELSE 0 END)    AS itm,
              SUM(r.prize)                          AS total_prize
         FROM results r
         JOIN tournaments t ON t.id = r.tournament_id
         JOIN players p ON p.id = r.player_id
        WHERE 1 = 1 ${timeFilter}
        GROUP BY p.id
        ORDER BY points DESC, wins DESC, total_prize DESC`
    )
    .all(...params)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  res.json({
    seasonId: period === 'all' || period === 'month' ? null : resolveSeasonId(req.query),
    period: period || 'season',
    leaderboard,
  });
});

// Comparação head-to-head entre dois jogadores
router.get('/head-to-head', (req, res) => {
  const a = Number(req.query.a);
  const b = Number(req.query.b);
  if (!a || !b) return res.status(400).json({ error: 'Informe os dois jogadores (a e b)' });

  const line = (id) =>
    db
      .prepare(
        `SELECT p.id, p.name, p.nickname, p.suit, p.color,
                COUNT(r.id) AS played,
                SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN r.prize > 0 THEN 1 ELSE 0 END) AS itm,
                COALESCE(SUM(r.points), 0) AS points,
                COALESCE(SUM(r.prize), 0) AS total_prize,
                AVG(r.position) AS avg_position
           FROM players p
           LEFT JOIN results r ON r.player_id = p.id
          WHERE p.id = ?
          GROUP BY p.id`
      )
      .get(id);

  const pa = line(a);
  const pb = line(b);
  if (!pa || !pb) return res.status(404).json({ error: 'Jogador não encontrado' });

  // Confrontos diretos: torneios em que ambos jogaram
  const common = db
    .prepare(
      `SELECT t.id, t.name, t.date,
              ra.position AS pos_a, rb.position AS pos_b
         FROM results ra
         JOIN results rb ON rb.tournament_id = ra.tournament_id
         JOIN tournaments t ON t.id = ra.tournament_id
        WHERE ra.player_id = ? AND rb.player_id = ?
        ORDER BY t.date DESC`
    )
    .all(a, b);

  const aWins = common.filter((c) => c.pos_a < c.pos_b).length;
  const bWins = common.filter((c) => c.pos_b < c.pos_a).length;

  res.json({ a: pa, b: pb, meetings: common, record: { a: aWins, b: bWins } });
});

export default router;
