// Popula o Firestore com os dados de demonstração (mesmos da versão SQLite).
// Rode contra o emulador:
//   FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=demo-river node seed.js
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-river';

import { col, db, nextId } from './src/db.js';
import { hashPassword } from './src/auth.js';
import { DEFAULT_SCORING, pointsFor } from './src/scoring.js';

const PASSWORD = 'river123';

async function clear(name) {
  const snap = await col(name).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function setDoc(name, id, data) {
  await col(name).doc(String(id)).set({ id, ...data });
}

async function seed() {
  for (const c of ['_counters', 'players', 'seasons', 'tournaments', 'registrations', 'results', 'friendships', 'notifications']) {
    await clear(c);
  }

  const pwd = hashPassword(PASSWORD);
  const players = [
    { email: 'admin@riverclub.gg', name: 'Marina Souza', nickname: 'Dealer', role: 'organizer', suit: 'spade', color: '#9D4EDD', phrase: 'A casa sempre organiza.', bio: 'Organizadora do River Club.', vip: 1, avatar: 'coringa' },
    { email: 'arthur@riverclub.gg', name: 'Arthur Lima', nickname: 'River', role: 'player', suit: 'heart', color: '#E5384B', phrase: 'Sempre tem uma última carta.', bio: 'Especialista em virar a mão no river.', vip: 1, avatar: 'tubarao' },
    { email: 'bia@riverclub.gg', name: 'Beatriz Nunes', nickname: 'Bluff', role: 'player', suit: 'diamond', color: '#3FA7FF', phrase: 'Eu nunca blefo. (blefo)', bio: '', vip: 1, avatar: 'raposa' },
    { email: 'caio@riverclub.gg', name: 'Caio Ferreira', nickname: 'All-in', role: 'player', suit: 'club', color: '#2ECC71', phrase: 'Pra que esperar?', bio: '', vip: 0, avatar: 'macaco-mafioso' },
    { email: 'dani@riverclub.gg', name: 'Daniela Rocha', nickname: 'Ice', role: 'player', suit: 'spade', color: '#F1C40F', phrase: 'Sangue frio.', bio: '', vip: 0, avatar: 'lobo' },
    { email: 'edu@riverclub.gg', name: 'Eduardo Pires', nickname: 'Chip', role: 'player', suit: 'heart', color: '#FF7F50', phrase: 'Contando fichas.', bio: '', vip: 0, avatar: 'urso' },
  ];
  const ids = [];
  for (const p of players) {
    const id = await nextId('players');
    await setDoc('players', id, {
      email: p.email, password_hash: pwd, role: p.role, active: 1, vip: p.vip,
      name: p.name, nickname: p.nickname, avatar_url: null, avatar: p.avatar,
      suit: p.suit, color: p.color, phrase: p.phrase, bio: p.bio, socials: '{}',
      theme: 'dark', created_at: new Date().toISOString(),
    });
    ids.push(id);
  }
  const playerIds = ids.slice(1);

  const seasonId = await nextId('seasons');
  await setDoc('seasons', seasonId, {
    name: 'Temporada 2026', start_date: '2026-01-01', end_date: '2026-12-31',
    status: 'open', scoring_table: DEFAULT_SCORING, created_at: new Date().toISOString(),
  });

  const STACK_START = 20000;
  const STACK_END = [45000, 28000, 15000, 8000, 4000];
  const finished = [
    { number: 1, name: 'Mini Torneio #1', date: '2026-03-15T20:00:00', buy_in: 50, order: [1, 0, 3, 2, 4], prizes: [300, 180, 90, 0, 0] },
    { number: 2, name: 'Mini Torneio #2', date: '2026-04-19T20:00:00', buy_in: 50, order: [0, 2, 1, 4, 3], prizes: [300, 180, 90, 0, 0] },
  ];
  for (const t of finished) {
    const tid = await nextId('tournaments');
    await setDoc('tournaments', tid, {
      season_id: seasonId, number: t.number, name: t.name, kind: 'tournament',
      modality: "Texas Hold'em", date: t.date, buy_in: t.buy_in, starting_stack: 20000,
      blind_structure: '20min / nível', seats: null, vip_opens_at: null, opens_at: null,
      status: 'finished', created_at: new Date().toISOString(),
    });
    for (let idx = 0; idx < t.order.length; idx++) {
      const position = idx + 1;
      const prize = t.prizes[idx] || 0;
      const bounties = position === 1 ? 2 : position === 2 ? 1 : 0;
      const points = pointsFor({ position, bounties }, DEFAULT_SCORING);
      const rid = await nextId('results');
      await setDoc('results', rid, {
        tournament_id: tid, tournament_name: t.name, tournament_number: t.number,
        tournament_date: t.date, tournament_status: 'finished', season_id: seasonId, buy_in: t.buy_in,
        player_id: playerIds[t.order[idx]], position, prize, points, bounties,
        stack_start: STACK_START, stack_end: STACK_END[idx] || 0,
      });
    }
  }

  const nextId3 = await nextId('tournaments');
  await setDoc('tournaments', nextId3, {
    season_id: seasonId, number: 3, name: 'Mini Torneio #3', kind: 'tournament',
    modality: "Texas Hold'em", date: '2026-07-12T20:00:00', buy_in: 50, starting_stack: 20000,
    blind_structure: '20min / nível', seats: 18,
    vip_opens_at: '2026-06-20T12:00:00', opens_at: '2026-07-01T12:00:00',
    status: 'scheduled', created_at: new Date().toISOString(),
  });
  for (const pid of [playerIds[0], playerIds[1]]) {
    const rid = await nextId('registrations');
    await setDoc('registrations', rid, { tournament_id: nextId3, player_id: pid, created_at: new Date().toISOString() });
  }

  const [A, B, C, D, E] = playerIds;
  const friends = [
    [A, B, 'accepted'], [A, C, 'accepted'], [B, D, 'accepted'], [D, A, 'pending'], [E, A, 'pending'],
  ];
  for (const [r, a, status] of friends) {
    const fid = await nextId('friendships');
    await setDoc('friendships', fid, {
      requester_id: r, addressee_id: a, status,
      created_at: new Date().toISOString(), responded_at: status === 'accepted' ? new Date().toISOString() : null,
    });
  }

  for (const actor of [D, E]) {
    const nid = await nextId('notifications');
    await setDoc('notifications', nid, {
      user_id: A, type: 'friend_request', actor_id: actor, tournament_id: null,
      message: null, read: 0, created_at: new Date().toISOString(),
    });
  }

  console.log('✓ Seed Firestore concluído.');
  console.log(`  Organizador: admin@riverclub.gg / ${PASSWORD}`);
  console.log(`  Jogador:     arthur@riverclub.gg / ${PASSWORD}`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
