import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { useApp } from '../context/AppContext';
import { Indent } from '../lib/indentExtension';
import { JustWrite } from '../lib/justWriteExtension';
import ReadingView from './ReadingView';
import { Bold, Italic, Quote, IndentIncrease, IndentDecrease, FastForward } from 'lucide-react';

const SAVE_DELAY = 1800;

export default function Editor() {
  const { currentNodeId, nodes, updateNode } = useApp();
  const node = nodes.find((n) => n.id === currentNodeId) || null;
  const hasChildren = currentNodeId != null && nodes.some((n) => n.parentId === currentNodeId);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [titleVal, setTitleVal] = useState('');
  const [justWrite, setJustWriteState] = useState(false);
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const lastSavedContentRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: false,
        blockquote: true,
        horizontalRule: false,
        strike: false,
      }),
      CharacterCount,
      Indent,
      JustWrite,
      Placeholder.configure({
        placeholder: 'Begin writing...',
      }),
    ],
    content: '',
    onUpdate({ editor: ed }) {
      const json = ed.getJSON();
      const jsonStr = JSON.stringify(json);
      if (jsonStr === lastSavedContentRef.current) return;
      setSaveStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await updateNode(currentNodeId, { content: json });
          lastSavedContentRef.current = jsonStr;
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }, SAVE_DELAY);
    },
  });

  // Load content when node changes
  useEffect(() => {
    if (!editor) return;
    if (!node) {
      editor.commands.clearContent();
      setTitleVal('');
      lastSavedContentRef.current = null;
      return;
    }
    setTitleVal(node.title);
    if (node.content) {
      const jsonStr = JSON.stringify(node.content);
      if (jsonStr !== lastSavedContentRef.current) {
        editor.commands.setContent(node.content, false);
        lastSavedContentRef.current = jsonStr;
      }
    } else {
      editor.commands.clearContent();
      lastSavedContentRef.current = null;
    }
    setSaveStatus('saved');
  }, [node?.id, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      clearTimeout(titleTimer.current);
    };
  }, []);

  function handleTitleChange(e) {
    setTitleVal(e.target.value);
    setSaveStatus('unsaved');
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      await updateNode(currentNodeId, { title: e.target.value });
      setSaveStatus('saved');
    }, SAVE_DELAY);
  }

  if (!currentNodeId || !node) {
    return (
      <div className="editor-wrap">
        <div className="editor-empty-state">
          <p>Select a chapter or scene from the sidebar to begin writing.</p>
          <p style={{ fontSize: '0.78rem' }}>Or double-click any title to rename it.</p>
        </div>
      </div>
    );
  }

  if (hasChildren) {
    return <ReadingView nodeId={currentNodeId} />;
  }

  function toggleJustWrite() {
    const next = !justWrite;
    setJustWriteState(next);
    editor?.commands.setJustWrite(next);
    if (next) editor?.commands.focus('end');
  }

  const wordCount = editor
    ? editor.storage.characterCount?.words?.() || 0
    : 0;

  const saveLabel = saveStatus === 'unsaved'
    ? 'Unsaved changes'
    : saveStatus === 'saving'
    ? 'Saving...'
    : saveStatus === 'error'
    ? 'Save failed — check connection'
    : 'All changes saved';

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <button
          className={"editor-toolbar-btn bold-btn" + (editor?.isActive('bold') ? " is-active" : "")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          className={"editor-toolbar-btn italic-btn" + (editor?.isActive('italic') ? " is-active" : "")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className={"editor-toolbar-btn" + (editor?.isActive('blockquote') ? " is-active" : "")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          title="Block quote (for epigraphs)"
          style={{ padding: '4px 8px' }}
        >
          <Quote size={13} />
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className="editor-toolbar-btn"
          onClick={() => editor?.chain().focus().outdent().run()}
          title="Decrease indent (Shift+Tab)"
          style={{ padding: '4px 8px' }}
        >
          <IndentDecrease size={13} />
        </button>
        <button
          className="editor-toolbar-btn"
          onClick={() => editor?.chain().focus().indent().run()}
          title="Increase indent (Tab)"
          style={{ padding: '4px 8px' }}
        >
          <IndentIncrease size={13} />
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className={"editor-toolbar-btn" + (justWrite ? " is-active" : "")}
          onClick={toggleJustWrite}
          title="Just Write: lock everything except the word you're currently typing"
          style={{ padding: '4px 8px' }}
        >
          <FastForward size={13} />
        </button>
        <span className="editor-toolbar-word-count">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      <div className="editor-title-wrap">
        <input
          className="editor-node-title"
          value={titleVal}
          onChange={handleTitleChange}
          placeholder="Title..."
        />
      </div>

      <div className="editor-scroll">
        <EditorContent editor={editor} />
      </div>

      <div className="editor-status">{saveLabel}</div>
    </div>
  );
}
