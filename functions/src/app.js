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

const api = express.Router();
api.get('/health', (_req, res) => res.json({ ok: true, service: 'river-club', backend: 'firebase' }));
api.use('/auth', authRoutes);
api.use('/players', playerRoutes);
api.use('/seasons', seasonRoutes);
api.use('/tournaments', tournamentRoutes);
api.use('/ranking', rankingRoutes);
api.use('/admin', adminRoutes);
api.use('/friends', friendRoutes);
api.use('/activities', activityRoutes);
api.use('/notifications', notificationRoutes);

// Via Firebase Hosting o caminho chega como /api/...; chamando a function
// diretamente (emulador) chega sem o prefixo. Montamos nos dois.
app.use('/api', api);
app.use('/', api);

// 404 e erros
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno' });
});

export { app };
