import { col, getDoc } from './db.js';
import { publicPlayer } from './stats.js';

// Amizades aceitas envolvendo o jogador (em qualquer sentido).
async function acceptedFriendships(playerId) {
  const pid = Number(playerId);
  const [a, b] = await Promise.all([
    col('friendships').where('requester_id', '==', pid).where('status', '==', 'accepted').get(),
    col('friendships').where('addressee_id', '==', pid).where('status', '==', 'accepted').get(),
  ]);
  return [...a.docs, ...b.docs].map((d) => d.data());
}

export async function friendsOf(playerId) {
  const pid = Number(playerId);
  const rels = await acceptedFriendships(pid);
  const otherIds = rels.map((f) => (f.requester_id === pid ? f.addressee_id : f.requester_id));
  const players = await Promise.all(otherIds.map((id) => getDoc('players', id)));
  return players
    .filter((p) => p && p.active)
    .map(publicPlayer)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function friendCount(playerId) {
  return (await acceptedFriendships(playerId)).length;
}

// Relação entre "me" e "other": none|friends|outgoing|incoming|self
export async function relationship(meId, otherId) {
  if (Number(meId) === Number(otherId)) return 'self';
  const f = await friendshipBetween(meId, otherId);
  if (!f) return 'none';
  if (f.status === 'accepted') return 'friends';
  return f.requester_id === Number(meId) ? 'outgoing' : 'incoming';
}

// Documento de amizade entre dois jogadores (em qualquer sentido), ou null.
export async function friendshipBetween(aId, bId) {
  const a = Number(aId);
  const b = Number(bId);
  const [r1, r2] = await Promise.all([
    col('friendships').where('requester_id', '==', a).where('addressee_id', '==', b).get(),
    col('friendships').where('requester_id', '==', b).where('addressee_id', '==', a).get(),
  ]);
  const doc = r1.docs[0] || r2.docs[0];
  return doc ? doc.data() : null;
}

export async function incomingRequests(playerId) {
  const snap = await col('friendships')
    .where('addressee_id', '==', Number(playerId))
    .where('status', '==', 'pending')
    .get();
  const rows = snap.docs.map((d) => d.data());
  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const players = await Promise.all(
    rows.map(async (f) => ({ player: await getDoc('players', f.requester_id), at: f.created_at }))
  );
  return players
    .filter((x) => x.player)
    .map((x) => ({ ...publicPlayer(x.player), requested_at: x.at }));
}
