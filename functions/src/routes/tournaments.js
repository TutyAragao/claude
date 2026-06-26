import { Router } from 'express';
import { col, getDoc, nextId, readAll } from '../db.js';
import { requireAuth, requireOrganizer, optionalAuth } from '../auth.js';
import { publicPlayer } from '../stats.js';
import { SEATS_PER_TABLE, SEATS_MIN, SEATS_MAX, tablesFor } from '../config.js';
import { notify } from '../notifications.js';

const router = Router();

async function playersByIds(ids) {
  const uniq = [...new Set(ids.map(Number))];
  const docs = await Promise.all(uniq.map((id) => getDoc('players', id)));
  const map = new Map();
  docs.forEach((d) => d && map.set(d.id, d));
  return map;
}

async function buildRoster(tournamentId, seats) {
  const snap = await col('registrations').where('tournament_id', '==', Number(tournamentId)).get();
  const regs = snap.docs.map((d) => d.data()).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const map = await playersByIds(regs.map((r) => r.player_id));

  const limit = seats && seats > 0 ? seats : null;
  const confirmed = [];
  const waitlist = [];
  regs.forEach((reg, i) => {
    const base = map.get(reg.player_id);
    if (!base) return;
    const player = publicPlayer(base);
    player.registered_at = reg.created_at;
    if (limit === null || i < limit) {
      player.status = 'confirmed';
      player.table = Math.floor(i / SEATS_PER_TABLE) + 1;
      confirmed.push(player);
    } else {
      player.status = 'waitlist';
      player.queue = i - limit + 1;
      waitlist.push(player);
    }
  });

  return {
    seats: limit,
    seatsPerTable: SEATS_PER_TABLE,
    tables: limit === null ? tablesFor(confirmed.length) : tablesFor(limit),
    total: regs.length,
    confirmedCount: confirmed.length,
    waitlistCount: waitlist.length,
    spotsLeft: limit === null ? null : Math.max(0, limit - confirmed.length),
    isFull: limit !== null && confirmed.length >= limit,
    confirmed,
    waitlist,
  };
}

export function registrationWindow(t) {
  const now = Date.now();
  const vipAt = t.vip_opens_at ? Date.parse(t.vip_opens_at) : null;
  const allAt = t.opens_at ? Date.parse(t.opens_at) : null;
  if (!vipAt && !allAt) return { phase: 'open', vipOpensAt: null, opensAt: null };
  const vipStart = vipAt ?? allAt;
  const allStart = allAt ?? vipAt;
  let phase;
  if (now < vipStart) phase = 'pending';
  else if (now < allStart) phase = 'vip';
  else phase = 'open';
  return { phase, vipOpensAt: t.vip_opens_at || null, opensAt: t.opens_at || null };
}

function canRegisterNow(window, player) {
  if (window.phase === 'open') return true;
  if (window.phase === 'vip') return !!player?.vip;
  return false;
}

function playerRosterStatus(roster, playerId) {
  if (roster.confirmed.some((p) => p.id === Number(playerId))) return { status: 'confirmed' };
  const w = roster.waitlist.find((p) => p.id === Number(playerId));
  if (w) return { status: 'waitlist', queue: w.queue };
  return { status: 'none' };
}

// Lobby
router.get('/', optionalAuth, async (req, res) => {
  const [tournaments, registrations, results, players] = await Promise.all([
    readAll('tournaments'),
    readAll('registrations'),
    readAll('results'),
    readAll('players'),
  ]);
  const nameById = new Map(players.map((p) => [p.id, p.name]));

  let rows = tournaments.map((t) => {
    const regs = registrations.filter((r) => r.tournament_id === t.id);
    const rs = results.filter((r) => r.tournament_id === t.id);
    const champ = rs.find((r) => r.position === 1);
    return {
      ...t,
      registered: regs.length,
      players_count: rs.length,
      champion: champ ? nameById.get(champ.player_id) : null,
      prize_pool: rs.reduce((s, r) => s + (r.prize || 0), 0),
    };
  });

  if (req.query.status) rows = rows.filter((t) => t.status === req.query.status);
  if (req.query.mine === '1' && req.user) {
    const mine = new Set([
      ...registrations.filter((r) => r.player_id === req.user.id).map((r) => r.tournament_id),
      ...results.filter((r) => r.player_id === req.user.id).map((r) => r.tournament_id),
    ]);
    rows = rows.filter((t) => mine.has(t.id));
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id);
  res.json(rows);
});

router.get('/next', async (_req, res) => {
  const rows = (await readAll('tournaments'))
    .filter((t) => t.status === 'scheduled')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  res.json(rows[0] || null);
});

