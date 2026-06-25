import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireOrganizer } from '../auth.js';
import { parseScoring, DEFAULT_SCORING } from '../scoring.js';

const router = Router();

function hydrate(row) {
  if (!row) return null;
  return { ...row, status: row.status, scoring_table: parseScoring(row.scoring_table) };
}

// Lista temporadas
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM seasons ORDER BY id DESC').all();
  res.json(rows.map(hydrate));
});

// Temporada vigente (aberta mais recente)
router.get('/active', (_req, res) => {
  const row = db
    .prepare("SELECT * FROM seasons WHERE status = 'open' ORDER BY id DESC LIMIT 1")
    .get();
  res.json(hydrate(row));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Temporada não encontrada' });
  res.json(hydrate(row));
});

// --- Organizador ---

// Cria temporada
router.post('/', requireAuth, requireOrganizer, (req, res) => {
  const { name, start_date, end_date, scoring_table } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nome da temporada é obrigatório' });
  const scoring = JSON.stringify(scoring_table || DEFAULT_SCORING);
  const info = db
    .prepare(
      `INSERT INTO seasons (name, start_date, end_date, scoring_table, status)
       VALUES (?, ?, ?, ?, 'open')`
    )
    .run(name, start_date || null, end_date || null, scoring);
  const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(hydrate(row));
});

// Atualiza temporada (inclui a tabela de pontuação configurável)
router.put('/:id', requireAuth, requireOrganizer, (req, res) => {
  const existing = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Temporada não encontrada' });
  const { name, start_date, end_date, status, scoring_table } = req.body || {};
  db.prepare(
    `UPDATE seasons SET
       name = ?, start_date = ?, end_date = ?, status = ?, scoring_table = ?
     WHERE id = ?`
  ).run(
    name ?? existing.name,
    start_date ?? existing.start_date,
    end_date ?? existing.end_date,
    status ?? existing.status,
    scoring_table ? JSON.stringify(scoring_table) : existing.scoring_table,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM seasons WHERE id = ?').get(req.params.id);
  res.json(hydrate(row));
});

export default router;
