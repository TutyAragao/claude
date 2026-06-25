import db from './db.js';
import { friendsOf } from './social.js';

// Constrói o feed de atividades DERIVANDO dos dados existentes (resultados e
// amizades). Detecta recordes percorrendo o histórico em ordem cronológica.
//
// Tipos de evento:
//   win            -> jogador venceu um torneio
//   first_win      -> primeira vitória na carreira do jogador
//   record_prize   -> novo recorde de premiação do clube
//   record_points  -> novo recorde de pontos num único torneio (clube)
//   friendship     -> dois jogadores viraram amigos
export function buildFeed({ scope = 'all', viewerId = null, limit = 50 } = {}) {
  const events = [];

  // --- Resultados (em ordem cronológica para detectar recordes) ---
  const rows = db
    .prepare(
      `SELECT r.id AS result_id, r.player_id, r.position, r.prize, r.points, r.stack_end,
              t.id AS tid, t.name AS tname, t.date AS tdate,
              p.name, p.nickname, p.avatar, p.avatar_url, p.suit, p.color
         FROM results r
         JOIN tournaments t ON t.id = r.tournament_id
         JOIN players p ON p.id = r.player_id
        WHERE t.status = 'finished'
        ORDER BY t.date ASC, t.id ASC, r.position ASC`
    )
    .all();

  let clubMaxPrize = 0;
  let clubMaxPoints = 0;
  let clubMaxStack = 0;
  const hasWon = new Set();

  for (const r of rows) {
    const actor = shapePlayer(r);
    const tournament = { id: r.tid, name: r.tname };
    const date = r.tdate;

    // Recorde de premiação do clube
    if (r.prize > 0 && r.prize > clubMaxPrize) {
      clubMaxPrize = r.prize;
      events.push({
        id: `recprize-${r.result_id}`,
        type: 'record_prize',
        date,
        actor,
        tournament,
        amount: r.prize,
      });
    }
    // Recorde de pontos num torneio (clube)
    if (r.points > 0 && r.points > clubMaxPoints) {
      clubMaxPoints = r.points;
      events.push({
        id: `recpts-${r.result_id}`,
        type: 'record_points',
        date,
        actor,
        tournament,
        amount: r.points,
      });
    }
    // Recorde de maior stack final (clube)
    if (r.stack_end > 0 && r.stack_end > clubMaxStack) {
      clubMaxStack = r.stack_end;
      events.push({
        id: `recstack-${r.result_id}`,
        type: 'record_stack',
        date,
        actor,
        tournament,
        amount: r.stack_end,
      });
    }
    // Vitória / primeira vitória
    if (r.position === 1) {
      const first = !hasWon.has(r.player_id);
      hasWon.add(r.player_id);
      events.push({
        id: `win-${r.result_id}`,
        type: first ? 'first_win' : 'win',
        date,
        actor,
        tournament,
        amount: r.prize,
      });
    }
  }

  // --- Amizades ---
  const friendships = db
    .prepare(
      `SELECT f.id, COALESCE(f.responded_at, f.created_at) AS date,
              ra.id AS a_id, ra.name AS a_name, ra.nickname AS a_nick, ra.avatar AS a_avatar,
              ra.avatar_url AS a_url, ra.suit AS a_suit, ra.color AS a_color,
              ad.id AS b_id, ad.name AS b_name, ad.nickname AS b_nick, ad.avatar AS b_avatar,
              ad.avatar_url AS b_url, ad.suit AS b_suit, ad.color AS b_color
         FROM friendships f
         JOIN players ra ON ra.id = f.requester_id
         JOIN players ad ON ad.id = f.addressee_id
        WHERE f.status = 'accepted'`
    )
    .all();

  for (const f of friendships) {
    events.push({
      id: `friend-${f.id}`,
      type: 'friendship',
      date: f.date,
      actor: {
        id: f.a_id, name: f.a_name, nickname: f.a_nick,
        avatar: f.a_avatar, avatar_url: f.a_url, suit: f.a_suit, color: f.a_color,
      },
      other: {
        id: f.b_id, name: f.b_name, nickname: f.b_nick,
        avatar: f.b_avatar, avatar_url: f.b_url, suit: f.b_suit, color: f.b_color,
      },
    });
  }

  // --- Filtro de escopo (somente amigos + você) ---
  let filtered = events;
  if (scope === 'friends' && viewerId) {
    const ids = new Set(friendsOf(viewerId).map((p) => p.id));
    ids.add(Number(viewerId));
    filtered = events.filter(
      (e) => ids.has(e.actor.id) || (e.other && ids.has(e.other.id))
    );
  }

  filtered.sort((a, b) => ts(b.date) - ts(a.date));
  return filtered.slice(0, limit);
}

function shapePlayer(r) {
  return {
    id: r.player_id,
    name: r.name,
    nickname: r.nickname,
    avatar: r.avatar,
    avatar_url: r.avatar_url,
    suit: r.suit,
    color: r.color,
  };
}

// Parse tolerante: aceita ISO ('...T...') e 'YYYY-MM-DD HH:MM:SS'.
function ts(value) {
  if (!value) return 0;
  const v = value.includes('T') ? value : value.replace(' ', 'T');
  const n = Date.parse(v);
  return Number.isNaN(n) ? 0 : n;
}
