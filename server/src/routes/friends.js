import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { friendsOf, relationship, incomingRequests } from '../social.js';

const router = Router();
router.use(requireAuth);

// Meus amigos
router.get('/', (req, res) => {
  res.json(friendsOf(req.user.id));
});

// Pedidos de amizade recebidos (pendentes)
router.get('/requests', (req, res) => {
  res.json(incomingRequests(req.user.id));
});

// Status da relação com outro jogador
router.get('/status/:id', (req, res) => {
  res.json({ status: relationship(req.user.id, Number(req.params.id)) });
});

// Enviar pedido de amizade. Se já existe um pedido inverso pendente, aceita.
router.post('/request/:id', (req, res) => {
  const otherId = Number(req.params.id);
  if (otherId === req.user.id)
    return res.status(400).json({ error: 'Você não pode adicionar a si mesmo' });
  const other = db.prepare('SELECT id, active FROM players WHERE id = ?').get(otherId);
  if (!other || !other.active)
    return res.status(404).json({ error: 'Jogador não encontrado' });

  const rel = relationship(req.user.id, otherId);
  if (rel === 'friends') return res.status(409).json({ error: 'Vocês já são amigos' });
  if (rel === 'outgoing') return res.status(409).json({ error: 'Pedido já enviado' });

  // Pedido inverso pendente -> vira amizade aceita
  if (rel === 'incoming') {
    db.prepare(
      `UPDATE friendships SET status = 'accepted', responded_at = datetime('now')
        WHERE requester_id = ? AND addressee_id = ?`
    ).run(otherId, req.user.id);
    return res.json({ status: 'friends' });
  }

  db.prepare(
    'INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, \'pending\')'
  ).run(req.user.id, otherId);
  res.status(201).json({ status: 'outgoing' });
});

// Responder a um pedido recebido: aceitar ou recusar
router.post('/respond/:id', (req, res) => {
  const otherId = Number(req.params.id);
  const action = req.body?.action;
  const pending = db
    .prepare(
      `SELECT * FROM friendships
        WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`
    )
    .get(otherId, req.user.id);
  if (!pending) return res.status(404).json({ error: 'Pedido não encontrado' });

  if (action === 'accept') {
    db.prepare(
      `UPDATE friendships SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`
    ).run(pending.id);
    return res.json({ status: 'friends' });
  }
  // recusar
  db.prepare('DELETE FROM friendships WHERE id = ?').run(pending.id);
  res.json({ status: 'none' });
});

// Desfazer amizade ou cancelar pedido (em qualquer sentido)
router.delete('/:id', (req, res) => {
  const otherId = Number(req.params.id);
  db.prepare(
    `DELETE FROM friendships
      WHERE (requester_id = ? AND addressee_id = ?)
         OR (requester_id = ? AND addressee_id = ?)`
  ).run(req.user.id, otherId, otherId, req.user.id);
  res.json({ status: 'none' });
});

export default router;
