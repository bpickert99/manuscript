import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import { useApp } from '../context/AppContext';
import { Indent } from '../lib/indentExtension';
import { JustWrite } from '../lib/justWriteExtension';

const SAVE_DELAY = 1800;

// One independently-editable, auto-saving section of manuscript text.
// Mounted per leaf node — give it `key={node.id}` from the parent so a new
// instance (and a fresh editor) is created whenever the node changes.
export default function LeafSection({ node, onFocusEditor }) {
  const { updateNode } = useApp();
  const [titleVal, setTitleVal] = useState(node.title);
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const lastSavedContentRef = useRef(JSON.stringify(node.content || ''));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false,
        codeBlock: false, code: false, blockquote: true, horizontalRule: false, strike: false,
      }),
      CharacterCount,
      Indent,
      JustWrite,
      Placeholder.configure({ placeholder: 'Begin writing...' }),
    ],
    content: node.content || '',
    onFocus({ editor: ed }) {
      if (onFocusEditor) onFocusEditor(ed);
    },
    onUpdate({ editor: ed }) {
      const json = ed.getJSON();
      const jsonStr = JSON.stringify(json);
      if (jsonStr === lastSavedContentRef.current) return;
      setSaveStatus('unsaved');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await updateNode(node.id, { content: json });
          lastSavedContentRef.current = jsonStr;
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }, SAVE_DELAY);
    },
  });

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
      await updateNode(node.id, { title: e.target.value });
      setSaveStatus('saved');
    }, SAVE_DELAY);
  }

  return (
    <div className="leaf-section">
      <input
        className="leaf-section-title"
        value={titleVal}
        onChange={handleTitleChange}
        placeholder="Title..."
      />
      <EditorContent editor={editor} />
      <div className="leaf-section-status">
        {saveStatus === 'unsaved' ? 'Unsaved changes' : saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed' : ''}
      </div>
    </div>
  );
}
