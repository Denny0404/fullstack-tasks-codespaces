set -euo pipefail

echo "➡️ Backend: Express + SQLite"
mkdir -p backend
cat > backend/package.json <<'PKG'
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
PKG

cat > backend/index.js <<'JS'
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
JS

echo "➡️ Frontend: React (Vite)"
yes | npm create vite@latest frontend -- --template react >/dev/null

cat > frontend/src/App.jsx <<'APP'
import { useEffect, useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    const r = await fetch('/api/tasks');
    setTasks(await r.json());
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      setTasks(prev => [data, ...prev]);
      setTitle('');
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  async function toggle(id, completed) {
    const r = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    const data = await r.json();
    setTasks(prev => prev.map(t => t.id === id ? data : t));
  }

  async function remove(id) {
    const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (r.status === 204) setTasks(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div style={{maxWidth: 720, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial'}}>
      <h1>Tasks</h1>
      <form onSubmit={add} style={{display: 'flex', gap: 8}}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New task…"
          style={{flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc'}}
        />
        <button disabled={loading} type="submit" style={{padding: '10px 16px', borderRadius: 8}}>
          {loading ? 'Adding…' : 'Add'}
        </button>
      </form>
      {err && <p style={{color: 'red'}}>{err}</p>}
      <ul style={{listStyle: 'none', padding: 0, marginTop: 16}}>
        {tasks.map(t => (
          <li key={t.id} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee'}}>
            <input type="checkbox" checked={t.completed} onChange={() => toggle(t.id, t.completed)} />
            <span style={{textDecoration: t.completed ? 'line-through' : 'none', flex: 1}}>{t.title}</span>
            <button onClick={() => remove(t.id)} aria-label="Delete">🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
APP

cat > frontend/vite.config.js <<'VITE'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } }
})
VITE

echo "➡️ Root: scripts + gitignore"
cat > package.json <<'ROOT'
{
  "name": "fullstack-codespaces",
  "private": true,
  "scripts": {
    "postinstall": "npm --prefix backend install && npm --prefix frontend install",
    "dev": "concurrently -k -n API,WEB -c auto \"npm --prefix backend run dev\" \"npm --prefix frontend run dev\"",
    "start": "npm --prefix backend start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
ROOT

cat > .gitignore <<'GI'
node_modules
.env
*.db
dist
.vscode/
.DS_Store
GI

echo "➡️ Installing deps (root + apps)"
npm install

echo "✅ Scaffold complete. Run 'npm run dev'."
