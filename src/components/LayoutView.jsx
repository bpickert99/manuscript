import React, { useState, useRef, useEffect } from 'react';
import { useApp, buildTree } from '../context/AppContext';
import { Plus, Trash2, GripVertical } from 'lucide-react';

function findInTree(list, id) {
  for (const n of list) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

// A corkboard-style layout of the currently selected node's structure:
// direct children with their own children become groups (e.g. chapters),
// each showing a row of cards for its own children (e.g. scenes). Cards
// and groups are both drag-to-reorder/reparent, which moves the same
// underlying nodes the sidebar and editor use.
export default function LayoutView() {
  const { currentNodeId, nodes, addNode, updateNode, deleteNode, moveNode, selectNode } = useApp();
  const tree = buildTree(nodes);
  const node = currentNodeId ? findInTree(tree, currentNodeId) : null;

  const [dragCardId, setDragCardId] = useState(null);
  const [cardDropTarget, setCardDropTarget] = useState(null); // { groupId, index }
  const [dragGroupId, setDragGroupId] = useState(null);
  const [groupDropIndex, setGroupDropIndex] = useState(null);

  if (!node) {
    return (
      <div className="layout-empty">
        <p>Select a book or part from the sidebar to lay out its structure.</p>
      </div>
    );
  }

  const groups = node.children.filter((c) => c.children && c.children.length > 0);
  const looseCards = node.children.filter((c) => !c.children || c.children.length === 0);

  function handleCardDragOver(e, groupId, index) {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    setCardDropTarget({ groupId, index: relX < 0.5 ? index : index + 1 });
  }

  async function handleCardDrop() {
    if (!dragCardId || !cardDropTarget) return;
    await moveNode(dragCardId, cardDropTarget.groupId, cardDropTarget.index);
    setDragCardId(null);
    setCardDropTarget(null);
  }

  async function handleGroupRowDrop(groupId) {
    if (!dragCardId) return;
    const group = groups.find((g) => g.id === groupId);
    await moveNode(dragCardId, groupId, group ? group.children.length : 0);
    setDragCardId(null);
    setCardDropTarget(null);
  }

  function handleGroupDragOver(e, index) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    setGroupDropIndex(relX < 0.5 ? index : index + 1);
  }

  async function handleGroupDrop() {
    if (dragGroupId == null || groupDropIndex == null) return;
    await moveNode(dragGroupId, node.id, groupDropIndex);
    setDragGroupId(null);
    setGroupDropIndex(null);
  }

  return (
    <div className="layout-wrap">
      <div className="layout-toolbar">
        <span className="layout-toolbar-title">Layout — {node.title}</span>
        <button className="btn-sm" onClick={() => addNode('chapter', node.id)}>
          <Plus size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />
          Add Section
        </button>
      </div>

      <div className="layout-scroll">
        {looseCards.length > 0 && (
          <div className="layout-group">
            <div className="layout-card-row" onDragOver={(e) => e.preventDefault()} onDrop={() => handleGroupRowDrop(node.id)}>
              {looseCards.map((c, i) => (
                <LayoutCard
                  key={c.id}
                  card={c}
                  isDragging={dragCardId === c.id}
                  isDropBefore={cardDropTarget?.groupId === node.id && cardDropTarget.index === i}
                  onSelect={() => selectNode(c.id)}
                  onDragStart={() => setDragCardId(c.id)}
                  onDragEnd={() => { setDragCardId(null); setCardDropTarget(null); }}
                  onDragOver={(e) => handleCardDragOver(e, node.id, i)}
                  onDrop={handleCardDrop}
                  onRename={(title) => updateNode(c.id, { title })}
                  onNotesChange={(notesVal) => updateNode(c.id, { notes: notesVal })}
                  onDelete={() => { if (window.confirm('Delete "' + c.title + '"?')) deleteNode(c.id); }}
                />
              ))}
            </div>
          </div>
        )}

        {groups.map((group, gi) => (
          <div
            className={"layout-group" + (dragGroupId === group.id ? " dragging" : "") + (groupDropIndex === gi ? " drop-before" : "") + (groupDropIndex === gi + 1 && gi === groups.length - 1 ? " drop-after" : "")}
            key={group.id}
            onDragOver={(e) => handleGroupDragOver(e, gi)}
            onDrop={handleGroupDrop}
          >
            <div
              className="layout-group-header"
              draggable
              onDragStart={(e) => { e.stopPropagation(); setDragGroupId(group.id); }}
              onDragEnd={() => { setDragGroupId(null); setGroupDropIndex(null); }}
            >
              <GripVertical size={13} className="layout-group-grip" />
              <input
                className="layout-group-title"
                value={group.title}
                onChange={(e) => updateNode(group.id, { title: e.target.value })}
              />
              <button
                className="tree-action-btn danger"
                title="Delete section"
                onClick={() => { if (window.confirm('Delete "' + group.title + '" and everything in it?')) deleteNode(group.id); }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="layout-card-row" onDragOver={(e) => e.preventDefault()} onDrop={() => handleGroupRowDrop(group.id)}>
              {group.children.map((c, i) => (
                <LayoutCard
                  key={c.id}
                  card={c}
                  isDragging={dragCardId === c.id}
                  isDropBefore={cardDropTarget?.groupId === group.id && cardDropTarget.index === i}
                  onSelect={() => selectNode(c.id)}
                  onDragStart={() => setDragCardId(c.id)}
                  onDragEnd={() => { setDragCardId(null); setCardDropTarget(null); }}
                  onDragOver={(e) => handleCardDragOver(e, group.id, i)}
                  onDrop={handleCardDrop}
                  onRename={(title) => updateNode(c.id, { title })}
                  onNotesChange={(notesVal) => updateNode(c.id, { notes: notesVal })}
                  onDelete={() => { if (window.confirm('Delete "' + c.title + '"?')) deleteNode(c.id); }}
                />
              ))}
              <button className="layout-add-card" onClick={() => addNode('scene', group.id)}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        ))}

        {groups.length === 0 && looseCards.length === 0 && (
          <div className="layout-empty">
            <p>Nothing here yet. Add a section to start laying out "{node.title}".</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LayoutCard({ card, isDragging, isDropBefore, onSelect, onDragStart, onDragEnd, onDragOver, onDrop, onRename, onNotesChange, onDelete }) {
  const [titleVal, setTitleVal] = useState(card.title);
  const [notesVal, setNotesVal] = useState(card.notes || '');
  const titleTimer = useRef(null);
  const notesTimer = useRef(null);

  useEffect(() => { setTitleVal(card.title); }, [card.id, card.title]);
  useEffect(() => { setNotesVal(card.notes || ''); }, [card.id]);
  useEffect(() => () => { clearTimeout(titleTimer.current); clearTimeout(notesTimer.current); }, []);

  function handleTitleChange(e) {
    setTitleVal(e.target.value);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => onRename(e.target.value), 900);
  }

  function handleNotesChange(e) {
    setNotesVal(e.target.value);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onNotesChange(e.target.value), 900);
  }

  return (
    <div
      className={"layout-card" + (isDragging ? " dragging" : "") + (isDropBefore ? " drop-before" : "")}
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDrop(); }}
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
        value={notesVal}
        onChange={handleNotesChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Notes..."
      />
      <button className="layout-card-open" onClick={onSelect}>Open in Write →</button>
    </div>
  );
}
