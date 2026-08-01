import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import AddTypeMenu from './AddTypeMenu';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

// Always shows a whole book's structure, independent of whatever's
// selected for writing — picking a book here is its own, separate
// selection so this view never gets scoped down by the sidebar.
export default function LayoutView() {
  const { nodes, addNode, updateNode, deleteNode, moveNode } = useApp();
  const tree = buildTree(nodes);
  const books = tree; // project root nodes — typically Books, but any root works
  const [layoutBookId, setLayoutBookId] = useState(null);

  useEffect(() => {
    if (!layoutBookId && books.length > 0) setLayoutBookId(books[0].id);
    if (layoutBookId && !books.some((b) => b.id === layoutBookId) && books.length > 0) {
      setLayoutBookId(books[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books.map((b) => b.id).join(',')]);

  const book = books.find((b) => b.id === layoutBookId) || null;

  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { parentId, index }
  const [addAnchor, setAddAnchor] = useState(null); // { el, parentId }

  if (books.length === 0) {
    return (
      <div className="layout-empty">
        <p>Add a book from the sidebar to start laying out its structure.</p>
      </div>
    );
  }
  if (!book) return null;

  async function handleDrop() {
    if (!dragId || !dropTarget) return;
    await moveNode(dragId, dropTarget.parentId, dropTarget.index);
    setDragId(null);
    setDropTarget(null);
  }

  async function handleAddPick(type) {
    if (!addAnchor) return;
    await addNode(type, addAnchor.parentId);
    setAddAnchor(null);
  }

  return (
    <div className="layout-wrap">
      <div className="layout-toolbar">
        {books.length > 1 ? (
          <div className="layout-book-tabs">
            {books.map((b) => (
              <button
                key={b.id}
                className={"layout-book-tab" + (b.id === layoutBookId ? " active" : "")}
                onClick={() => setLayoutBookId(b.id)}
              >
                {b.title}
              </button>
            ))}
          </div>
        ) : (
          <span className="layout-toolbar-title">Layout — {book.title}</span>
        )}
        <button
          className="btn-sm"
          onClick={(e) => setAddAnchor({ el: e.currentTarget, parentId: book.id })}
        >
          <Plus size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
          Add Section
        </button>
        {addAnchor && addAnchor.parentId === book.id && (
          <AddTypeMenu anchorEl={addAnchor.el} onPick={handleAddPick} onClose={() => setAddAnchor(null)} />
        )}
      </div>

      <div className="layout-scroll">
        <SectionChildren
          node={book}
          depth={0}
          dragId={dragId}
          setDragId={setDragId}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDrop={handleDrop}
          addAnchor={addAnchor}
          setAddAnchor={setAddAnchor}
          onAddPick={handleAddPick}
          updateNode={updateNode}
          deleteNode={deleteNode}
        />
      </div>
    </div>
  );
}

// Renders a node's children: consecutive leaves become a row of cards,
// branches become nested, collapsible, indented sub-sections — recursing
// to arbitrary depth so the whole book is always visible.
function SectionChildren({ node, depth, ...dnd }) {
  if (!node.children || node.children.length === 0) {
    return (
      <div
        className="layout-empty-row"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (dnd.dragId) { dnd.setDropTarget({ parentId: node.id, index: 0 }); dnd.onDrop(); } }}
      >
        Nothing here yet.
      </div>
    );
  }

  const groups = [];
  let row = [];
  node.children.forEach((child, i) => {
    const isLeaf = !child.children || child.children.length === 0;
    if (isLeaf) {
      row.push({ child, index: i });
    } else {
      if (row.length) { groups.push({ type: 'row', items: row }); row = []; }
      groups.push({ type: 'branch', child, index: i });
    }
  });
  if (row.length) groups.push({ type: 'row', items: row });

  return groups.map((g, gi) =>
    g.type === 'row' ? (
      <CardRow key={'row-' + gi} parentId={node.id} items={g.items} {...dnd} />
    ) : (
      <Section key={g.child.id} node={g.child} depth={depth + 1} index={g.index} parentId={node.id} {...dnd} />
    )
  );
}

function CardRow({ parentId, items, dragId, setDragId, dropTarget, setDropTarget, onDrop, updateNode, deleteNode }) {
  function onCardDragOver(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    setDropTarget({ parentId, index: relX < 0.5 ? index : index + 1 });
  }

  return (
    <div
      className="layout-card-row"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragId) { setDropTarget({ parentId, index: items[items.length - 1].index + 1 }); onDrop(); } }}
    >
      {items.map(({ child, index }) => (
        <LayoutCard
          key={child.id}
          card={child}
          isDragging={dragId === child.id}
          isDropBefore={dropTarget?.parentId === parentId && dropTarget.index === index}
          onDragStart={() => setDragId(child.id)}
          onDragEnd={() => { setDragId(null); setDropTarget(null); }}
          onDragOver={(e) => onCardDragOver(e, index)}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
          onRename={(title) => updateNode(child.id, { title })}
          onDescriptionChange={(val) => updateNode(child.id, { description: val })}
          onDelete={() => { if (window.confirm('Delete "' + child.title + '"?')) deleteNode(child.id); }}
        />
      ))}
    </div>
  );
}

