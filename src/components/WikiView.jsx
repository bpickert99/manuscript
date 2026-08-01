import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { WikiLink } from '../lib/wikiLinkExtension';
import { findBacklinks, findOutgoing } from '../lib/wikiLinks';
import { attachWikiHoverPreviews } from '../lib/wikiHoverPreview';
import WikiGraph from './WikiGraph';
import {
  Plus, Trash2, Waypoints, Link2, X, Folder, FolderPlus,
  AlignLeft, AlignCenter, AlignRight, MapPin,
} from 'lucide-react';

const SAVE_DELAY = 1800;

export default function WikiView() {
  const {
    user, currentProject, wikiOpenIds, wikiActiveId, openWikiEntry, closeWikiEntry, setWikiActive,
    armMapPlacement, focusEntryOnMap,
  } = useApp();
  const [entries, setEntries] = useState([]);
  const [folders, setFolders] = useState([]);
  const [mapPins, setMapPins] = useState([]);
  const [showGraph, setShowGraph] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [dragEntryId, setDragEntryId] = useState(null);
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const entriesRef = useRef([]);
  const editorContainerRef = useRef(null);

  const selected = entries.find((e) => e.id === wikiActiveId) || null;
  const selectedPin = selected ? mapPins.find((p) => p.wikiEntryId === selected.id) : null;

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  async function createEntry(title, folderId = null) {
    if (!user || !currentProject) return null;
    const ref = await addDoc(collection(db, 'users', user.uid, 'wikiEntries'), {
      projectId: currentProject.id,
      title: title || 'New Entry',
      folderId,
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
      TextAlign.configure({ types: ['paragraph'] }),
      WikiLink.configure({
        getEntries: () => entriesRef.current,
        onCreateNew: (title) => createEntry(title),
        onNavigate: (entryId) => openWikiEntry(entryId),
      }),
      Placeholder.configure({ placeholder: 'Write about this entry... type [[ to link another entry' }),
    ],
    content: '',
    onUpdate({ editor: ed }) {
      setSaveStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!wikiActiveId) return;
        setSaveStatus('saving');
        await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', wikiActiveId), {
          content: ed.getJSON(),
          updatedAt: serverTimestamp(),
        });
        setSaveStatus('saved');
      }, SAVE_DELAY);
    },
  });

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(collection(db, 'users', user.uid, 'wikiEntries'), where('projectId', '==', currentProject.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setEntries(data);
    });
    return unsub;
  }, [user, currentProject]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(collection(db, 'users', user.uid, 'mapPins'), where('projectId', '==', currentProject.id));
    const unsub = onSnapshot(q, (snap) => {
      setMapPins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, currentProject]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const q = query(collection(db, 'users', user.uid, 'wikiFolders'), where('projectId', '==', currentProject.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setFolders(data);
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

  // Hover-to-preview on the live editor surface (and, recursively, on any
  // preview popups it opens).
  useEffect(() => {
    if (!editorContainerRef.current) return;
    const handle = attachWikiHoverPreviews(editorContainerRef.current, {
      getEntries: () => entriesRef.current,
      onOpenTab: (id) => openWikiEntry(id),
    });
    return () => handle.destroy();
  }, [editor]);

  async function addEntry(folderId = null) {
    const id = await createEntry('New Entry', folderId);
    openWikiEntry(id);
  }

  async function deleteEntry(e, entryId) {
    e.stopPropagation();
    if (!window.confirm('Delete this wiki entry?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'wikiEntries', entryId));
    closeWikiEntry(entryId);
  }

  async function addFolder() {
    await addDoc(collection(db, 'users', user.uid, 'wikiFolders'), {
      projectId: currentProject.id,
      title: 'New Folder',
      order: folders.length,
      createdAt: serverTimestamp(),
    });
  }

  async function renameFolder(folderId, title) {
    await updateDoc(doc(db, 'users', user.uid, 'wikiFolders', folderId), { title });
  }

  async function deleteFolder(folderId) {
    if (!window.confirm('Delete this folder? Its entries will become unfiled, not deleted.')) return;
    const affected = entries.filter((e) => e.folderId === folderId);
    await Promise.all(affected.map((e) => updateDoc(doc(db, 'users', user.uid, 'wikiEntries', e.id), { folderId: null })));
    await deleteDoc(doc(db, 'users', user.uid, 'wikiFolders', folderId));
  }

  async function fileEntry(entryId, folderId) {
    await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', entryId), { folderId });
  }

  function handleTitleChange(e) {
    setTitleVal(e.target.value);
    setSaveStatus('unsaved');
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      if (!wikiActiveId) return;
      await updateDoc(doc(db, 'users', user.uid, 'wikiEntries', wikiActiveId), {
        title: e.target.value,
        updatedAt: serverTimestamp(),
      });
      setSaveStatus('saved');
    }, SAVE_DELAY);
  }

  async function removeFromMap() {
    if (!selectedPin) return;
    if (!window.confirm('Remove this entry\'s pin from the map?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'mapPins', selectedPin.id));
  }

  const unfiled = entries.filter((e) => !e.folderId);
  const backlinks = selected ? findBacklinks(entries, selected.id) : [];
  const outgoing = selected ? findOutgoing(entries, selected) : [];
  const connections = [...outgoing, ...backlinks.filter((b) => !outgoing.some((o) => o.id === b.id))];
  const openTabs = wikiOpenIds.map((id) => entries.find((e) => e.id === id)).filter(Boolean);

  return (
    <div className="wiki-wrap">
      <div className="wiki-sidebar">
        <div className="wiki-sidebar-header">
          <span className="wiki-sidebar-title">Wiki</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="icon-btn" onClick={addFolder} title="New folder">
              <FolderPlus size={14} />
            </button>
            <button className="icon-btn" onClick={() => addEntry(null)} title="New entry">
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="wiki-list">
          {entries.length === 0 && folders.length === 0 ? (
            <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No entries yet. Click + to create one, or type [[ in any entry to create and link one.
            </div>
          ) : (
            <>
              {folders.map((folder) => (
                <WikiFolderGroup
                  key={folder.id}
                  folder={folder}
                  entries={entries.filter((e) => e.folderId === folder.id)}
                  activeId={wikiActiveId}
                  dragEntryId={dragEntryId}
                  onOpen={openWikiEntry}
                  onDelete={deleteEntry}
                  onRenameFolder={renameFolder}
                  onDeleteFolder={deleteFolder}
                  onAddEntry={() => addEntry(folder.id)}
                  onDropEntry={(entryId) => fileEntry(entryId, folder.id)}
                  onDragStartEntry={setDragEntryId}
                  onDragEndEntry={() => setDragEntryId(null)}
                />
              ))}
              <div
                className="wiki-category-header wiki-unfiled-header"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragEntryId && fileEntry(dragEntryId, null)}
              >
                Unfiled
              </div>
              {unfiled.map((entry) => (
                <WikiEntryRow
                  key={entry.id}
                  entry={entry}
                  active={wikiActiveId === entry.id}
                  onOpen={() => openWikiEntry(entry.id)}
                  onDelete={(e) => deleteEntry(e, entry.id)}
                  onDragStart={() => setDragEntryId(entry.id)}
                  onDragEnd={() => setDragEntryId(null)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="wiki-main">
        {openTabs.length > 0 && (
          <div className="wiki-tabbar">
            {openTabs.map((t) => (
              <div
                key={t.id}
                className={"wiki-tab" + (t.id === wikiActiveId ? " active" : "")}
                onClick={() => setWikiActive(t.id)}
              >
                <span className="wiki-tab-title">{t.title || 'Untitled'}</span>
                <button
                  className="wiki-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeWikiEntry(t.id); }}
                  title="Close tab"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {selected ? (
          <>
            <div className="wiki-editor-toolbar">
              <input
                className="wiki-entry-title-input"
                value={titleVal}
                onChange={handleTitleChange}
                placeholder="Entry title..."
              />
              {selectedPin ? (
                <>
                  <button className="btn-sm" onClick={() => focusEntryOnMap(selected.id)} title="View this entry's pin on the map">
                    <MapPin size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                    On Map
                  </button>
                  <button className="btn-sm" onClick={removeFromMap} title="Remove pin from map">
                    <X size={12} style={{ display: 'inline', verticalAlign: -2 }} />
                  </button>
                </>
              ) : (
                <button className="btn-sm" onClick={() => armMapPlacement(selected.id)} title="Click the map to place this entry">
                  <MapPin size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
                  Add to Map
                </button>
              )}

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
                className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'left' }) ? " is-active" : "")}
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                style={{ padding: '4px 8px' }}
                title="Align left"
              >
                <AlignLeft size={13} />
              </button>
              <button
                className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'center' }) ? " is-active" : "")}
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                style={{ padding: '4px 8px' }}
                title="Align center"
              >
                <AlignCenter size={13} />
              </button>
              <button
                className={"editor-toolbar-btn" + (editor?.isActive({ textAlign: 'right' }) ? " is-active" : "")}
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                style={{ padding: '4px 8px' }}
                title="Align right"
              >
                <AlignRight size={13} />
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
                <WikiGraph entry={selected} connections={connections} onNavigate={openWikiEntry} />
              </div>
            ) : (
              <>
                <div className="wiki-editor-body" ref={editorContainerRef}>
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
                        <button key={b.id} className="wiki-backlink-item" onClick={() => openWikiEntry(b.id)}>
                          {b.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="wiki-empty">
            {entries.length === 0
              ? 'Create your first wiki entry to track characters, locations, and more.'
              : 'Select an entry from the sidebar.'}
          </div>
        )}
      </div>
    </div>
  );
}

function WikiEntryRow({ entry, active, onOpen, onDelete, onDragStart, onDragEnd }) {
  return (
    <div
      className={"wiki-entry-item" + (active ? " selected" : "")}
      onClick={onOpen}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <span style={{ flex: 1 }}>{entry.title}</span>
      <button className="tree-action-btn danger" onClick={onDelete} title="Delete" style={{ opacity: active ? 1 : undefined }}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function WikiFolderGroup({
  folder, entries, activeId, dragEntryId, onOpen, onDelete,
  onRenameFolder, onDeleteFolder, onAddEntry, onDropEntry, onDragStartEntry, onDragEndEntry,
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [titleVal, setTitleVal] = useState(folder.title);
  const [dropHover, setDropHover] = useState(false);

  useEffect(() => { setTitleVal(folder.title); }, [folder.title]);

  function commitRename() {
    setRenaming(false);
    if (titleVal.trim() && titleVal.trim() !== folder.title) onRenameFolder(folder.id, titleVal.trim());
  }

  return (
    <div>
      <div
        className={"wiki-folder-header" + (dropHover ? " drop-hover" : "")}
        onClick={() => setExpanded((v) => !v)}
        onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
        onDragLeave={() => setDropHover(false)}
        onDrop={(e) => { e.preventDefault(); setDropHover(false); if (dragEntryId) onDropEntry(dragEntryId); }}
      >
        <Folder size={12} />
        {renaming ? (
          <input
            className="tree-label-input"
            autoFocus
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="wiki-folder-title" onDoubleClick={(e) => { e.stopPropagation(); setRenaming(true); }}>
            {folder.title}
          </span>
        )}
        <div className="wiki-folder-actions">
          <button className="tree-action-btn" onClick={(e) => { e.stopPropagation(); onAddEntry(); }} title="New entry here">
            <Plus size={11} />
          </button>
          <button className="tree-action-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} title="Delete folder">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {expanded && entries.map((entry) => (
        <WikiEntryRow
          key={entry.id}
          entry={entry}
          active={activeId === entry.id}
          onOpen={() => onOpen(entry.id)}
          onDelete={(e) => onDelete(e, entry.id)}
          onDragStart={() => onDragStartEntry(entry.id)}
          onDragEnd={onDragEndEntry}
        />
      ))}
    </div>
  );
}
