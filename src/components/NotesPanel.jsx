import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { WikiLink } from '../lib/wikiLinkExtension';
import { attachWikiHoverPreviews } from '../lib/wikiHoverPreview';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

const SAVE_DELAY = 1500;

// Older notes were saved as plain strings — turn those into a Tiptap doc
// on first load so they render the same as freshly-written notes.
function normalizeNotes(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {
      type: 'doc',
      content: raw.split('\n').map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }
  return raw;
}

export default function NotesPanel() {
  const { user, currentProject, currentNodeId, nodes, updateNode, openWikiEntry } = useApp();
  const node = nodes.find((n) => n.id === currentNodeId) || null;
  const [wikiEntries, setWikiEntries] = useState([]);
  const [status, setStatus] = useState('saved');
  const saveTimer = useRef(null);
  const entriesRef = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => { entriesRef.current = wikiEntries; }, [wikiEntries]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(collection(db, 'users', user.uid, 'wikiEntries'), where('projectId', '==', currentProject.id));
    const unsub = onSnapshot(q, (snap) => setWikiEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [user, currentProject]);

  async function createEntry(title) {
    if (!user || !currentProject) return null;
    const ref = await addDoc(collection(db, 'users', user.uid, 'wikiEntries'), {
      projectId: currentProject.id,
      title: title || 'New Entry',
      folderId: null,
      content: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: true, orderedList: true, listItem: true,
        codeBlock: false, code: false, blockquote: true, horizontalRule: false, strike: false,
      }),
      TextAlign.configure({ types: ['paragraph'] }),
      WikiLink.configure({
        getEntries: () => entriesRef.current,
        onCreateNew: (title) => createEntry(title),
        onNavigate: (entryId) => openWikiEntry(entryId),
      }),
      Placeholder.configure({ placeholder: 'Notes, cut text, reminders, ideas... type [[ to link a wiki entry' }),
    ],
    content: '',
    onUpdate({ editor: ed }) {
      setStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!currentNodeId) return;
        setStatus('saving');
        await updateNode(currentNodeId, { notes: ed.getJSON() });
        setStatus('saved');
      }, SAVE_DELAY);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (!node) {
      editor.commands.clearContent();
      return;
    }
    const normalized = normalizeNotes(node.notes);
    const incoming = JSON.stringify(normalized || '');
    const current = JSON.stringify(editor.getJSON());
    if (normalized) {
      if (incoming !== current) editor.commands.setContent(normalized, false);
    } else {
      editor.commands.clearContent();
    }
    setStatus('saved');
  }, [node?.id, editor]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const handle = attachWikiHoverPreviews(containerRef.current, {
      getEntries: () => entriesRef.current,
      onOpenTab: (id) => openWikiEntry(id),
    });
    return () => handle.destroy();
  }, [editor]);

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
          <div className="notes-toolbar">
            <button
              className={"editor-toolbar-btn" + (editor?.isActive('bold') ? " is-active" : "")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              style={{ fontWeight: 700, padding: '3px 8px', fontSize: '0.78rem' }}
              title="Bold"
            >
              B
            </button>
            <button
              className={"editor-toolbar-btn" + (editor?.isActive('italic') ? " is-active" : "")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              style={{ fontStyle: 'italic', padding: '3px 8px', fontSize: '0.78rem' }}
              title="Italic"
            >
              I
            </button>
            <div className="editor-toolbar-sep" />
            <button
              className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'left' }) ? " is-active" : "")}
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              style={{ padding: '3px 6px' }}
              title="Align left"
            >
              <AlignLeft size={12} />
            </button>
            <button
              className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'center' }) ? " is-active" : "")}
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              style={{ padding: '3px 6px' }}
              title="Align center"
            >
              <AlignCenter size={12} />
            </button>
            <button
              className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'right' }) ? " is-active" : "")}
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              style={{ padding: '3px 6px' }}
              title="Align right"
            >
              <AlignRight size={12} />
            </button>
          </div>
          <div className="notes-editor-body" ref={containerRef}>
            <EditorContent editor={editor} />
          </div>
          <div className="notes-status">
            {status === 'unsaved' ? 'Unsaved' : status === 'saving' ? 'Saving...' : 'Saved'}
          </div>
        </>
      )}
    </div>
  );
}