function Section({ node, depth, index, parentId, dragId, setDragId, dropTarget, setDropTarget, onDrop, addAnchor, setAddAnchor, onAddPick, updateNode, deleteNode, ...rest }) {
  const [expanded, setExpanded] = useState(true);
  const isDragging = dragId === node.id;
  const isDropBefore = dropTarget?.parentId === parentId && dropTarget.index === index;

  function onHeaderDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    setDropTarget({ parentId, index: relY < 0.5 ? index : index + 1 });
  }

  return (
    <div
      className={"layout-group" + (isDragging ? " dragging" : "") + (isDropBefore ? " drop-before" : "")}
      style={{ marginLeft: depth * 18 }}
    >
      <div
        className="layout-group-header"
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDragId(node.id); }}
        onDragEnd={() => { setDragId(null); setDropTarget(null); }}
        onDragOver={onHeaderDragOver}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
      >
        <button
          className="tree-toggle"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <GripVertical size={13} className="layout-group-grip" />
        <input
          className="layout-group-title"
          value={node.title}
          onChange={(e) => updateNode(node.id, { title: e.target.value })}
        />
        <div className="wiki-folder-actions" style={{ opacity: 1 }}>
          <button
            className="tree-action-btn"
            onClick={(e) => { e.stopPropagation(); setAddAnchor({ el: e.currentTarget, parentId: node.id }); }}
            title="Add inside"
          >
            <Plus size={11} />
          </button>
          <button
            className="tree-action-btn danger"
            onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete "' + node.title + '" and everything in it?')) deleteNode(node.id); }}
            title="Delete section"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {addAnchor?.parentId === node.id && (
        <AddTypeMenu anchorEl={addAnchor.el} onPick={onAddPick} onClose={() => setAddAnchor(null)} />
      )}
      {expanded && (
        <SectionChildren
          node={node}
          depth={depth}
          dragId={dragId}
          setDragId={setDragId}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDrop={onDrop}
          addAnchor={addAnchor}
          setAddAnchor={setAddAnchor}
          onAddPick={onAddPick}
          updateNode={updateNode}
          deleteNode={deleteNode}
          {...rest}
        />
      )}
    </div>
  );
}

function LayoutCard({ card, isDragging, isDropBefore, onDragStart, onDragEnd, onDragOver, onDrop, onRename, onDescriptionChange, onDelete }) {
  const [titleVal, setTitleVal] = useState(card.title);
  const [descVal, setDescVal] = useState(card.description || '');
  const titleTimer = useRef(null);
  const descTimer = useRef(null);

  useEffect(() => { setTitleVal(card.title); }, [card.id, card.title]);
  useEffect(() => { setDescVal(card.description || ''); }, [card.id]);
  useEffect(() => () => { clearTimeout(titleTimer.current); clearTimeout(descTimer.current); }, []);

  function handleTitleChange(e) {
    setTitleVal(e.target.value);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => onRename(e.target.value), 900);
  }

  function handleDescChange(e) {
    setDescVal(e.target.value);
    clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => onDescriptionChange(e.target.value), 900);
  }

  return (
    <div
      className={"layout-card" + (isDragging ? " dragging" : "") + (isDropBefore ? " drop-before" : "")}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="layout-card-header">
        <GripVertical size={12} className="layout-card-grip" />
        <input className="layout-card-title" value={titleVal} onChange={handleTitleChange} onClick={(e) => e.stopPropagation()} />
        <button className="layout-card-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
          <Trash2 size={11} />
        </button>
      </div>
      <textarea
        className="layout-card-notes"
        value={descVal}
        onChange={handleDescChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Description of this scene — a summary, not the prose..."
      />
    </div>
  );
}
