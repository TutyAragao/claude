import { Router } from 'express';
import { col, getDoc, nextId, readAll } from '../db.js';
import { requireAuth, requireOrganizer, hashPassword } from '../auth.js';
import { publicPlayer } from '../stats.js';
import { pointsFor } from '../scoring.js';
import { playerByEmail, createPlayer, getPlayer, updatePlayer } from '../players-data.js';

const router = Router();
router.use(requireAuth, requireOrganizer);

router.get('/overview', async (_req, res) => {
  const [seasons, players, tournaments, results, registrations] = await Promise.all([
    readAll('seasons'), readAll('players'), readAll('tournaments'), readAll('results'), readAll('registrations'),
  ]);
  const season = seasons.filter((s) => s.status === 'open').sort((a, b) => b.id - a.id)[0] || null;
  const activePlayers = players.filter((p) => p.active).length;
  const tournamentsInSeason = season ? tournaments.filter((t) => t.season_id === season.id).length : 0;
  const seasonTournamentIds = new Set(season ? tournaments.filter((t) => t.season_id === season.id).map((t) => t.id) : []);
  const prizePaid = results.filter((r) => seasonTournamentIds.has(r.tournament_id)).reduce((s, r) => s + (r.prize || 0), 0);
  const next = tournaments
    .filter((t) => t.status === 'scheduled' || t.status === 'running')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const atTable = next ? registrations.filter((r) => r.tournament_id === next.id).length : 0;

  res.json({
    season: season ? { id: season.id, name: season.name } : null,
    kpis: { activePlayers, tournamentsInSeason, prizePaid, atTable },
  });
});

router.post('/players', async (req, res) => {
  const { name, email, password, role, vip } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  if (await playerByEmail(email)) return res.status(409).json({ error: 'E-mail já cadastrado' });
  const player = await createPlayer({
    name, email, password_hash: hashPassword(password),
    role: role === 'organizer' ? 'organizer' : 'player', vip: vip ? 1 : 0,
  });
  res.status(201).json(publicPlayer(player));
});

router.put('/players/:id', async (req, res) => {
  const existing = await getPlayer(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Jogador não encontrado' });
  const b = req.body || {};
  const fields = {};
  for (const key of ['name', 'nickname', 'role']) if (key in b) fields[key] = b[key];
  if ('active' in b) fields.active = b.active ? 1 : 0;
  if ('vip' in b) fields.vip = b.vip ? 1 : 0;
  if (b.password) fields.password_hash = hashPassword(b.password);
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nada para atualizar' });
  res.json(publicPlayer(await updatePlayer(existing.id, fields)));
});

// FLUXO CENTRAL: lançar resultado (denormaliza dados do torneio no result)
router.post('/tournaments/:id/results', async (req, res) => {
  const tournament = await getDoc('tournaments', req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Torneio não encontrado' });

  const entries = Array.isArray(req.body?.results) ? req.body.results : [];
  if (!entries.length) return res.status(400).json({ error: 'Envie ao menos um resultado' });

  let season = null;
  if (tournament.season_id) season = await getDoc('seasons', tournament.season_id);
  if (!season) {
    const open = (await readAll('seasons')).filter((s) => s.status === 'open').sort((a, b) => b.id - a.id);
    season = open[0] || null;
  }
  const scoring = season?.scoring_table;

  const normalized = entries.map((e, i) => {
    const position = Number(e.position ?? i + 1);
    const bounties = Number(e.bounties || 0);
    const hasOverride = e.points !== undefined && e.points !== null && e.points !== '' && !Number.isNaN(Number(e.points));
    return {
      player_id: Number(e.player_id),
      position,
      prize: Number(e.prize || 0),
      bounties,
      points: hasOverride ? Number(e.points) : pointsFor({ position, bounties }, scoring),
      stack_start: Number(e.stack_start || 0),
      stack_end: Number(e.stack_end || 0),
    };
  });

  // remove resultados anteriores deste torneio
  const old = await col('results').where('tournament_id', '==', tournament.id).get();
  await Promise.all(old.docs.map((d) => d.ref.delete()));

  // insere novos, denormalizando os dados do torneio
  const denorm = {
    tournament_id: tournament.id,
    tournament_name: tournament.name,
    tournament_number: tournament.number ?? null,
    tournament_date: tournament.date ?? null,
    tournament_status: 'finished',
    season_id: tournament.season_id ?? season?.id ?? null,
    buy_in: tournament.buy_in ?? 0,
  };
  for (const r of normalized) {
    const id = await nextId('results');
    await col('results').doc(String(id)).set({ id, ...denorm, ...r });
  }
  await col('tournaments').doc(String(tournament.id)).set({ status: 'finished' }, { merge: true });

  const map = new Map((await Promise.all(normalized.map((r) => getPlayer(r.player_id)))).filter(Boolean).map((p) => [p.id, p]));
  const results = normalized
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ ...r, tournament_id: tournament.id, name: map.get(r.player_id)?.name, nickname: map.get(r.player_id)?.nickname }));
  res.status(201).json({ ok: true, results });
});

export default router;
