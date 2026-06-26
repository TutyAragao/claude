import { col, getDoc, nextId } from './db.js';

// Helpers de acesso a jogadores reutilizados pelas rotas.
export async function playerByEmail(email) {
  const snap = await col('players').where('email', '==', String(email).toLowerCase()).limit(1).get();
  return snap.empty ? null : snap.docs[0].data();
}

export async function getPlayer(id) {
  return getDoc('players', id);
}

export async function createPlayer({ name, email, password_hash, role = 'player', vip = 0, avatar = null }) {
  const id = await nextId('players');
  const doc = {
    id,
    email: String(email).toLowerCase(),
    password_hash,
    role,
    active: 1,
    vip: vip ? 1 : 0,
    name: String(name).trim(),
    nickname: null,
    avatar_url: null,
    avatar,
    suit: 'spade',
    color: '#9D4EDD',
    phrase: null,
    bio: null,
    socials: '{}',
    theme: 'dark',
    created_at: new Date().toISOString(),
  };
  await col('players').doc(String(id)).set(doc);
  return doc;
}

export async function updatePlayer(id, fields) {
  await col('players').doc(String(id)).set(fields, { merge: true });
  return getPlayer(id);
}
