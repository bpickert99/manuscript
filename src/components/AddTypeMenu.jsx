import React from 'react';
import PortalMenu from './PortalMenu';
import { Book, Layers, FileText, AlignLeft } from 'lucide-react';

export const NODE_ICONS = {
  book: Book,
  part: Layers,
  chapter: FileText,
  scene: AlignLeft,
};

export const ADD_TYPES = [
  { type: 'book', label: 'Book', icon: Book },
  { type: 'part', label: 'Part', icon: Layers },
  { type: 'chapter', label: 'Chapter', icon: FileText },
  { type: 'scene', label: 'Scene', icon: AlignLeft },
];

// Type always determines visual nesting level, regardless of how deep a
// node actually sits in the tree — a Chapter looks like a Chapter whether
// it's directly under a Book or three Parts deep.
export const TYPE_LEVEL = { book: 0, part: 1, chapter: 2, scene: 3 };

export default function AddTypeMenu({ anchorEl, onPick, onClose }) {
  return (
    <PortalMenu anchorEl={anchorEl} onClose={onClose} className="add-type-menu">
      {ADD_TYPES.map(({ type, label, icon: Icon }) => (
        <button key={type} className="add-type-menu-item" onClick={() => onPick(type)}>
          <Icon size={13} />
          {label}
        </button>
      ))}
    </PortalMenu>
  );
}
