import { Router } from 'express';
import db from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';
import { publicPlayer } from '../stats.js';

const router = Router();

// Cadastro (conta única). Todo novo cadastro é jogador.
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
  }
  const exists = db.prepare('SELECT 1 FROM players WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

  const info = db
    .prepare(
      `INSERT INTO players (email, password_hash, name, role)
       VALUES (?, ?, ?, 'player')`
    )
    .run(email.toLowerCase(), hashPassword(password), name.trim());

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(player);
  res.status(201).json({ token, player: publicPlayer(player) });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha' });
  }
  const player = db.prepare('SELECT * FROM players WHERE email = ?').get(String(email).toLowerCase());
  if (!player || !verifyPassword(password, player.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  if (!player.active) return res.status(403).json({ error: 'Conta inativa' });

  const token = signToken(player);
  res.json({ token, player: publicPlayer(player) });
});

// Quem sou eu (sessão atual)
router.get('/me', requireAuth, (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.user.id);
  if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });
  res.json({ player: publicPlayer(player) });
});

export default router;
