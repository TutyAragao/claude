import { Router } from 'express';
import { optionalAuth } from '../auth.js';
import { buildFeed } from '../feed.js';

const router = Router();

// Feed de atividades (público). ?scope=friends (requer login) filtra para
// você e seus amigos.
router.get('/', optionalAuth, (req, res) => {
  const scope = req.query.scope === 'friends' ? 'friends' : 'all';
  const viewerId = req.user?.id || null;
  if (scope === 'friends' && !viewerId) {
    return res.status(401).json({ error: 'Faça login para ver o feed de amigos' });
  }
  res.json(buildFeed({ scope, viewerId, limit: 60 }));
});

export default router;
