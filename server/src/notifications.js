import db from './db.js';

// Cria uma notificação para um jogador. Silencioso se userId for inválido.
export function notify(userId, { type, actorId = null, tournamentId = null, message = null }) {
  if (!userId) return;
  db.prepare(
    `INSERT INTO notifications (user_id, type, actor_id, tournament_id, message)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, type, actorId, tournamentId, message);
}

export function unreadCount(userId) {
  return db
    .prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0')
    .get(userId).c;
}

export function listNotifications(userId, { unreadOnly = false, limit = 40 } = {}) {
  const where = unreadOnly ? 'AND n.read = 0' : '';
  const rows = db
    .prepare(
      `SELECT n.*,
              a.name AS actor_name, a.nickname AS actor_nick, a.avatar AS actor_avatar,
              a.avatar_url AS actor_url, a.suit AS actor_suit, a.color AS actor_color,
              t.name AS tournament_name
         FROM notifications n
         LEFT JOIN players a ON a.id = n.actor_id
         LEFT JOIN tournaments t ON t.id = n.tournament_id
        WHERE n.user_id = ? ${where}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT ?`
    )
    .all(userId, limit);
  return rows.map(shape);
}

function shape(n) {
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    read: !!n.read,
    created_at: n.created_at,
    actor: n.actor_id
      ? {
          id: n.actor_id,
          name: n.actor_name,
          nickname: n.actor_nick,
          avatar: n.actor_avatar,
          avatar_url: n.actor_url,
          suit: n.actor_suit,
          color: n.actor_color,
        }
      : null,
    tournament: n.tournament_id ? { id: n.tournament_id, name: n.tournament_name } : null,
  };
}

export function markRead(userId, ids) {
  if (Array.isArray(ids) && ids.length) {
    const ph = ids.map(() => '?').join(',');
    db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${ph})`).run(
      userId,
      ...ids
    );
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  }
}
