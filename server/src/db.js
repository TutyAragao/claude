import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'river-club.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Bootstrap do schema (idempotente)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migrações leves: adiciona colunas novas em bancos já existentes.
// (CREATE TABLE IF NOT EXISTS não altera tabelas pré-existentes.)
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}
ensureColumn('players', 'vip', 'vip INTEGER NOT NULL DEFAULT 0');
ensureColumn('players', 'avatar', 'avatar TEXT');
ensureColumn('tournaments', 'vip_opens_at', 'vip_opens_at TEXT');
ensureColumn('tournaments', 'opens_at', 'opens_at TEXT');
ensureColumn('results', 'stack_start', 'stack_start INTEGER NOT NULL DEFAULT 0');
ensureColumn('results', 'stack_end', 'stack_end INTEGER NOT NULL DEFAULT 0');

export default db;
