import { readAll } from './db.js';
import { friendsOf } from './social.js';

// Feed derivado dos dados (resultados denormalizados + amizades). Mesmos tipos
// de evento da versão SQLite. Resultados já trazem nome/data do torneio e o
// status (finished) do torneio no momento do lançamento.
export async function buildFeed({ scope = 'all', viewerId = null, limit = 50 } = {}) {
  const [results, players, friendships] = await Promise.all([
    readAll('results'),
    readAll('players'),
    readAll('friendships'),
  ]);
  const playerById = new Map(players.map((p) => [p.id, p]));

  // ordem cronológica para detectar recordes
  const rows = results
    .filter((r) => r.tournament_status === 'finished')
    .sort((a, b) => tsd(a.tournament_date) - tsd(b.tournament_date) || a.position - b.position);

  const events = [];
  let clubMaxPrize = 0;
  let clubMaxPoints = 0;
  let clubMaxStack = 0;
  const hasWon = new Set();

  for (const r of rows) {
    const p = playerById.get(r.player_id);
    if (!p) continue;
    const actor = shape(p);
    const tournament = { id: r.tournament_id, name: r.tournament_name };
    const date = r.tournament_date;

    if (r.prize > 0 && r.prize > clubMaxPrize) {
      clubMaxPrize = r.prize;
      events.push({ id: `recprize-${r.id}`, type: 'record_prize', date, actor, tournament, amount: r.prize });
    }
    if (r.points > 0 && r.points > clubMaxPoints) {
      clubMaxPoints = r.points;
      events.push({ id: `recpts-${r.id}`, type: 'record_points', date, actor, tournament, amount: r.points });
    }
    if (r.stack_end > 0 && r.stack_end > clubMaxStack) {
      clubMaxStack = r.stack_end;
      events.push({ id: `recstack-${r.id}`, type: 'record_stack', date, actor, tournament, amount: r.stack_end });
    }
    if (r.position === 1) {
      const first = !hasWon.has(r.player_id);
      hasWon.add(r.player_id);
      events.push({ id: `win-${r.id}`, type: first ? 'first_win' : 'win', date, actor, tournament, amount: r.prize });
    }
  }

  for (const f of friendships) {
    if (f.status !== 'accepted') continue;
    const a = playerById.get(f.requester_id);
    const b = playerById.get(f.addressee_id);
    if (!a || !b) continue;
    events.push({
      id: `friend-${f.id}`,
      type: 'friendship',
      date: f.responded_at || f.created_at,
      actor: shape(a),
      other: shape(b),
    });
  }

  let filtered = events;
  if (scope === 'friends' && viewerId) {
    const ids = new Set((await friendsOf(viewerId)).map((p) => p.id));
    ids.add(Number(viewerId));
    filtered = events.filter((e) => ids.has(e.actor.id) || (e.other && ids.has(e.other.id)));
  }

  filtered.sort((a, b) => tsd(b.date) - tsd(a.date));
  return filtered.slice(0, limit);
}

function shape(p) {
  return {
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    avatar: p.avatar,
    avatar_url: p.avatar_url,
    suit: p.suit,
    color: p.color,
  };
}

function tsd(v) {
  if (!v) return 0;
  const s = v.includes('T') ? v : v.replace(' ', 'T');
  const n = Date.parse(s);
  return Number.isNaN(n) ? 0 : n;
}
