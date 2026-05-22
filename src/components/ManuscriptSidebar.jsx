import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import { ChevronRight, ChevronDown, Book, Layers, FileText, AlignLeft, Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';

const NODE_ICONS = {
  book: Book,
  part: Layers,
  chapter: FileText,
  scene: AlignLeft,
};

const CHILD_TYPES = {
  book: 'part',
  part: 'chapter',
  chapter: 'scene',
  scene: null,
};

const EXPANDABLE = ['book', 'part', 'chapter'];

export default function ManuscriptSidebar({ mobile, onMobileClose }) {
  const { currentProject, nodes, currentNodeId, selectNode, addNode, updateNode, deleteNode } = useApp();
  const tree = buildTree(nodes);

  async function handleAddRoot() {
    await addNode('book', null);
  }

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
              selectNode={selectNode}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
            />
          ))
        )}

        <div className="tree-add-row" onClick={handleAddRoot}>
          <Plus size={12} />
          Add Book
        </div>
      </div>

      <div className="sidebar-footer" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {nodes.filter((n) => n.type === 'scene').length} scene{nodes.filter((n) => n.type === 'scene').length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

function TreeNode({ node, depth, currentNodeId, selectNode, addNode, updateNode, deleteNode }) {
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.title);
  const renameRef = useRef(null);
  const isSelected = currentNodeId === node.id;
  const isExpandable = EXPANDABLE.includes(node.type);
  const childType = CHILD_TYPES[node.type];
  const Icon = NODE_ICONS[node.type] || AlignLeft;

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

  async function handleAddChild(e) {
    e.stopPropagation();
    if (!childType) return;
    setExpanded(true);
    await addNode(childType, node.id);
  }

  async function handleDelete(e) {
    e.stopPropagation();
    const hasChildren = node.children && node.children.length > 0;
    const msg = hasChildren
      ? "Delete \"" + node.title + "\" and all its contents? This cannot be undone."
      : "Delete \"" + node.title + "\"?";
    if (!window.confirm(msg)) return;
    await deleteNode(node.id);
  }

  return (
    <div className="tree-node">
      <div
        className={"tree-node-row" + (isSelected ? " selected" : "")}
        onClick={handleSelect}
        style={{ paddingLeft: (depth * 14 + 8) + "px" }}
      >
        {isExpandable ? (
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

        <div className="tree-actions">
          {childType && (
            <button className="tree-action-btn" onClick={handleAddChild} title={"Add " + childType}>
              <Plus size={11} />
            </button>
          )}
          <button className="tree-action-btn" onClick={handleRenameStart} title="Rename">
            <Pencil size={11} />
          </button>
          <button className="tree-action-btn danger" onClick={handleDelete} title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {isExpandable && expanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentNodeId={currentNodeId}
              selectNode={selectNode}
              addNode={addNode}
              updateNode={updateNode}
              deleteNode={deleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
