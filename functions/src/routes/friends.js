import { Router } from 'express';
import { col, getDoc, nextId } from '../db.js';
import { requireAuth } from '../auth.js';
import { friendsOf, relationship, incomingRequests, friendshipBetween } from '../social.js';
import { notify } from '../notifications.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => res.json(await friendsOf(req.user.id)));
router.get('/requests', async (req, res) => res.json(await incomingRequests(req.user.id)));
router.get('/status/:id', async (req, res) =>
  res.json({ status: await relationship(req.user.id, Number(req.params.id)) })
);

router.post('/request/:id', async (req, res) => {
  const otherId = Number(req.params.id);
  if (otherId === req.user.id) return res.status(400).json({ error: 'Você não pode adicionar a si mesmo' });
  const other = await getDoc('players', otherId);
  if (!other || !other.active) return res.status(404).json({ error: 'Jogador não encontrado' });

  const rel = await relationship(req.user.id, otherId);
  if (rel === 'friends') return res.status(409).json({ error: 'Vocês já são amigos' });
  if (rel === 'outgoing') return res.status(409).json({ error: 'Pedido já enviado' });

  if (rel === 'incoming') {
    const f = await friendshipBetween(req.user.id, otherId);
    await col('friendships').doc(String(f.id)).set({ status: 'accepted', responded_at: new Date().toISOString() }, { merge: true });
    await notify(otherId, { type: 'friend_accept', actorId: req.user.id });
    return res.json({ status: 'friends' });
  }

  const id = await nextId('friendships');
  await col('friendships').doc(String(id)).set({
    id, requester_id: req.user.id, addressee_id: otherId, status: 'pending',
    created_at: new Date().toISOString(), responded_at: null,
  });
  await notify(otherId, { type: 'friend_request', actorId: req.user.id });
  res.status(201).json({ status: 'outgoing' });
});

router.post('/respond/:id', async (req, res) => {
  const otherId = Number(req.params.id);
  const action = req.body?.action;
  const f = await friendshipBetween(req.user.id, otherId);
  if (!f || f.status !== 'pending' || f.requester_id !== otherId)
    return res.status(404).json({ error: 'Pedido não encontrado' });

  if (action === 'accept') {
    await col('friendships').doc(String(f.id)).set({ status: 'accepted', responded_at: new Date().toISOString() }, { merge: true });
    await notify(otherId, { type: 'friend_accept', actorId: req.user.id });
    return res.json({ status: 'friends' });
  }
  await col('friendships').doc(String(f.id)).delete();
  res.json({ status: 'none' });
});

router.delete('/:id', async (req, res) => {
  const f = await friendshipBetween(req.user.id, Number(req.params.id));
  if (f) await col('friendships').doc(String(f.id)).delete();
  res.json({ status: 'none' });
});

export default router;
