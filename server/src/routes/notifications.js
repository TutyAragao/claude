import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { listNotifications, unreadCount, markRead } from '../notifications.js';

const router = Router();
router.use(requireAuth);

// Lista notificações + contagem de não lidas. ?unread=1 para só as não lidas.
router.get('/', (req, res) => {
  const unreadOnly = req.query.unread === '1';
  res.json({
    notifications: listNotifications(req.user.id, { unreadOnly }),
    unread: unreadCount(req.user.id),
  });
});

// Apenas a contagem (para polling leve do sino).
router.get('/count', (req, res) => {
  res.json({ unread: unreadCount(req.user.id) });
});

// Marca como lidas (todas, ou as informadas em body.ids).
router.post('/read', (req, res) => {
  markRead(req.user.id, req.body?.ids);
  res.json({ unread: unreadCount(req.user.id) });
});

export default router;
