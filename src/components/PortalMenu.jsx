import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Renders children into document.body, positioned below (or above, if
// there's no room) the given anchor element. Escapes any ancestor's
// `overflow: hidden`/`auto` clipping, closes on outside click or Escape.
export default function PortalMenu({ anchorEl, onClose, children, className = '', align = 'left' }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 4;
    const left = align === 'right'
      ? rect.right + window.scrollX
      : rect.left + window.scrollX;
    setPos({ top, left, align });
  }, [anchorEl, align]);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && !anchorEl?.contains(e.target)) {
        onClose();
      }
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorEl, onClose]);

  if (!pos) return null;

  const style = {
    position: 'absolute',
    top: pos.top,
    ...(pos.align === 'right' ? { right: window.innerWidth - pos.left } : { left: pos.left }),
    zIndex: 9999,
  };

  return createPortal(
    <div ref={menuRef} className={className} style={style} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body
  );
}
