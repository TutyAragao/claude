import { Router } from 'express';
import { col } from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { publicPlayer, playerStats, playerBadges } from '../stats.js';
import { friendsOf, friendCount, relationship } from '../social.js';
import { getPlayer, updatePlayer } from '../players-data.js';

const router = Router();

async function activeSeasonId() {
  const snap = await col('seasons').where('status', '==', 'open').get();
  if (snap.empty) return null;
  const ids = snap.docs.map((d) => d.data().id).sort((a, b) => b - a);
  return ids[0];
}

async function tournamentHistory(playerId) {
  const snap = await col('results').where('player_id', '==', Number(playerId)).get();
  const rows = snap.docs.map((d) => d.data());
  rows.sort((a, b) => String(b.tournament_date).localeCompare(String(a.tournament_date)));
  return rows.map((r) => ({
    id: r.tournament_id,
    name: r.tournament_name,
    number: r.tournament_number,
    date: r.tournament_date,
    buy_in: r.buy_in,
    position: r.position,
    prize: r.prize,
    points: r.points,
    bounties: r.bounties,
    stack_start: r.stack_start,
    stack_end: r.stack_end,
  }));
}

// Diretório de jogadores ativos
router.get('/', async (_req, res) => {
  const snap = await col('players').where('active', '==', 1).get();
  const rows = snap.docs.map((d) => publicPlayer(d.data())).sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows);
});

// Perfil público completo
router.get('/:id', optionalAuth, async (req, res) => {
  const row = await getPlayer(req.params.id);
  if (!row) return res.status(404).json({ error: 'Jogador não encontrado' });
  const seasonId = await activeSeasonId();
  const [stats, allTimeStats, badges, history, friends, fcount, rel] = await Promise.all([
    playerStats(row.id, seasonId),
    playerStats(row.id, null),
    playerBadges(row.id, null),
    tournamentHistory(row.id),
    friendsOf(row.id),
    friendCount(row.id),
    req.user ? relationship(req.user.id, row.id) : Promise.resolve(null),
  ]);
  res.json({ player: publicPlayer(row), stats, allTimeStats, badges, history, friends, friendCount: fcount, relationship: rel });
});

const EDITABLE = ['name', 'nickname', 'avatar_url', 'avatar', 'suit', 'color', 'phrase', 'bio'];
const FREE_THEMES = ['dark', 'light'];
const VIP_THEMES = ['neon', 'crimson', 'ouro', 'oceano', 'roxo'];
const ALL_THEMES = [...FREE_THEMES, ...VIP_THEMES];

router.put('/me', requireAuth, async (req, res) => {
  const body = req.body || {};
  if (typeof body.avatar_url === 'string' && body.avatar_url.length > 400000)
    return res.status(413).json({ error: 'Imagem muito grande. Tente uma menor.' });

  const fields = {};
  for (const key of EDITABLE) if (key in body) fields[key] = body[key];
  if ('socials' in body) fields.socials = JSON.stringify(body.socials || {});

  if ('theme' in body) {
    const theme = body.theme;
    if (!ALL_THEMES.includes(theme)) return res.status(400).json({ error: 'Tema inválido' });
    if (VIP_THEMES.includes(theme)) {
      const me = await getPlayer(req.user.id);
      if (!me?.vip) return res.status(403).json({ error: 'Este tema é exclusivo para VIPs' });
    }
    fields.theme = theme;
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'Nada para atualizar' });
  const player = await updatePlayer(req.user.id, fields);
  res.json({ player: publicPlayer(player) });
});

export default router;
