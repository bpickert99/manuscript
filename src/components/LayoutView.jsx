import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import AddTypeMenu from './AddTypeMenu';
import { Plus, Trash2, GripVertical } from 'lucide-react';

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

  const dnd = {
    dragId, setDragId, dropTarget, setDropTarget, onDrop: handleDrop,
    addAnchor, setAddAnchor, onAddPick: handleAddPick, updateNode, deleteNode,
  };

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
        <FlowLevel node={book} {...dnd} />
      </div>
    </div>
  );
}

// Only Scenes are cards. Every other type (Book/Part/Chapter) is always a
// dividing line, however deep it sits — never a boxed section — so the
// only thing that ever renders as a card is the actual unit of prose.
function FlowLevel({ node, ...dnd }) {
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
    if (child.type === 'scene') {
      row.push({ child, index: i });
    } else {
      if (row.length) { groups.push({ type: 'row', items: row }); row = []; }
      groups.push({ type: 'divider', child, index: i });
    }
  });
  if (row.length) groups.push({ type: 'row', items: row });

  return (
    <div className="layout-flow">
      {groups.map((g, gi) => {
        if (g.type === 'row') {
          return g.items.map(({ child, index }) => (
            <LayoutCard
              key={child.id}
              card={child}
              isDragging={dnd.dragId === child.id}
              isDropBefore={dnd.dropTarget?.parentId === node.id && dnd.dropTarget.index === index}
              onDragStart={() => dnd.setDragId(child.id)}
              onDragEnd={() => { dnd.setDragId(null); dnd.setDropTarget(null); }}
              onDragOver={(e) => {
                e.preventDefault(); e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width;
                dnd.setDropTarget({ parentId: node.id, index: relX < 0.5 ? index : index + 1 });
              }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dnd.onDrop(); }}
              onRename={(title) => dnd.updateNode(child.id, { title })}
              onDescriptionChange={(val) => dnd.updateNode(child.id, { description: val })}
              onDelete={() => { if (window.confirm('Delete "' + child.title + '"?')) dnd.deleteNode(child.id); }}
            />
          ));
        }
        return <Divider key={g.child.id} node={g.child} index={g.index} parentId={node.id} {...dnd} />;
      })}
    </div>
  );
}

function Divider({ node, index, parentId, dragId, setDragId, dropTarget, setDropTarget, onDrop, addAnchor, setAddAnchor, onAddPick, updateNode, deleteNode, ...rest }) {
  const isDragging = dragId === node.id;
  const isDropBefore = dropTarget?.parentId === parentId && dropTarget.index === index;

  return (
    <div
      className={"layout-branch" + (isDragging ? " dragging" : "") + (isDropBefore ? " drop-before" : "")}
      onDragOver={(e) => {
        e.preventDefault(); e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const relY = (e.clientY - rect.top) / rect.height;
        setDropTarget({ parentId, index: relY < 0.5 ? index : index + 1 });
      }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
    >
      <div
        className={"layout-divider layout-divider-" + node.type}
        draggable
        onDragStart={(e) => { e.stopPropagation(); setDragId(node.id); }}
        onDragEnd={() => { setDragId(null); setDropTarget(null); }}
      >
        <GripVertical size={12} className="layout-section-grip" />
        <input className="layout-divider-title" value={node.title} onChange={(e) => updateNode(node.id, { title: e.target.value })} />
        <div className="layout-section-actions">
          <button className="tree-action-btn" onClick={(e) => setAddAnchor({ el: e.currentTarget, parentId: node.id })} title="Add inside">
            <Plus size={11} />
          </button>
          <button
            className="tree-action-btn danger"
            onClick={() => { if (window.confirm('Delete "' + node.title + '" and everything in it?')) deleteNode(node.id); }}
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {addAnchor?.parentId === node.id && (
        <AddTypeMenu anchorEl={addAnchor.el} onPick={onAddPick} onClose={() => setAddAnchor(null)} />
      )}
      <FlowLevel
        node={node}
        dragId={dragId} setDragId={setDragId} dropTarget={dropTarget} setDropTarget={setDropTarget}
        onDrop={onDrop} addAnchor={addAnchor} setAddAnchor={setAddAnchor} onAddPick={onAddPick}
        updateNode={updateNode} deleteNode={deleteNode} {...rest}
      />
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
      className={"layout-card" + (isDragging ? " dragging" : "") + (isDropBefore ? " drop-before" : "") + (descVal ? " has-notes" : "")}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button className="layout-card-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
        <Trash2 size={11} />
      </button>
      <input className="layout-card-title" value={titleVal} onChange={handleTitleChange} onClick={(e) => e.stopPropagation()} />
      <textarea
        className="layout-card-notes"
        value={descVal}
        onChange={handleDescChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Description..."
      />
    </div>
  );
}
