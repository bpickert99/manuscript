import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import SectionTree from './SectionTree';
import { computeWordCounts } from '../lib/wordCount';
import { Bold, Italic, Quote, IndentIncrease, IndentDecrease, FastForward, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

function findInTree(list, id) {
  for (const n of list) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

export default function Editor() {
  const { currentNodeId, nodes, updateNode } = useApp();
  const [activeEditor, setActiveEditor] = useState(null);
  const [justWrite, setJustWrite] = useState(false);
  const [pageTitleVal, setPageTitleVal] = useState('');
  const pageTitleTimer = useRef(null);

  const tree = buildTree(nodes);
  const node = currentNodeId ? findInTree(tree, currentNodeId) : null;

  useEffect(() => {
    setPageTitleVal(node?.title || '');
  }, [node?.id]);

  useEffect(() => () => clearTimeout(pageTitleTimer.current), []);

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

  const isLeaf = !node.children || node.children.length === 0;
  const wordCounts = computeWordCounts(nodes);
  const totalWords = wordCounts[node.id] || 0;

  function handlePageTitleChange(e) {
    setPageTitleVal(e.target.value);
    clearTimeout(pageTitleTimer.current);
    pageTitleTimer.current = setTimeout(() => updateNode(node.id, { title: e.target.value }), 1200);
  }

  function toggleJustWrite() {
    const next = !justWrite;
    setJustWrite(next);
    activeEditor?.commands.setJustWrite(next);
  }

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <button
          className={"editor-toolbar-btn bold-btn" + (activeEditor?.isActive('bold') ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().toggleBold().run()}
          disabled={!activeEditor}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          className={"editor-toolbar-btn italic-btn" + (activeEditor?.isActive('italic') ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
          disabled={!activeEditor}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className={"editor-toolbar-btn" + (activeEditor?.isActive('blockquote') ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
          disabled={!activeEditor}
          title="Block quote (for epigraphs)"
          style={{ padding: '4px 8px' }}
        >
          <Quote size={13} />
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className="editor-toolbar-btn"
          onClick={() => activeEditor?.chain().focus().outdent().run()}
          disabled={!activeEditor}
          title="Decrease indent (Shift+Tab)"
          style={{ padding: '4px 8px' }}
        >
          <IndentDecrease size={13} />
        </button>
        <button
          className="editor-toolbar-btn"
          onClick={() => activeEditor?.chain().focus().indent().run()}
          disabled={!activeEditor}
          title="Increase indent (Tab)"
          style={{ padding: '4px 8px' }}
        >
          <IndentIncrease size={13} />
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className={"editor-toolbar-btn" + (activeEditor?.isActive({ textAlign: 'left' }) ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()}
          disabled={!activeEditor}
          title="Align left"
          style={{ padding: '4px 8px' }}
        >
          <AlignLeft size={13} />
        </button>
        <button
          className={"editor-toolbar-btn" + (activeEditor?.isActive({ textAlign: 'center' }) ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()}
          disabled={!activeEditor}
          title="Align center"
          style={{ padding: '4px 8px' }}
        >
          <AlignCenter size={13} />
        </button>
        <button
          className={"editor-toolbar-btn" + (activeEditor?.isActive({ textAlign: 'right' }) ? " is-active" : "")}
          onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()}
          disabled={!activeEditor}
          title="Align right"
          style={{ padding: '4px 8px' }}
        >
          <AlignRight size={13} />
        </button>
        <div className="editor-toolbar-sep" />
        <button
          className={"editor-toolbar-btn" + (justWrite ? " is-active" : "")}
          onClick={toggleJustWrite}
          disabled={!activeEditor}
          title="Just Write: lock everything except the word you're currently typing"
          style={{ padding: '4px 8px' }}
        >
          <FastForward size={13} />
        </button>
        <span className="editor-toolbar-word-count">
          {totalWords.toLocaleString()} {totalWords === 1 ? 'word' : 'words'}
        </span>
      </div>

      {!isLeaf && (
        <div className="agg-page-header">
          <input
            className="agg-page-title"
            value={pageTitleVal}
            onChange={handlePageTitleChange}
          />
        </div>
      )}

      <div className="editor-scroll agg-scroll">
        <SectionTree node={node} depth={0} updateNode={updateNode} onFocusEditor={setActiveEditor} />
      </div>
    </div>
  );
}
