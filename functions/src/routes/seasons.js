import { Router } from 'express';
import { col, getDoc, nextId } from '../db.js';
import { requireAuth, requireOrganizer } from '../auth.js';
import { parseScoring, DEFAULT_SCORING } from '../scoring.js';

const router = Router();

function hydrate(row) {
  if (!row) return null;
  return { ...row, scoring_table: parseScoring(row.scoring_table) };
}

async function listSeasons() {
  const snap = await col('seasons').get();
  return snap.docs.map((d) => d.data()).sort((a, b) => b.id - a.id);
}

async function activeSeason() {
  const rows = (await listSeasons()).filter((s) => s.status === 'open');
  return rows[0] || null;
}

router.get('/', async (_req, res) => res.json((await listSeasons()).map(hydrate)));

router.get('/active', async (_req, res) => res.json(hydrate(await activeSeason())));

router.get('/:id', async (req, res) => {
  const row = await getDoc('seasons', req.params.id);
  if (!row) return res.status(404).json({ error: 'Temporada não encontrada' });
  res.json(hydrate(row));
});

router.post('/', requireAuth, requireOrganizer, async (req, res) => {
  const { name, start_date, end_date, scoring_table } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nome da temporada é obrigatório' });
  const id = await nextId('seasons');
  const doc = {
    id,
    name,
    start_date: start_date || null,
    end_date: end_date || null,
    status: 'open',
    scoring_table: scoring_table || DEFAULT_SCORING,
    created_at: new Date().toISOString(),
  };
  await col('seasons').doc(String(id)).set(doc);
  res.status(201).json(hydrate(doc));
});

router.put('/:id', requireAuth, requireOrganizer, async (req, res) => {
  const existing = await getDoc('seasons', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Temporada não encontrada' });
  const { name, start_date, end_date, status, scoring_table } = req.body || {};
  const fields = {};
  if (name != null) fields.name = name;
  if (start_date !== undefined) fields.start_date = start_date;
  if (end_date !== undefined) fields.end_date = end_date;
  if (status != null) fields.status = status;
  if (scoring_table) fields.scoring_table = scoring_table;
  await col('seasons').doc(String(existing.id)).set(fields, { merge: true });
  res.json(hydrate(await getDoc('seasons', existing.id)));
});

export default router;
