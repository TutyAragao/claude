import { col, readAll } from './db.js';

// Remove campos sensíveis e normaliza tipos antes de devolver um jogador.
export function publicPlayer(row) {
  if (!row) return null;
  const { password_hash, socials, active, vip, ...rest } = row;
  return {
    ...rest,
    active: !!active,
    vip: !!vip,
    socials: safeParse(socials, {}),
  };
}

function safeParse(value, fallback) {
  if (value && typeof value === 'object') return value;
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

// Resultados de um jogador (com season filter opcional). Os documentos de
// result já trazem season_id, buy_in, nome/data do torneio (denormalizados).
async function resultsForPlayer(playerId, seasonId = null) {
  const snap = await col('results').where('player_id', '==', Number(playerId)).get();
  let rows = snap.docs.map((d) => d.data());
  if (seasonId) rows = rows.filter((r) => r.season_id === Number(seasonId));
  return rows;
}

export async function playerStats(playerId, seasonId = null) {
  const rows = await resultsForPlayer(playerId, seasonId);

  const played = rows.length;
  const wins = rows.filter((r) => r.position === 1).length;
  const itm = rows.filter((r) => r.prize > 0).length;
  const totalPrize = rows.reduce((s, r) => s + (r.prize || 0), 0);
  const totalBuyIns = rows.reduce((s, r) => s + (r.buy_in || 0), 0);
  const bounties = rows.reduce((s, r) => s + (r.bounties || 0), 0);
  const maxPrize = rows.reduce((m, r) => Math.max(m, r.prize || 0), 0);
  const avgPosition = played ? rows.reduce((s, r) => s + r.position, 0) / played : null;
  const points = rows.reduce((s, r) => s + (r.points || 0), 0);
  const roi = totalBuyIns > 0 ? (totalPrize - totalBuyIns) / totalBuyIns : null;
  const bestStack = rows.reduce((m, r) => Math.max(m, r.stack_end || 0), 0);
  const netChips = rows.reduce((s, r) => s + ((r.stack_end || 0) - (r.stack_start || 0)), 0);

  return {
    played,
    wins,
    itm,
    itmRate: played ? itm / played : 0,
    roi,
    totalPrize,
    maxPrize,
    avgPosition,
    bounties,
    points,
    bestStack,
    netChips,
    rankPosition: seasonId ? await rankPosition(playerId, seasonId) : null,
  };
}

// Posição do jogador no ranking de uma temporada (ou null se não pontuou).
export async function rankPosition(playerId, seasonId) {
  const all = await readAll('results');
  const totals = new Map();
  for (const r of all) {
    if (r.season_id !== Number(seasonId)) continue;
    totals.set(r.player_id, (totals.get(r.player_id) || 0) + (r.points || 0));
  }
  if (!totals.has(Number(playerId))) return null;
  const mine = totals.get(Number(playerId));
  let rank = 1;
  for (const pts of totals.values()) if (pts > mine) rank += 1;
  return rank;
}

// Conquistas atribuídas automaticamente a partir dos resultados.
export async function playerBadges(playerId, seasonId = null) {
  const rows = (await resultsForPlayer(playerId, seasonId)).sort(
    (a, b) => tsd(a.tournament_date) - tsd(b.tournament_date)
  );

  const badges = [];
  const wins = rows.filter((r) => r.position === 1).length;
  if (wins >= 1) badges.push({ key: 'champion', label: 'Campeão', icon: '🏆' });
  if (wins >= 3) badges.push({ key: 'serial-winner', label: 'Tricampeão', icon: '👑' });

  let streak = 0;
  let best = 0;
  for (const r of rows) {
    streak = r.prize > 0 ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  if (best >= 3) badges.push({ key: 'itm-streak', label: '3 ITM seguidos', icon: '🔥' });

  if (rows.some((r) => r.prize === 0 && r.position <= 5))
    badges.push({ key: 'bubble-boy', label: 'Bubble Boy', icon: '🫧' });

  return badges;
}

function tsd(v) {
  if (!v) return 0;
  const s = v.includes('T') ? v : v.replace(' ', 'T');
  const n = Date.parse(s);
  return Number.isNaN(n) ? 0 : n;
}
