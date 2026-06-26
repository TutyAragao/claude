import { col, getDoc, nextId } from './db.js';

export async function notify(userId, { type, actorId = null, tournamentId = null, message = null }) {
  if (!userId) return;
  const id = await nextId('notifications');
  await col('notifications').doc(String(id)).set({
    id,
    user_id: Number(userId),
    type,
    actor_id: actorId != null ? Number(actorId) : null,
    tournament_id: tournamentId != null ? Number(tournamentId) : null,
    message: message || null,
    read: 0,
    created_at: new Date().toISOString(),
  });
}

async function listFor(userId) {
  const snap = await col('notifications').where('user_id', '==', Number(userId)).get();
  const rows = snap.docs.map((d) => d.data());
  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return rows;
}

export async function unreadCount(userId) {
  return (await listFor(userId)).filter((n) => !n.read).length;
}

export async function listNotifications(userId, { unreadOnly = false, limit = 40 } = {}) {
  let rows = await listFor(userId);
  if (unreadOnly) rows = rows.filter((n) => !n.read);
  rows = rows.slice(0, limit);

  // Anexa ator e torneio (poucos itens — leitura pontual).
  return Promise.all(
    rows.map(async (n) => {
      const actor = n.actor_id ? await getDoc('players', n.actor_id) : null;
      const tournament = n.tournament_id ? await getDoc('tournaments', n.tournament_id) : null;
      return {
        id: n.id,
        type: n.type,
        message: n.message,
        read: !!n.read,
        created_at: n.created_at,
        actor: actor
          ? {
              id: actor.id,
              name: actor.name,
              nickname: actor.nickname,
              avatar: actor.avatar,
              avatar_url: actor.avatar_url,
              suit: actor.suit,
              color: actor.color,
            }
          : null,
        tournament: tournament ? { id: tournament.id, name: tournament.name } : null,
      };
    })
  );
}

export async function markRead(userId, ids) {
  const rows = await listFor(userId);
  const set = Array.isArray(ids) && ids.length ? new Set(ids.map(Number)) : null;
  const batch = col('notifications').firestore.batch();
  for (const n of rows) {
    if (!n.read && (!set || set.has(n.id))) {
      batch.update(col('notifications').doc(String(n.id)), { read: 1 });
    }
  }
  await batch.commit();
}
