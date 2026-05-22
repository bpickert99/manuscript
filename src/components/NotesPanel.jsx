import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

const SAVE_DELAY = 1500;

export default function NotesPanel() {
  const { currentNodeId, nodes, updateNode } = useApp();
  const node = nodes.find((n) => n.id === currentNodeId) || null;
  const [notesVal, setNotesVal] = useState('');
  const [status, setStatus] = useState('saved');
  const saveTimer = useRef(null);

  useEffect(() => {
    setNotesVal(node?.notes || '');
    setStatus('saved');
    clearTimeout(saveTimer.current);
  }, [node?.id]);

  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setNotesVal(val);
    setStatus('unsaved');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!currentNodeId) return;
      setStatus('saving');
      await updateNode(currentNodeId, { notes: val });
      setStatus('saved');
    }, SAVE_DELAY);
  }

  const nodeLabel = node
    ? node.type.charAt(0).toUpperCase() + node.type.slice(1) + ": " + node.title
    : 'No selection';

  return (
    <div className="notes-panel">
      <div className="notes-panel-header">
        <span>Notes</span>
        <span style={{ fontWeight: 400, fontStyle: 'italic', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0 }}>
          {node ? node.type : '—'}
        </span>
      </div>

      {!node ? (
        <div style={{ padding: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Select a node to view its notes.
        </div>
      ) : (
        <>
          <div style={{ padding: '0.5rem 1rem 0', fontSize: '0.72rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            {nodeLabel}
          </div>
          <textarea
            className="notes-textarea"
            value={notesVal}
            onChange={handleChange}
            placeholder={"Notes, cut text, reminders, ideas for " + (node?.title || 'this node') + "..."}
          />
          <div className="notes-status">
            {status === 'unsaved' ? 'Unsaved' : status === 'saving' ? 'Saving...' : 'Saved'}
          </div>
        </>
      )}
    </div>
  );
}
