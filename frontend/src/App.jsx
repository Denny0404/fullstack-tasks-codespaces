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
