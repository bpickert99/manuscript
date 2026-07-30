import React, { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp, buildTree } from '../context/AppContext';
import { generateShareToken } from '../lib/shareToken';
import SuggestionsReview from './SuggestionsReview';
import { X, Share2, Copy, Check, RefreshCw, Trash2, MessageSquareDiff } from 'lucide-react';

// Any selected node expands to its leaf descendants (or itself, if it's
// already a leaf) — selecting a Book or Part shares everything under it.
function expandToLeaves(ids, nodes) {
  const result = new Set();
  function addLeaves(id) {
    const children = nodes.filter((n) => n.parentId === id);
    if (children.length === 0) result.add(id);
    else children.forEach((c) => addLeaves(c.id));
  }
  ids.forEach(addLeaves);
  return Array.from(result);
}

export default function ShareModal({ onClose }) {
  const { user, currentProject, nodes } = useApp();
  const [links, setLinks] = useState([]);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);
  const [reviewingLink, setReviewingLink] = useState(null);

  const tree = buildTree(nodes);

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

  async function writeChapters(token, leafIds) {
    const batch = writeBatch(db);
    leafIds.forEach((id) => {
      const n = nodes.find((x) => x.id === id);
      if (!n) return;
      batch.set(doc(db, 'shareLinks', token, 'chapters', id), {
        nodeId: id,
        title: n.title,
        content: n.content || null,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  async function createLink() {
    if (selectedIds.length === 0) return;
    const leafIds = expandToLeaves(selectedIds, nodes);
    if (leafIds.length === 0) return;
    const token = generateShareToken();
    await setDoc(doc(db, 'shareLinks', token), {
      ownerId: user.uid,
      projectId: currentProject.id,
      title: linkTitle.trim() || currentProject.title,
      chapterIds: leafIds,
      createdAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
    });
    await writeChapters(token, leafIds);
    setSelecting(false);
    setSelectedIds([]);
    setLinkTitle('');
  }

  async function syncLink(link) {
    if (!window.confirm(
      'Sync will overwrite the shared draft with your current manuscript text, including any pending reviewer suggestions that haven\'t been resolved yet. Continue?'
    )) return;
    await writeChapters(link.id, link.chapterIds || []);
    await setDoc(doc(db, 'shareLinks', link.id), { syncedAt: serverTimestamp() }, { merge: true });
  }

  async function revokeLink(link) {
    if (!window.confirm('Revoke this review link? Anyone with the URL will lose access.')) return;
    const [chapterDocs, commentDocs] = await Promise.all([
      getDocs(collection(db, 'shareLinks', link.id, 'chapters')),
      getDocs(collection(db, 'shareLinks', link.id, 'comments')),
    ]);
    const batch = writeBatch(db);
    chapterDocs.forEach((d) => batch.delete(d.ref));
    commentDocs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'shareLinks', link.id));
    await batch.commit();
  }

  function linkUrl(token) {
    return window.location.origin + window.location.pathname + '#/review/' + token;
  }

  function copyLink(token) {
    navigator.clipboard.writeText(linkUrl(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  }

  if (reviewingLink) {
    return <SuggestionsReview link={reviewingLink} onClose={() => setReviewingLink(null)} />;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Review Links
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Share a link to selected parts of your manuscript. Reviewers enter their name once, then can suggest
          edits (tracked, like Google Docs) and leave comments — no account needed.
        </p>

        {links.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {links.map((l) => (
              <div key={l.id} className="project-card" style={{ marginBottom: '0.5rem', cursor: 'default' }}>
                <div className="project-card-title">{l.title}</div>
                <div className="project-card-meta">
                  {(l.chapterIds || []).length} section{(l.chapterIds || []).length === 1 ? '' : 's'} shared
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn-sm" onClick={() => copyLink(l.id)}>
                    {copiedToken === l.id ? <Check size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} /> : <Copy size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />}
                    {copiedToken === l.id ? 'Copied' : 'Copy Link'}
                  </button>
                  <button className="btn-sm" onClick={() => setReviewingLink(l)}>
                    <MessageSquareDiff size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                    Review Suggestions
                  </button>
                  <button className="btn-sm" onClick={() => syncLink(l)}>
                    <RefreshCw size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                    Sync latest content
                  </button>
                  <button className="btn-sm" onClick={() => revokeLink(l)}>
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
              <label className="modal-label">Parts to include</label>
              {tree.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Nothing to share yet — add a book, part, chapter, or scene first.
                </p>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem' }}>
                  <ShareTreeList tree={tree} depth={0} selectedIds={selectedIds} onToggle={toggleSelect} />
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.4rem' }}>
                Checking a book or part shares everything nested under it.
              </p>
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

function ShareTreeList({ tree, depth, selectedIds, onToggle }) {
  return tree.map((n) => (
    <React.Fragment key={n.id}>
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0',
          fontSize: '0.85rem', cursor: 'pointer', paddingLeft: depth * 16,
        }}
      >
        <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => onToggle(n.id)} />
        {n.title}
      </label>
      {n.children && n.children.length > 0 && (
        <ShareTreeList tree={n.children} depth={depth + 1} selectedIds={selectedIds} onToggle={onToggle} />
      )}
    </React.Fragment>
  ));
}
