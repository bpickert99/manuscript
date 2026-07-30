import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { collection, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { SuggestionMode, collectSuggestions, resolveSuggestion, hasNoPendingSuggestions } from '../lib/suggestionExtension';
import { X, Check, XCircle, CheckCheck } from 'lucide-react';

export default function SuggestionsReview({ link, onClose }) {
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shareLinks', link.id, 'chapters'), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChapters(data);
    });
    return unsub;
  }, [link.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          Suggestions — {link.title}
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {chapters.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No shared chapters found.</p>
          ) : (
            chapters
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((chapter) => <ChapterSuggestions key={chapter.id} token={link.id} chapter={chapter} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ChapterSuggestions({ token, chapter }) {
  const { updateNode } = useApp();
  const [applied, setApplied] = useState(false);

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false,
        codeBlock: false, code: false, blockquote: true, horizontalRule: false, strike: false,
      }),
      SuggestionMode.configure({ enabled: false }),
    ],
    content: chapter.content || '',
    onUpdate({ editor: ed }) {
      setDoc(doc(db, 'shareLinks', token, 'chapters', chapter.id), {
        content: ed.getJSON(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(chapter.content || '');
    if (current !== incoming) editor.commands.setContent(chapter.content || '', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, chapter.id]);

  if (!editor) return null;

  const suggestions = collectSuggestions(editor.state.doc);
  const clean = hasNoPendingSuggestions(editor.state.doc);

  function decide(id, decision) {
    resolveSuggestion(editor, id, decision);
  }

  function decideAll(decision) {
    // Snapshot ids first — resolving mutates the doc under us.
    collectSuggestions(editor.state.doc).forEach((s) => resolveSuggestion(editor, s.id, decision));
  }

  async function applyToManuscript() {
    await updateNode(chapter.nodeId, { content: editor.getJSON() });
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  }

  return (
    <div style={{ padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{chapter.title}</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {suggestions.length > 1 && (
            <button className="btn-sm" onClick={() => decideAll('accept')}>
              <CheckCheck size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
              Accept all
            </button>
          )}
          <button
            className="btn-primary"
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
            disabled={!clean}
            title={clean ? 'Write this resolved text into your manuscript' : 'Resolve all suggestions first'}
            onClick={applyToManuscript}
          >
            {applied ? 'Applied ✓' : 'Apply to Manuscript'}
          </button>
        </div>
      </div>

      <div className="editor-scroll suggestion-editor" style={{ padding: 0, maxHeight: 260, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>

      {suggestions.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
          No pending suggestions.
        </p>
      ) : (
        <div className="suggestion-list">
          {suggestions.map((s) => (
            <div key={s.id} className="suggestion-list-item">
              <div className="suggestion-list-meta">{s.author || 'Reviewer'}</div>
              {s.deletedText && <div className="suggestion-list-del">"{s.deletedText}"</div>}
              {s.insertedText && <div className="suggestion-list-ins">"{s.insertedText}"</div>}
              <div className="suggestion-list-actions">
                <button className="tree-action-btn" title="Accept" onClick={() => decide(s.id, 'accept')}>
                  <Check size={13} />
                </button>
                <button className="tree-action-btn danger" title="Reject" onClick={() => decide(s.id, 'reject')}>
                  <XCircle size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
