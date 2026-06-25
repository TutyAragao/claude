import { Router } from 'express';
import db from '../db.js';
import { requireAuth, optionalAuth } from '../auth.js';
import { publicPlayer, playerStats, playerBadges } from '../stats.js';
import { friendsOf, friendCount, relationship } from '../social.js';

const router = Router();

function activeSeasonId() {
  const s = db
    .prepare("SELECT id FROM seasons WHERE status = 'open' ORDER BY id DESC LIMIT 1")
    .get();
  return s?.id ?? null;
}

// Lista de jogadores (diretório do clube)
router.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM players WHERE active = 1 ORDER BY name')
    .all();
  res.json(rows.map(publicPlayer));
});

// Perfil completo (público) de um jogador: estatísticas, badges e rede social.
router.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Jogador não encontrado' });
  const seasonId = activeSeasonId();
  res.json({
    player: publicPlayer(row),
    stats: playerStats(row.id, seasonId),
    allTimeStats: playerStats(row.id, null),
    badges: playerBadges(row.id, null),
    history: tournamentHistory(row.id),
    friends: friendsOf(row.id),
    friendCount: friendCount(row.id),
    // relação do visitante logado com este perfil (none/friends/outgoing/incoming/self)
    relationship: req.user ? relationship(req.user.id, row.id) : null,
  });
});

// Histórico de torneios do jogador
function tournamentHistory(playerId) {
  return db
    .prepare(
      `SELECT t.id, t.name, t.number, t.date, t.buy_in,
              r.position, r.prize, r.points, r.bounties, r.stack_start, r.stack_end
         FROM results r
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.player_id = ?
        ORDER BY t.date DESC, t.id DESC`
    )
    .all(playerId);
}

const EDITABLE = ['name', 'nickname', 'avatar_url', 'avatar', 'suit', 'color', 'phrase', 'bio'];

// Temas: claro/escuro grátis; os demais exigem VIP.
const FREE_THEMES = ['dark', 'light'];
const VIP_THEMES = ['neon', 'crimson', 'ouro', 'oceano', 'roxo'];
const ALL_THEMES = [...FREE_THEMES, ...VIP_THEMES];

// Atualiza o próprio perfil
router.put('/me', requireAuth, (req, res) => {
  const body = req.body || {};
  const fields = [];
  const values = [];
  for (const key of EDITABLE) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if ('theme' in body) {
    const theme = body.theme;
    if (!ALL_THEMES.includes(theme)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }
    if (VIP_THEMES.includes(theme)) {
      const me = db.prepare('SELECT vip FROM players WHERE id = ?').get(req.user.id);
      if (!me?.vip) {
        return res.status(403).json({ error: 'Este tema é exclusivo para VIPs' });
      }
    }
    fields.push('theme = ?');
    values.push(theme);
  }
  if ('socials' in body) {
    fields.push('socials = ?');
    values.push(JSON.stringify(body.socials || {}));
  }
  if (!fields.length) return res.status(400).json({ error: 'Nada para atualizar' });

  values.push(req.user.id);
  db.prepare(`UPDATE players SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.user.id);
  res.json({ player: publicPlayer(player) });
});

export default router;
