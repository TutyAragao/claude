import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import db from './db.js';
import { seed } from './seed.js';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import seasonRoutes from './routes/seasons.js';
import tournamentRoutes from './routes/tournaments.js';
import rankingRoutes from './routes/ranking.js';
import adminRoutes from './routes/admin.js';
import friendRoutes from './routes/friends.js';
import activityRoutes from './routes/activities.js';
import notificationRoutes from './routes/notifications.js';

// Em deploy novo, popula dados de demonstração se o banco estiver vazio.
if (process.env.SEED_ON_START === 'true') {
  const empty = db.prepare('SELECT COUNT(*) AS c FROM players').get().c === 0;
  if (empty) {
    console.log('Banco vazio — executando seed inicial…');
    seed();
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'river-club' }));

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 para API
app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// Em produção, serve o SPA (build do frontend) e faz fallback para o index.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = process.env.WEB_DIST || path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
  console.log(`♠ Servindo o frontend de ${WEB_DIST}`);
}

// Tratamento de erro genérico
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`♠ River Club API ouvindo em http://localhost:${PORT}`);
});
