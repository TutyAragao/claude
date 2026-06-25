import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import seasonRoutes from './routes/seasons.js';
import tournamentRoutes from './routes/tournaments.js';
import rankingRoutes from './routes/ranking.js';
import adminRoutes from './routes/admin.js';
import friendRoutes from './routes/friends.js';
import activityRoutes from './routes/activities.js';
import notificationRoutes from './routes/notifications.js';

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

// Tratamento de erro genérico
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`♠ River Club API ouvindo em http://localhost:${PORT}`);
});
