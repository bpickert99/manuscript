import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import { computeWordCounts } from '../lib/wordCount';
import AddTypeMenu, { NODE_ICONS, TYPE_LEVEL } from './AddTypeMenu';
import { ChevronRight, ChevronDown, AlignLeft, Plus, Pencil, Trash2 } from 'lucide-react';

function formatCount(n) {
  return n.toLocaleString() + ' word' + (n === 1 ? '' : 's');
}

export default function ManuscriptSidebar({ mobile, onMobileClose }) {
  const { currentProject, nodes, currentNodeId, selectNode, addNode, updateNode, deleteNode, moveNode } = useApp();
  const tree = buildTree(nodes);
  const wordCounts = computeWordCounts(nodes);
  const [rootAddAnchor, setRootAddAnchor] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { nodeId, position: 'before'|'after'|'inside' }

  async function handleAddRoot(type) {
    setRootAddAnchor(null);
    await addNode(type, null);
  }

  function siblingsOf(parentId) {
    return nodes
      .filter((n) => (n.parentId || null) === (parentId || null))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async function handleDrop() {
    if (!dragId || !dropTarget) return;
    const target = nodes.find((n) => n.id === dropTarget.nodeId);
    if (!target) return;

    let newParentId, newIndex;
    if (dropTarget.position === 'inside') {
      newParentId = target.id;
      newIndex = siblingsOf(target.id).length;
    } else {
      newParentId = target.parentId || null;
      const sibs = siblingsOf(newParentId).filter((n) => n.id !== dragId);
      const targetIdx = sibs.findIndex((n) => n.id === target.id);
      newIndex = dropTarget.position === 'after' ? targetIdx + 1 : targetIdx;
    }
    await moveNode(dragId, newParentId, newIndex);
    setDragId(null);
    setDropTarget(null);
  }

  const totalWords = nodes.reduce((sum, n) => sum + (!n.parentId ? (wordCounts[n.id] || 0) : 0), 0);

  return (
    <div className={"sidebar" + (mobile ? " mobile-open" : "")}>
      <div className="sidebar-header">
        <span className="sidebar-project-name">{currentProject?.title}</span>
      </div>

      <div className="sidebar-tree">
        {tree.length === 0 ? (
          <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No structure yet. Add a book to begin.
          </div>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              currentNodeId={currentNodeId}
              wordCounts={wordCounts}
              selectNode={selectNode}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
              dragId={dragId}
              setDragId={setDragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDrop={handleDrop}
            />
          ))
        )}

        <div className="tree-add-row-wrap">
          <div className="tree-add-row" onClick={(e) => setRootAddAnchor(rootAddAnchor ? null : e.currentTarget)}>
            <Plus size={12} />
            Add to project
          </div>
          {rootAddAnchor && (
            <AddTypeMenu anchorEl={rootAddAnchor} onPick={handleAddRoot} onClose={() => setRootAddAnchor(null)} />
          )}
        </div>
      </div>

      <div className="sidebar-footer" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {formatCount(totalWords)} total
        </span>
      </div>
    </div>
  );
}

function TreeNode({
  node, depth, currentNodeId, wordCounts, selectNode, addNode, updateNode, deleteNode,
  dragId, setDragId, dropTarget, setDropTarget, onDrop,
}) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.title);
  const [addAnchor, setAddAnchor] = useState(null);
  const renameRef = useRef(null);
  const rowRef = useRef(null);
  const isSelected = currentNodeId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const Icon = NODE_ICONS[node.type] || AlignLeft;
  const isDragging = dragId === node.id;
  const isDropTarget = dropTarget?.nodeId === node.id;
  const indentLevel = TYPE_LEVEL[node.type] ?? depth;

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  function handleSelect() {
    selectNode(node.id);
  }

  function handleToggle(e) {
    e.stopPropagation();
    setExpanded(!expanded);
  }

  function handleRenameStart(e) {
    e.stopPropagation();
    setRenameVal(node.title);
    setRenaming(true);
  }

  async function handleRenameCommit() {
    if (renameVal.trim() && renameVal.trim() !== node.title) {
      await updateNode(node.id, { title: renameVal.trim() });
    }
    setRenaming(false);
  }

  function handleRenameKey(e) {
    if (e.key === 'Enter') handleRenameCommit();
    if (e.key === 'Escape') setRenaming(false);
  }

  async function handleAddChild(type) {
    setAddAnchor(null);
    setExpanded(true);
    await addNode(type, node.id);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    const msg = hasChildren
      ? "Delete \"" + node.title + "\" and all its contents? This cannot be undone."
      : "Delete \"" + node.title + "\"?";
    if (!window.confirm(msg)) return;
    await deleteNode(node.id);
  }

  function handleDragStart(e) {
    e.stopPropagation();
    setDragId(node.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDragId(null);
    setDropTarget(null);
  }

  function handleDragOver(e) {
    if (!dragId || dragId === node.id) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = rowRef.current.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    const position = relY < 0.25 ? 'before' : relY > 0.75 ? 'after' : 'inside';
    setDropTarget({ nodeId: node.id, position });
  }

  function handleDropEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    onDrop();
  }

  return (
    <div className="tree-node">
      <div
        ref={rowRef}
        className={
          "tree-node-row" +
          (isSelected ? " selected" : "") +
          (isDragging ? " dragging" : "") +
          (isDropTarget ? " drop-" + dropTarget.position : "")
        }
        onClick={handleSelect}
        style={{ paddingLeft: (indentLevel * 18 + 8) + "px" }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDropEvent}
      >
        {hasChildren ? (
          <button className="tree-toggle" onClick={handleToggle}>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span style={{ width: 18, flexShrink: 0 }} />
        )}

        <Icon size={13} className="tree-icon" />

        {renaming ? (
          <input
            ref={renameRef}
            className="tree-label-input"
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={handleRenameKey}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-label" onDoubleClick={handleRenameStart}>
            {node.title}
          </span>
        )}

        <span className="tree-word-count">{(wordCounts[node.id] || 0).toLocaleString()}w</span>

        <div className="tree-actions">
          <button
            className="tree-action-btn"
            onClick={(e) => { e.stopPropagation(); setAddAnchor(addAnchor ? null : e.currentTarget); }}
            title="Add inside"
          >
            <Plus size={11} />
          </button>
          {addAnchor && (
            <AddTypeMenu anchorEl={addAnchor} onPick={handleAddChild} onClose={() => setAddAnchor(null)} />
          )}
          <button className="tree-action-btn" onClick={handleRenameStart} title="Rename">
            <Pencil size={11} />
          </button>
          <button className="tree-action-btn danger" onClick={handleDelete} title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentNodeId={currentNodeId}
              wordCounts={wordCounts}
              selectNode={selectNode}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
              dragId={dragId}
              setDragId={setDragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
