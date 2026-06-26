import { Router } from 'express';
import { col, readAll } from '../db.js';

const router = Router();

async function activeSeasonId() {
  const snap = await col('seasons').where('status', '==', 'open').get();
  if (snap.empty) return null;
  return snap.docs.map((d) => d.data().id).sort((a, b) => b - a)[0];
}

router.get('/', async (req, res) => {
  const period = req.query.period;
  const [results, players] = await Promise.all([readAll('results'), readAll('players')]);
  const playerById = new Map(players.map((p) => [p.id, p]));

  let rows = results;
  let seasonId = null;
  if (period === 'all') {
    // sem filtro
  } else if (period === 'month') {
    const ym = new Date().toISOString().slice(0, 7);
    rows = rows.filter((r) => String(r.tournament_date || '').slice(0, 7) === ym);
  } else {
    seasonId = req.query.seasonId ? Number(req.query.seasonId) : await activeSeasonId();
    if (!seasonId) return res.json({ seasonId: null, leaderboard: [] });
    rows = rows.filter((r) => r.season_id === seasonId);
  }

  const agg = new Map();
  for (const r of rows) {
    const e = agg.get(r.player_id) || { points: 0, played: 0, wins: 0, itm: 0, total_prize: 0 };
    e.points += r.points || 0;
    e.played += 1;
    if (r.position === 1) e.wins += 1;
    if (r.prize > 0) e.itm += 1;
    e.total_prize += r.prize || 0;
    agg.set(r.player_id, e);
  }

  const leaderboard = [...agg.entries()]
    .map(([pid, e]) => {
      const p = playerById.get(pid) || {};
      return { id: pid, name: p.name, nickname: p.nickname, suit: p.suit, color: p.color, avatar_url: p.avatar_url, ...e };
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.total_prize - a.total_prize)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  res.json({ seasonId, period: period || 'season', leaderboard });
});

router.get('/head-to-head', async (req, res) => {
  const a = Number(req.query.a);
  const b = Number(req.query.b);
  if (!a || !b) return res.status(400).json({ error: 'Informe os dois jogadores (a e b)' });

  const [results, players] = await Promise.all([readAll('results'), readAll('players')]);
  const pById = new Map(players.map((p) => [p.id, p]));
  if (!pById.has(a) || !pById.has(b)) return res.status(404).json({ error: 'Jogador não encontrado' });

  const line = (id) => {
    const rs = results.filter((r) => r.player_id === id);
    const played = rs.length;
    const p = pById.get(id);
    return {
      id, name: p.name, nickname: p.nickname, suit: p.suit, color: p.color,
      played,
      wins: rs.filter((r) => r.position === 1).length,
      itm: rs.filter((r) => r.prize > 0).length,
      points: rs.reduce((s, r) => s + (r.points || 0), 0),
      total_prize: rs.reduce((s, r) => s + (r.prize || 0), 0),
      avg_position: played ? rs.reduce((s, r) => s + r.position, 0) / played : null,
    };
  };

  // confrontos diretos: torneios em que ambos jogaram
  const byT = new Map();
  for (const r of results) {
    if (r.player_id !== a && r.player_id !== b) continue;
    const e = byT.get(r.tournament_id) || {};
    e[r.player_id === a ? 'a' : 'b'] = r;
    e.name = r.tournament_name;
    e.date = r.tournament_date;
    byT.set(r.tournament_id, e);
  }
  const meetings = [...byT.entries()]
    .filter(([, e]) => e.a && e.b)
    .map(([id, e]) => ({ id, name: e.name, date: e.date, pos_a: e.a.position, pos_b: e.b.position }))
    .sort((x, y) => String(y.date).localeCompare(String(x.date)));

  const record = {
    a: meetings.filter((m) => m.pos_a < m.pos_b).length,
    b: meetings.filter((m) => m.pos_b < m.pos_a).length,
  };
  res.json({ a: line(a), b: line(b), meetings, record });
});

export default router;
