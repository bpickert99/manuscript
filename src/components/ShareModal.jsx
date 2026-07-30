import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { generateShareToken } from '../lib/shareToken';
import { X, Share2, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';

export default function ShareModal({ onClose }) {
  const { user, currentProject, nodes } = useApp();
  const [links, setLinks] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);

  const writableNodes = nodes
    .filter((n) => n.type === 'chapter' || n.type === 'scene')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(
      collection(db, 'shareLinks'),
      where('ownerId', '==', user.uid),
      where('projectId', '==', currentProject.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLinks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, currentProject]);

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function buildSnapshot(ids) {
    return ids
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean)
      .map((n) => ({ nodeId: n.id, title: n.title, content: n.content || null }));
  }

  async function createLink() {
    if (selectedIds.length === 0) return;
    const token = generateShareToken();
    await setDoc(doc(db, 'shareLinks', token), {
      ownerId: user.uid,
      projectId: currentProject.id,
      title: linkTitle.trim() || currentProject.title,
      chapters: buildSnapshot(selectedIds),
      createdAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
    });
    setSelecting(false);
    setSelectedIds([]);
    setLinkTitle('');
  }

  async function syncLink(link) {
    const ids = link.chapters.map((c) => c.nodeId);
    await setDoc(
      doc(db, 'shareLinks', link.id),
      { chapters: buildSnapshot(ids), syncedAt: serverTimestamp() },
      { merge: true }
    );
  }

  async function revokeLink(id) {
    if (!window.confirm('Revoke this review link? Anyone with the URL will lose access.')) return;
    await deleteDoc(doc(db, 'shareLinks', id));
  }

  function linkUrl(token) {
    return window.location.origin + window.location.pathname + '#/review/' + token;
  }

  function copyLink(token) {
    navigator.clipboard.writeText(linkUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Review Links
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Share a read-only link to selected chapters. Reviewers can leave comments in the margins without signing in.
        </p>

        {links.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {links.map((l) => (
              <div key={l.id} className="project-card" style={{ marginBottom: '0.5rem', cursor: 'default' }}>
                <div className="project-card-title">{l.title}</div>
                <div className="project-card-meta">
                  {l.chapters.length} chapter{l.chapters.length === 1 ? '' : 's'} shared
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn-sm" onClick={() => copyLink(l.id)}>
                    {copiedToken === l.id ? <Check size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} /> : <Copy size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />}
                    {copiedToken === l.id ? 'Copied' : 'Copy Link'}
                  </button>
                  <button className="btn-sm" onClick={() => syncLink(l)}>
                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                    Sync latest content
                  </button>
                  <button className="btn-sm" onClick={() => revokeLink(l.id)}>
                    <Trash2 size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selecting ? (
          <>
            <div className="modal-field">
              <label className="modal-label">Link title</label>
              <input
                className="modal-input"
                autoFocus
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g. Beta draft — Part 1"
              />
            </div>
            <div className="modal-field">
              <label className="modal-label">Chapters / scenes to include</label>
              {writableNodes.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nothing to share yet — add a chapter or scene first.
                </p>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                  {writableNodes.map((n) => (
                    <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => toggleSelect(n.id)} />
                      {n.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSelecting(false)}>Cancel</button>
              <button className="btn-primary" onClick={createLink} disabled={selectedIds.length === 0}>Create Link</button>
            </div>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setSelecting(true)}>
            <Share2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            New Review Link
          </button>
        )}
      </div>
    </div>
  );
}