router.get('/:id', optionalAuth, async (req, res) => {
  const t = await getDoc('tournaments', req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });
  const roster = await buildRoster(t.id, t.seats);
  const registrations = [...roster.confirmed, ...roster.waitlist];

  const rsnap = await col('results').where('tournament_id', '==', t.id).get();
  const rrows = rsnap.docs.map((d) => d.data()).sort((a, b) => a.position - b.position);
  const map = await playersByIds(rrows.map((r) => r.player_id));
  const results = rrows.map((r) => {
    const p = map.get(r.player_id) || {};
    return { ...r, name: p.name, nickname: p.nickname, suit: p.suit, color: p.color };
  });

  const window = registrationWindow(t);
  let canRegister = false;
  let viewer = null;
  if (req.user) {
    viewer = await getDoc('players', req.user.id);
    canRegister = t.status === 'scheduled' && canRegisterNow(window, viewer);
  }
  res.json({ tournament: t, registrations, roster, registration: { ...window, canRegister, viewerIsVip: !!viewer?.vip }, results });
});

router.post('/:id/register', requireAuth, async (req, res) => {
  const t = await getDoc('tournaments', req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });
  if (t.status !== 'scheduled') return res.status(400).json({ error: 'Inscrições encerradas para este torneio' });

  const player = await getDoc('players', req.user.id);
  if (!canRegisterNow(registrationWindow(t), player)) {
    const w = registrationWindow(t);
    const msg = w.phase === 'vip'
      ? 'Acesso antecipado: as inscrições estão abertas apenas para VIPs por enquanto.'
      : 'As inscrições para este torneio ainda não foram abertas.';
    return res.status(403).json({ error: msg, registration: w });
  }

  const dup = await col('registrations')
    .where('tournament_id', '==', t.id).where('player_id', '==', req.user.id).limit(1).get();
  if (!dup.empty) return res.status(409).json({ error: 'Você já está inscrito' });

  const id = await nextId('registrations');
  await col('registrations').doc(String(id)).set({
    id, tournament_id: t.id, player_id: req.user.id, created_at: new Date().toISOString(),
  });

  const roster = await buildRoster(t.id, t.seats);
  res.status(201).json({ ok: true, ...playerRosterStatus(roster, req.user.id), roster });
});

router.delete('/:id/register', requireAuth, async (req, res) => {
  const t = await getDoc('tournaments', req.params.id);
  if (!t) return res.status(404).json({ error: 'Torneio não encontrado' });

  const before = new Set((await buildRoster(t.id, t.seats)).confirmed.map((p) => p.id));

  const snap = await col('registrations')
    .where('tournament_id', '==', t.id).where('player_id', '==', req.user.id).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));

  const roster = await buildRoster(t.id, t.seats);
  for (const p of roster.confirmed) {
    if (!before.has(p.id)) await notify(p.id, { type: 'waitlist_promoted', tournamentId: t.id });
  }
  res.json({ ok: true, roster });
});

// --- Organizador ---
const FIELDS = [
  'season_id', 'number', 'name', 'kind', 'modality', 'date', 'buy_in',
  'starting_stack', 'blind_structure', 'rebuy', 'seats', 'vip_opens_at', 'opens_at', 'status',
];

function validateSeats(seats) {
  if (seats === null || seats === undefined || seats === '') return null;
  const n = Number(seats);
  if (!Number.isInteger(n) || n < SEATS_MIN || n > SEATS_MAX)
    return `Vagas devem ficar entre ${SEATS_MIN} e ${SEATS_MAX} (mesas de ${SEATS_PER_TABLE}).`;
  return null;
}

router.post('/', requireAuth, requireOrganizer, async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nome do torneio é obrigatório' });
  if ('seats' in b) {
    const err = validateSeats(b.seats);
    if (err) return res.status(400).json({ error: err });
  }
  const id = await nextId('tournaments');
  const doc = {
    id, kind: 'tournament', modality: "Texas Hold'em", status: 'scheduled',
    created_at: new Date().toISOString(),
  };
  for (const f of FIELDS) if (f in b) doc[f] = b[f];
  doc.id = id;
  await col('tournaments').doc(String(id)).set(doc);
  res.status(201).json(doc);
});

router.put('/:id', requireAuth, requireOrganizer, async (req, res) => {
  const existing = await getDoc('tournaments', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Torneio não encontrado' });
  const b = req.body || {};
  if ('seats' in b) {
    const err = validateSeats(b.seats);
    if (err) return res.status(400).json({ error: err });
  }
  const fields = {};
  for (const f of FIELDS) if (f in b) fields[f] = b[f];
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nada para atualizar' });
  await col('tournaments').doc(String(existing.id)).set(fields, { merge: true });
  res.json(await getDoc('tournaments', existing.id));
});

export default router;
