import React, { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Plus, LogOut, BookOpen, Trash2 } from 'lucide-react';

export default function ProjectDashboard() {
  const { user, selectProject } = useApp();
  const { theme, setTheme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'projects'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  async function createProject() {
    if (!newTitle.trim()) return;
    const ref = await addDoc(collection(db, 'users', user.uid, 'projects'), {
      title: newTitle.trim(),
      createdAt: serverTimestamp(),
    });
    setNewTitle('');
    setCreating(false);
    selectProject({ id: ref.id, title: newTitle.trim() });
  }

  async function deleteProject(e, projectId) {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its content? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'projects', projectId));
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Manuscript</h1>
          <p className="dashboard-user">Signed in as {user?.displayName || user?.email}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="theme-toggle-group">
            {['light', 'dark', 'parchment'].map((t) => (
              <button
                key={t}
                className={"theme-btn " + t + "-btn" + (theme === t ? " active" : "")}
                onClick={() => setTheme(t)}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              />
            ))}
          </div>
          <button
            className="icon-btn"
            onClick={() => signOut(auth)}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="project-grid">
        {projects.map((p) => (
          <div
            key={p.id}
            className="project-card"
            onClick={() => selectProject(p)}
          >
            <button
              className="project-card-delete"
              onClick={(e) => deleteProject(e, p.id)}
              title="Delete project"
            >
              <Trash2 size={13} />
            </button>
            <div className="project-card-title">{p.title}</div>
            <div className="project-card-meta">Created {formatDate(p.createdAt)}</div>
          </div>
        ))}

        {creating ? (
          <div className="project-card">
            <input
              className="modal-input"
              autoFocus
              placeholder="Project title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createProject();
                if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
              }}
              style={{ marginBottom: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-primary" onClick={createProject}>Create</button>
              <button className="btn-cancel" onClick={() => { setCreating(false); setNewTitle(''); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="project-new-card" onClick={() => setCreating(true)}>
            <Plus size={16} />
            New project
          </div>
        )}
      </div>

      {projects.length === 0 && !creating && (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No projects yet. Create your first to get started.
        </p>
      )}
    </div>
  );
}
