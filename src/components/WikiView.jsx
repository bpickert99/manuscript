import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { WikiLink } from '../lib/wikiLinkExtension';
import { findBacklinks, findOutgoing } from '../lib/wikiLinks';
import WikiGraph from './WikiGraph';
import { Plus, Trash2, Waypoints, Link2 } from 'lucide-react';

const CATEGORIES = ['Character', 'Location', 'Item', 'Event', 'Concept', 'Other'];

const SAVE_DELAY = 1800;

export default function WikiView() {
  const { user, currentProject } = useApp();
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [categoryVal, setCategoryVal] = useState('Other');
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const entriesRef = useRef([]);

  const selected = entries.find((e) => e.id === selectedId) || null;

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  async function createEntry(title) {
    if (!user || !currentProject) return null;
    const ref = await addDoc(collection(db, 'users', user.uid, 'wikiEntries'), {
      projectId: currentProject.id,
      title: title || 'New Entry',
      category: 'Other',
      content: null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: true,
        orderedList: true,
        listItem: true,
        codeBlock: false,
        code: false,
        blockquote: true,
        horizontalRule: false,
        strike: false,
      }),
      WikiLink.configure({
        getEntries: () => entriesRef.current,
        onCreateNew: (title) => createEntry(title),
        onNavigate: (entryId) => setSelectedId(entryId),
      }),
      Placeholder.configure({ placeholder: 'Write about this entry... type [[ to link another entry' }),
    ],
    content: '',
    onUpdate({ editor: ed }) {
      setSaveStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!selectedId) return;
        setSaveStatus('saving');
        await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', selectedId), {
          content: ed.getJSON(),
          updatedAt: serverTimestamp(),
        });
        setSaveStatus('saved');
      }, SAVE_DELAY);
    },
  });

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(
      collection(db, 'users', user.uid, 'wikiEntries'),
      where('projectId', '==', currentProject.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setEntries(data);
    });
    return unsub;
  }, [user, currentProject]);

  useEffect(() => {
    if (!editor) return;
    if (!selected) {
      editor.commands.clearContent();
      setTitleVal('');
      return;
    }
    setTitleVal(selected.title || '');
    setCategoryVal(selected.category || 'Other');
    const incoming = JSON.stringify(selected.content || '');
    const current = JSON.stringify(editor.getJSON());
    if (selected.content) {
      if (incoming !== current) editor.commands.setContent(selected.content, false);
    } else {
      editor.commands.clearContent();
    }
    setSaveStatus('saved');
  }, [selected?.id, editor]);

  useEffect(() => {
    return () => { clearTimeout(saveTimer.current); clearTimeout(titleTimer.current); };
  }, []);

  async function addEntry() {
    const id = await createEntry('New Entry');
    setSelectedId(id);
  }

  async function deleteEntry(e, entryId) {
    e.stopPropagation();
    if (!window.confirm('Delete this wiki entry?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'wikiEntries', entryId));
    if (selectedId === entryId) setSelectedId(null);
  }

  function handleTitleChange(e) {
    setTitleVal(e.target.value);
    setSaveStatus('unsaved');
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      if (!selectedId) return;
      await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', selectedId), {
        title: e.target.value,
        updatedAt: serverTimestamp(),
      });
      setSaveStatus('saved');
    }, SAVE_DELAY);
  }

  async function handleCategoryChange(e) {
    setCategoryVal(e.target.value);
    if (!selectedId) return;
    await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', selectedId), {
      category: e.target.value,
    });
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const matching = entries.filter((e) => (e.category || 'Other') === cat);
    if (matching.length > 0) acc[cat] = matching;
    return acc;
  }, {});

  const backlinks = selected ? findBacklinks(entries, selected.id) : [];
  const outgoing = selected ? findOutgoing(entries, selected) : [];
  const connections = [...outgoing, ...backlinks.filter((b) => !outgoing.some((o) => o.id === b.id))];

  return (
    <div className="wiki-wrap">
      <div className="wiki-sidebar">
        <div className="wiki-sidebar-header">
          <span className="wiki-sidebar-title">Wiki</span>
          <button className="icon-btn" onClick={addEntry} title="New entry">
            <Plus size={14} />
          </button>
        </div>
        <div className="wiki-list">
          {entries.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No entries. Click + to create one, or type [[ in any entry to create and link one.
            </div>
          ) : (
            Object.entries(grouped).map(([cat, catEntries]) => (
              <div key={cat}>
                <div className="wiki-category-header">{cat}</div>
                {catEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={"wiki-entry-item" + (selectedId === entry.id ? " selected" : "")}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span style={{ flex: 1 }}>{entry.title}</span>
                    <button
                      className="tree-action-btn danger"
                      onClick={(e) => deleteEntry(e, entry.id)}
                      title="Delete"
                      style={{ opacity: selectedId === entry.id ? 1 : undefined }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {selected ? (
        <div className="wiki-main">
          <div className="wiki-editor-toolbar">
            <input
              className="wiki-entry-title-input"
              value={titleVal}
              onChange={handleTitleChange}
              placeholder="Entry title..."
            />
            <select
              className="wiki-category-select"
              value={categoryVal}
              onChange={handleCategoryChange}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div className="editor-toolbar-sep" />

            <button
              className={"editor-toolbar-btn" + (editor?.isActive('bold') ? " is-active" : "")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              style={{ fontWeight: 700, padding: '4px 10px', fontSize: '0.85rem' }}
              title="Bold"
            >
              B
            </button>
            <button
              className={"editor-toolbar-btn" + (editor?.isActive('italic') ? " is-active" : "")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              style={{ fontStyle: 'italic', padding: '4px 10px', fontSize: '0.85rem' }}
              title="Italic"
            >
              I
            </button>

            <div className="editor-toolbar-sep" />

            <button
              className={"icon-btn" + (showGraph ? " active" : "")}
              onClick={() => setShowGraph(!showGraph)}
              title={showGraph ? "Show entry text" : "Show local graph"}
            >
              <Waypoints size={14} />
            </button>
            <span className="wiki-link-indicator">
              {connections.length} connection{connections.length === 1 ? '' : 's'}
            </span>

            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {saveStatus === 'unsaved' ? 'Unsaved' : saveStatus === 'saving' ? 'Saving...' : 'Saved'}
            </span>
          </div>

          {showGraph ? (
            <div className="wiki-graph-wrap">
              <WikiGraph entry={selected} connections={connections} onNavigate={setSelectedId} />
            </div>
          ) : (
            <>
              <div className="wiki-editor-body">
                <EditorContent editor={editor} />
              </div>
              {backlinks.length > 0 && (
                <div className="wiki-backlinks">
                  <div className="wiki-backlinks-title">
                    <Link2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                    Linked from {backlinks.length} {backlinks.length === 1 ? 'entry' : 'entries'}
                  </div>
                  <div className="wiki-backlinks-list">
                    {backlinks.map((b) => (
                      <button key={b.id} className="wiki-backlink-item" onClick={() => setSelectedId(b.id)}>
                        {b.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="wiki-empty">
          {entries.length === 0
            ? 'Create your first wiki entry to track characters, locations, and more.'
            : 'Select an entry from the sidebar.'}
        </div>
      )}
    </div>
  );
}
