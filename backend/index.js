import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, 'tasks.db'));

db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`).run();

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/tasks', (_req, res) => {
  const rows = db.prepare('SELECT id, title, completed, created_at FROM tasks ORDER BY id DESC').all();
  res.json(rows.map(r => ({ ...r, completed: !!r.completed })));
});

app.post('/api/tasks', (req, res) => {
  const { title } = req.body ?? {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const info = db.prepare('INSERT INTO tasks (title) VALUES (?)').run(String(title).trim());
  const row = db.prepare('SELECT id, title, completed, created_at FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  row.completed = !!row.completed;
  res.status(201).json(row);
});

app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const newTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
  const newCompleted = typeof req.body?.completed === 'boolean' ? (req.body.completed ? 1 : 0) : existing.completed;

  db.prepare('UPDATE tasks SET title=?, completed=? WHERE id=?').run(newTitle, newCompleted, id);
  const row = db.prepare('SELECT id, title, completed, created_at FROM tasks WHERE id=?').get(id);
  row.completed = !!row.completed;
  res.json(row);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const out = db.prepare('DELETE FROM tasks WHERE id=?').run(id);
  if (out.changes === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

app.listen(PORT, () => console.log(`API running → http://localhost:${PORT}`));

// Tiny version endpoint (safe to add)
app.get('/api/version', (_req, res) => {
  res.json({ version: '1.0.0', service: 'tasks-api' });
});
