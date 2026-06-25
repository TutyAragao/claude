import db from './db.js';
import { publicPlayer } from './stats.js';

// Amigos confirmados de um jogador (relação aceita em qualquer sentido).
export function friendsOf(playerId) {
  const rows = db
    .prepare(
      `SELECT p.* FROM friendships f
         JOIN players p ON p.id = CASE
             WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
        WHERE f.status = 'accepted'
          AND (f.requester_id = ? OR f.addressee_id = ?)
          AND p.active = 1
        ORDER BY p.name`
    )
    .all(playerId, playerId, playerId);
  return rows.map(publicPlayer);
}

export function friendCount(playerId) {
  return db
    .prepare(
      `SELECT COUNT(*) c FROM friendships
        WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
    )
    .get(playerId, playerId).c;
}

// Relação entre o jogador "me" e "other":
//  none | friends | outgoing (me pedi) | incoming (me receberam)
export function relationship(meId, otherId) {
  if (Number(meId) === Number(otherId)) return 'self';
  const row = db
    .prepare(
      `SELECT * FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?)
           OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(meId, otherId, otherId, meId);
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === Number(meId) ? 'outgoing' : 'incoming';
}

// Pedidos pendentes recebidos por "me".
export function incomingRequests(playerId) {
  const rows = db
    .prepare(
      `SELECT p.*, f.created_at AS requested_at FROM friendships f
         JOIN players p ON p.id = f.requester_id
        WHERE f.addressee_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC`
    )
    .all(playerId);
  return rows.map((r) => ({ ...publicPlayer(r), requested_at: r.requested_at }));
}
