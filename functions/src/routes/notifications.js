import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { listNotifications, unreadCount, markRead } from '../notifications.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const unreadOnly = req.query.unread === '1';
  const [notifications, unread] = await Promise.all([
    listNotifications(req.user.id, { unreadOnly }),
    unreadCount(req.user.id),
  ]);
  res.json({ notifications, unread });
});

router.get('/count', async (req, res) => res.json({ unread: await unreadCount(req.user.id) }));

router.post('/read', async (req, res) => {
  await markRead(req.user.id, req.body?.ids);
  res.json({ unread: await unreadCount(req.user.id) });
});

export default router;
