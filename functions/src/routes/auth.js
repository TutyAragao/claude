import { Router } from 'express';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';
import { publicPlayer } from '../stats.js';
import { playerByEmail, getPlayer, createPlayer } from '../players-data.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  if (String(password).length < 6)
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
  if (await playerByEmail(email))
    return res.status(409).json({ error: 'E-mail já cadastrado' });

  const player = await createPlayer({ name, email, password_hash: hashPassword(password) });
  res.status(201).json({ token: signToken(player), player: publicPlayer(player) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha' });
  const player = await playerByEmail(email);
  if (!player || !verifyPassword(password, player.password_hash))
    return res.status(401).json({ error: 'Credenciais inválidas' });
  if (!player.active) return res.status(403).json({ error: 'Conta inativa' });
  res.json({ token: signToken(player), player: publicPlayer(player) });
});

router.get('/me', requireAuth, async (req, res) => {
  const player = await getPlayer(req.user.id);
  if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });
  res.json({ player: publicPlayer(player) });
});

export default router;
