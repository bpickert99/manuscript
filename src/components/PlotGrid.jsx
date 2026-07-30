import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { BEAT_TEMPLATES, ACT_COLORS, distributeBeats } from '../lib/beatTemplates';
import { Plus, Trash2, X, LayoutTemplate } from 'lucide-react';

const THREAD_COLORS = ['#2c4a6e', '#5a7a3e', '#8b5a2b', '#6a3d7a', '#2e6e6e', '#8b3030', '#4a6e2c', '#6e4a2c'];

export default function PlotGrid() {
  const { user, currentProject, nodes, updateNode } = useApp();
  const [threads, setThreads] = useState([]);
  const [cells, setCells] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingCellVal, setEditingCellVal] = useState('');
  const [newThreadName, setNewThreadName] = useState('');
  const [addingThread, setAddingThread] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const scenes = nodes
    .filter((n) => n.type === 'scene')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(
      collection(db, 'users', user.uid, 'plotThreads'),
      where('projectId', '==', currentProject.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setThreads(data);
    });
    return unsub;
  }, [user, currentProject]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(
      collection(db, 'users', user.uid, 'plotCells'),
      where('projectId', '==', currentProject.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        map[data.sceneId + '_' + data.threadId] = data;
      });
      setCells(map);
    });
    return unsub;
  }, [user, currentProject]);

  async function addThread() {
    if (!newThreadName.trim()) return;
    const color = THREAD_COLORS[threads.length % THREAD_COLORS.length];
    await addDoc(collection(db, 'users', user.uid, 'plotThreads'), {
      projectId: currentProject.id,
      title: newThreadName.trim(),
      color,
      order: threads.length,
      createdAt: serverTimestamp(),
    });
    setNewThreadName('');
    setAddingThread(false);
  }

  async function deleteThread(threadId) {
    if (!window.confirm('Delete this plot thread?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'plotThreads', threadId));
  }

  async function applyTemplate(template) {
    const assignments = distributeBeats(template, scenes.length);
    await Promise.all(
      scenes.map((scene, i) =>
        updateNode(scene.id, { act: assignments[i].act, beat: assignments[i].beat })
      )
    );
    setTemplatePickerOpen(false);
  }

  function openCell(sceneId, threadId) {
    const key = sceneId + '_' + threadId;
    const existing = cells[key];
    setEditingCell({ sceneId, threadId, key, existingId: existing?.id || null });
    setEditingCellVal(existing?.content || '');
  }

  async function saveCell() {
    if (!editingCell) return;
    const { sceneId, threadId, key, existingId } = editingCell;
    if (editingCellVal.trim() === '') {
      if (existingId) {
        await deleteDoc(doc(db, 'users', user.uid, 'plotCells', existingId));
      }
    } else if (existingId) {
      await updateDoc(doc(db, 'users', user.uid, 'plotCells', existingId), {
        content: editingCellVal,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'users', user.uid, 'plotCells'), {
        projectId: currentProject.id,
        sceneId,
        threadId,
        content: editingCellVal,
        createdAt: serverTimestamp(),
      });
    }
    setEditingCell(null);
    setEditingCellVal('');
  }

  return (
    <div className="plot-grid-wrap">
      <div className="plot-grid-toolbar">
        <span className="plot-grid-toolbar-title">Plot Grid</span>
        {addingThread ? (
          <>
            <input
              className="modal-input"
              style={{ width: 180, padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
              autoFocus
              placeholder="Thread name..."
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addThread();
                if (e.key === 'Escape') setAddingThread(false);
              }}
            />
            <button className="btn-primary" onClick={addThread}>Add</button>
            <button className="btn-cancel" onClick={() => setAddingThread(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setAddingThread(true)}>
            <Plus size={13} style={{ display: 'inline', marginRight: 4 }} />
            Add Thread
          </button>
        )}
        <button
          className="btn-sm"
          onClick={() => setTemplatePickerOpen(true)}
          disabled={scenes.length === 0}
          title={scenes.length === 0 ? 'Add scenes first' : 'Tag scenes with a story-structure template'}
        >
          <LayoutTemplate size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
          Apply Beat Template
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto', fontStyle: 'italic' }}>
          Click a cell to add notes. Threads = plot lines, rows = scenes.
        </span>
      </div>

      <div className="plot-grid-scroll">
        {scenes.length === 0 || threads.length === 0 ? (
          <div className="plot-empty">
            {scenes.length === 0
              ? 'Add scenes to your manuscript first, then come back to map them.'
              : 'Add your first plot thread above to get started.'}
          </div>
        ) : (
          <table className="plot-grid-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Scene</th>
                {threads.map((t) => (
                  <th key={t.id}>
                    <div className="plot-thread-header">
                      <span className="thread-color-dot" style={{ background: t.color }} />
                      <span style={{ flex: 1 }}>{t.title}</span>
                      <button
                        className="tree-action-btn danger"
                        onClick={() => deleteThread(t.id)}
                        title="Delete thread"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene) => (
                <tr key={scene.id}>
                  <td
                    className="plot-scene-label"
                    style={scene.act ? { borderLeft: '3px solid ' + (ACT_COLORS[scene.act] || ACT_COLORS[1]) } : {}}
                  >
                    {scene.title}
                    {scene.beat && (
                      <div className="plot-scene-beat">
                        <span
                          className="plot-act-badge"
                          style={{ background: ACT_COLORS[scene.act] || ACT_COLORS[1] }}
                        >
                          Act {scene.act}
                        </span>
                        {scene.beat}
                      </div>
                    )}
                  </td>
                  {threads.map((thread) => {
                    const key = scene.id + '_' + thread.id;
                    const cell = cells[key];
                    return (
                      <td
                        key={thread.id}
                        className={"plot-cell" + (cell?.content ? " has-content" : "")}
                        onClick={() => openCell(scene.id, thread.id)}
                        style={cell?.content ? { borderLeft: '2px solid ' + thread.color } : {}}
                      >
                        {cell?.content && (
                          <span className="plot-cell-text">{cell.content}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingCell && (
        <div className="modal-overlay" onClick={saveCell}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              Plot Note
            </div>
            <div className="modal-field">
              <label className="modal-label">
                {scenes.find((s) => s.id === editingCell.sceneId)?.title} &times; {threads.find((t) => t.id === editingCell.threadId)?.title}
              </label>
              <textarea
                className="modal-textarea"
                autoFocus
                value={editingCellVal}
                onChange={(e) => setEditingCellVal(e.target.value)}
                placeholder="What happens in this scene for this thread? Leave blank to clear."
                style={{ minHeight: 100 }}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null); }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setEditingCell(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveCell}>Save</button>
            </div>
          </div>
        </div>
      )}

      {templatePickerOpen && (
        <div className="modal-overlay" onClick={() => setTemplatePickerOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-title">Apply a Beat Template</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Spreads the template's beats across your {scenes.length} existing scene{scenes.length === 1 ? '' : 's'}
              in order, tagging each with an act and beat name. This overwrites any existing tags.
            </p>
            {BEAT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="project-card"
                style={{ width: '100%', textAlign: 'left', marginBottom: '0.6rem', display: 'block' }}
                onClick={() => applyTemplate(t)}
              >
                <div className="project-card-title">{t.label}</div>
                <div className="project-card-meta">{t.description}</div>
              </button>
            ))}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setTemplatePickerOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
