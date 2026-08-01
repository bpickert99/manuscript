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

// A corkboard-style layout of the currently selected node's structure, in
// the same order as the sidebar/manuscript view: each direct child is a
// "section" — if it has children of its own (e.g. a chapter) it shows as a
// header with a row of cards for its children (e.g. scenes); if it's a
// leaf it shows as a single card in that same position. Sections reorder
// against each other; cards reorder against their siblings within a
// section — both go through the same moveNode action the sidebar uses.
export default function LayoutView() {
  const { currentNodeId, nodes, addNode, updateNode, deleteNode, moveNode } = useApp();
  const tree = buildTree(nodes);
  const node = currentNodeId ? findInTree(tree, currentNodeId) : null;

  const [dragCardId, setDragCardId] = useState(null);
  const [cardDropTarget, setCardDropTarget] = useState(null); // { groupId, index }
  const [dragSectionId, setDragSectionId] = useState(null);
  const [sectionDropIndex, setSectionDropIndex] = useState(null);

  if (!node) {
    return (
      <div className="layout-empty">
        <p>Select a book or part from the sidebar to lay out its structure.</p>
      </div>
    );
  }

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

  async function handleGroupRowDrop(e, groupId, appendCount) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragCardId) return;
    await moveNode(dragCardId, groupId, appendCount);
    setDragCardId(null);
    setCardDropTarget(null);
  }

  function handleSectionDragOver(e, index) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    setSectionDropIndex(relY < 0.5 ? index : index + 1);
  }

  async function handleSectionDrop(e) {
    e.preventDefault();
    if (dragSectionId == null || sectionDropIndex == null) return;
    await moveNode(dragSectionId, node.id, sectionDropIndex);
    setDragSectionId(null);
    setSectionDropIndex(null);
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
        {node.children.map((section, si) => {
          const hasKids = section.children && section.children.length > 0;
          const sectionClass =
            "layout-group" +
            (dragSectionId === section.id ? " dragging" : "") +
            (sectionDropIndex === si ? " drop-before" : "") +
            (si === node.children.length - 1 && sectionDropIndex === si + 1 ? " drop-after" : "");

          if (!hasKids) {
            return (
              <div key={section.id} className={sectionClass} onDragOver={(e) => handleSectionDragOver(e, si)} onDrop={handleSectionDrop}>
                <LayoutCard
                  card={section}
                  isDragging={dragSectionId === section.id}
                  isDropBefore={false}
                  onDragStart={() => setDragSectionId(section.id)}
                  onDragEnd={() => { setDragSectionId(null); setSectionDropIndex(null); }}
                  onDragOver={(e) => handleSectionDragOver(e, si)}
                  onDrop={handleSectionDrop}
                  onRename={(title) => updateNode(section.id, { title })}
                  onDescriptionChange={(val) => updateNode(section.id, { description: val })}
                  onDelete={() => { if (window.confirm('Delete "' + section.title + '"?')) deleteNode(section.id); }}
                />
              </div>
            );
          }

          return (
            <div key={section.id} className={sectionClass} onDragOver={(e) => handleSectionDragOver(e, si)} onDrop={handleSectionDrop}>
              <div
                className="layout-group-header"
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragSectionId(section.id); }}
                onDragEnd={() => { setDragSectionId(null); setSectionDropIndex(null); }}
              >
                <GripVertical size={13} className="layout-group-grip" />
                <input
                  className="layout-group-title"
                  value={section.title}
                  onChange={(e) => updateNode(section.id, { title: e.target.value })}
                />
                <button
                  className="tree-action-btn danger"
                  title="Delete section"
                  onClick={() => { if (window.confirm('Delete "' + section.title + '" and everything in it?')) deleteNode(section.id); }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div
                className="layout-card-row"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => handleGroupRowDrop(e, section.id, section.children.length)}
              >
                {section.children.map((c, i) => (
                  <LayoutCard
                    key={c.id}
                    card={c}
                    isDragging={dragCardId === c.id}
                    isDropBefore={cardDropTarget?.groupId === section.id && cardDropTarget.index === i}
                    onDragStart={() => setDragCardId(c.id)}
                    onDragEnd={() => { setDragCardId(null); setCardDropTarget(null); }}
                    onDragOver={(e) => handleCardDragOver(e, section.id, i)}
                    onDrop={handleCardDrop}
                    onRename={(title) => updateNode(c.id, { title })}
                    onDescriptionChange={(val) => updateNode(c.id, { description: val })}
                    onDelete={() => { if (window.confirm('Delete "' + c.title + '"?')) deleteNode(c.id); }}
                  />
                ))}
                <button className="layout-add-card" onClick={() => addNode('scene', section.id)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {node.children.length === 0 && (
          <div className="layout-empty">
            <p>Nothing here yet. Add a section to start laying out "{node.title}".</p>
          </div>
        )}
      </div>
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
        value={descVal}
        onChange={handleDescChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Description of this scene — a summary, not the prose..."
      />
    </div>
  );
}
