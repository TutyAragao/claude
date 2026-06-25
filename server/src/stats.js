import db from './db.js';

// Remove campos sensíveis e faz parse de JSON antes de devolver um jogador.
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
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

// Estatísticas do jogador, calculadas a partir dos resultados lançados.
// Opcionalmente restritas a uma temporada (seasonId).
export function playerStats(playerId, seasonId = null) {
  const params = [playerId];
  let seasonFilter = '';
  if (seasonId) {
    seasonFilter = ' AND t.season_id = ?';
    params.push(seasonId);
  }

  const rows = db
    .prepare(
      `SELECT r.position, r.prize, r.points, r.bounties, t.buy_in
         FROM results r
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.player_id = ?${seasonFilter}`
    )
    .all(...params);

  const played = rows.length;
  const wins = rows.filter((r) => r.position === 1).length;
  const itm = rows.filter((r) => r.prize > 0).length;
  const totalPrize = rows.reduce((s, r) => s + r.prize, 0);
  const totalBuyIns = rows.reduce((s, r) => s + (r.buy_in || 0), 0);
  const bounties = rows.reduce((s, r) => s + (r.bounties || 0), 0);
  const maxPrize = rows.reduce((m, r) => Math.max(m, r.prize), 0);
  const avgPosition = played
    ? rows.reduce((s, r) => s + r.position, 0) / played
    : null;
  const points = rows.reduce((s, r) => s + r.points, 0);
  // ROI = (premiação - buy-ins) / buy-ins
  const roi = totalBuyIns > 0 ? (totalPrize - totalBuyIns) / totalBuyIns : null;

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
    rankPosition: seasonId ? rankPosition(playerId, seasonId) : null,
  };
}

// Posição atual do jogador no ranking de uma temporada.
export function rankPosition(playerId, seasonId) {
  const row = db
    .prepare(
      `WITH totals AS (
         SELECT r.player_id, SUM(r.points) AS pts
           FROM results r
           JOIN tournaments t ON t.id = r.tournament_id
          WHERE t.season_id = ?
          GROUP BY r.player_id
       )
       SELECT COUNT(*) + 1 AS rank
         FROM totals
        WHERE pts > (SELECT pts FROM totals WHERE player_id = ?)`
    )
    .get(seasonId, playerId);
  // Se o jogador não tem pontos na temporada, não está ranqueado.
  const has = db
    .prepare(
      `SELECT 1 FROM results r JOIN tournaments t ON t.id = r.tournament_id
        WHERE t.season_id = ? AND r.player_id = ? LIMIT 1`
    )
    .get(seasonId, playerId);
  return has ? row.rank : null;
}

// Conquistas (badges) atribuídas automaticamente a partir dos resultados.
export function playerBadges(playerId, seasonId = null) {
  const params = [playerId];
  let seasonFilter = '';
  if (seasonId) {
    seasonFilter = ' AND t.season_id = ?';
    params.push(seasonId);
  }
  const rows = db
    .prepare(
      `SELECT r.position, r.prize, t.date
         FROM results r
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.player_id = ?${seasonFilter}
        ORDER BY t.date ASC, t.id ASC`
    )
    .all(...params);

  const badges = [];
  const wins = rows.filter((r) => r.position === 1).length;
  if (wins >= 1) badges.push({ key: 'champion', label: 'Campeão', icon: '🏆' });
  if (wins >= 3) badges.push({ key: 'serial-winner', label: 'Tricampeão', icon: '👑' });

  // Sequência de ITM (3 seguidos)
  let streak = 0;
  let bestStreak = 0;
  for (const r of rows) {
    if (r.prize > 0) streak += 1;
    else streak = 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  if (bestStreak >= 3)
    badges.push({ key: 'itm-streak', label: '3 ITM seguidos', icon: '🔥' });

  // Bubble boy: eliminado logo após a zona de premiação (posição mais baixa sem prêmio)
  const bubbled = rows.some((r) => r.prize === 0 && r.position <= 5);
  if (bubbled)
    badges.push({ key: 'bubble-boy', label: 'Bubble Boy', icon: '🫧' });

  return badges;
}
