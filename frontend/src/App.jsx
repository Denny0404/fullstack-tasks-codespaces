import { useEffect, useMemo, useRef, useState } from 'react';

const P = { 0: 'Low', 1: 'Normal', 2: 'High' };

export default function App() {
  // state
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [prio, setPrio] = useState(1);
  const [status, setStatus] = useState(localStorage.getItem('status') || 'all');          // all | active | completed
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');                                         // created_at | due_date | priority
  const [order, setOrder] = useState('desc');                                             // asc | desc
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const searchRef = useRef(null);

  // load tasks whenever filters change
  useEffect(() => {
    fetchList();
    localStorage.setItem('status', status);
  }, [status, sort, order, search]);

  useEffect(() => {
    document.title = 'Tasks • Pro UI';
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function fetchList() {
    const qs = new URLSearchParams({
      status, sort, order,
      ...(search.trim() ? { search: search.trim() } : {})
    });
    const r = await fetch(`/api/tasks?${qs.toString()}`);
    setTasks(await r.json());
  }

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date: due || null, priority: prio })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error');
      setTasks(prev => [data, ...prev]);
      setTitle(''); setDue(''); setPrio(1);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  async function toggle(id, completed) {
    const r = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    });
    const data = await r.json();
    setTasks(prev => prev.map(t => t.id === id ? data : t));
  }

  async function remove(id) {
    if (!confirm('Delete this task?')) return;
    const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (r.status === 204) setTasks(prev => prev.filter(t => t.id !== id));
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditingText(t.title);
  }
  async function saveEdit() {
    const id = editingId;
    const text = editingText.trim();
    if (!id) return;
    if (!text) return setErr('Title cannot be empty');
    const r = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: text })
    });
    const data = await r.json();
    setTasks(prev => prev.map(t => t.id === id ? data : t));
    setEditingId(null); setEditingText('');
  }

  async function completeAll(val) {
    const r = await fetch('/api/tasks/complete_all', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ value: !!val })
    });
    setTasks(await r.json());
  }
  async function clearCompleted() {
    await fetch('/api/tasks/clear_completed', { method: 'DELETE' });
    fetchList();
  }

  async function doExport() {
    const r = await fetch('/api/tasks/export');
    const data = await r.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tasks-export-${new Date().toISOString().slice(0,19)}.json`;
    a.click();
  }
  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data = [];
    try { data = JSON.parse(text); } catch { return alert('Invalid JSON'); }
    await fetch('/api/tasks/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.isArray(data) ? data : [])
    });
    e.target.value = '';
    fetchList();
  }

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    return { total: tasks.length, completed, active: tasks.length - completed };
  }, [tasks]);

  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div className="header">
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <div className="title">Tasks</div>
            <div className="badge">{stats.completed}/{stats.total} done</div>
          </div>
          <div className="badge">⌘/Ctrl + K to search</div>
        </div>

        {/* Add form */}
        <form onSubmit={add} className="row" style={{flexWrap:'wrap'}}>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a task…" />
          <input className="input" type="date" value={due} onChange={e=>setDue(e.target.value)} title="Due date" />
          <select className="input" value={prio} onChange={e=>setPrio(+e.target.value)} title="Priority">
            <option value={0}>Low</option>
            <option value={1}>Normal</option>
            <option value={2}>High</option>
          </select>
          <button className="btn btn-primary" disabled={loading} type="submit">{loading?'Adding…':'Add'}</button>
        </form>

        {/* Controls */}
        <div className="filters">
          {['all','active','completed'].map(s => (
            <button key={s} className={`filter ${status===s?'active':''}`} onClick={()=>setStatus(s)}>{s[0].toUpperCase()+s.slice(1)}</button>
          ))}
          <input ref={searchRef} className="input" style={{maxWidth:300, marginLeft:8}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="input" style={{maxWidth:170}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="created_at">Sort: Created</option>
            <option value="due_date">Sort: Due</option>
            <option value="priority">Sort: Priority</option>
          </select>
          <select className="input" style={{maxWidth:120}} value={order} onChange={e=>setOrder(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          <span style={{marginLeft:'auto', color:'var(--muted)'}}>
            {stats.active} active • {stats.completed} done
          </span>
        </div>

        {/* Bulk actions */}
        <div className="row" style={{marginTop:10}}>
          <button className="btn btn-ghost" onClick={()=>completeAll(true)}>Complete all</button>
          <button className="btn btn-ghost" onClick={()=>completeAll(false)}>Uncomplete all</button>
          <button className="btn btn-ghost" onClick={clearCompleted}>Clear completed</button>
          <span style={{flex:1}} />
          <button className="btn" onClick={doExport}>Export JSON</button>
          <label className="btn" style={{cursor:'pointer'}}>
            Import JSON
            <input type="file" accept="application/json" onChange={doImport} style={{display:'none'}} />
          </label>
        </div>

        {/* List */}
        {tasks.length === 0 ? (
          <div className="empty">No tasks match.</div>
        ) : (
          <ul className="list">
            {tasks.map(t => (
              <li key={t.id} className="item">
                <input className="checkbox" type="checkbox" checked={t.completed} onChange={() => toggle(t.id, t.completed)} />
                {editingId === t.id ? (
                  <>
                    <input
                      className="input" style={{flex:1}}
                      value={editingText}
                      onChange={e=>setEditingText(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter') saveEdit(); if(e.key==='Escape'){ setEditingId(null); setEditingText(''); } }}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                    <button className="btn" onClick={()=>{ setEditingId(null); setEditingText(''); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div className={`titleline ${t.completed ? 'done' : ''}`} onDoubleClick={()=>startEdit(t)} title="Double-click to edit">
                      {t.title}
                    </div>
                    <div className="badge" title="Priority" style={{minWidth:70, textAlign:'center'}}>{P[t.priority ?? 1]}</div>
                    <div className="badge" title="Due date" style={{minWidth:110, textAlign:'center'}}>{t.due_date || '—'}</div>
                    <button className="del" title="Delete" onClick={() => remove(t.id)}>🗑️</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Error footer */}
        {err && (
          <div className="footer" style={{color:'#fecaca'}}>
            <span>⚠️ {err}</span>
            <button className="btn btn-ghost" onClick={()=>setErr('')}>Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}
