import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { WikiLink } from './wikiLinkExtension';

const HOVER_DELAY = 300;
const HIDE_DELAY = 250;
const PREVIEW_EXTENSIONS = [
  StarterKit.configure({ heading: false, codeBlock: false, code: false, horizontalRule: false, strike: false }),
  WikiLink,
];

// Attaches hover-to-preview behavior to any container holding rendered
// wiki-link spans (a live editor, or a previously-opened preview popup —
// this is called recursively on popups so hovering a link inside a
// preview can cascade into a further nested preview). Returns a handle
// with `destroy()` to remove listeners and close any open popup chain.
export function attachWikiHoverPreviews(container, { getEntries, onOpenTab }) {
  if (!container) return { destroy() {} };

  let hoverTimer = null;
  let hideTimer = null;
  let popupEl = null;
  let childHandle = null;

  function closePopup() {
    clearTimeout(hoverTimer);
    clearTimeout(hideTimer);
    if (childHandle) { childHandle.destroy(); childHandle = null; }
    if (popupEl) { popupEl.remove(); popupEl = null; }
  }

  function scheduleClose() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(closePopup, HIDE_DELAY);
  }

  function showPopup(link, entryId) {
    closePopup();
    const entry = getEntries().find((e) => e.id === entryId);
    if (!entry) return;

    const el = document.createElement('div');
    el.className = 'wiki-hover-popup';
    el.dataset.forEntry = entryId;

    const title = document.createElement('div');
    title.className = 'wiki-hover-popup-title';
    title.textContent = entry.title;
    el.appendChild(title);

    const body = document.createElement('div');
    body.className = 'wiki-hover-popup-body';
    try {
      body.innerHTML = entry.content
        ? generateHTML(entry.content, PREVIEW_EXTENSIONS)
        : '<p class="wiki-hover-popup-empty">No content yet.</p>';
    } catch {
      body.innerHTML = '<p class="wiki-hover-popup-empty">Preview unavailable.</p>';
    }
    el.appendChild(body);

    const openBtn = document.createElement('button');
    openBtn.className = 'wiki-hover-popup-open';
    openBtn.textContent = 'Open in new tab →';
    openBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (onOpenTab) onOpenTab(entryId);
    });
    el.appendChild(openBtn);

    document.body.appendChild(el);
    popupEl = el;

    const rect = link.getBoundingClientRect();
    el.style.left = rect.right + window.scrollX + 10 + 'px';
    el.style.top = rect.top + window.scrollY - 6 + 'px';
    requestAnimationFrame(() => {
      const bodyRect = el.getBoundingClientRect();
      if (bodyRect.right > window.innerWidth) {
        el.style.left = Math.max(8, rect.left + window.scrollX - bodyRect.width - 10) + 'px';
      }
      if (bodyRect.bottom > window.innerHeight) {
        el.style.top = Math.max(8, window.innerHeight - bodyRect.height - 8) + 'px';
      }
    });

    el.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    el.addEventListener('mouseleave', scheduleClose);

    childHandle = attachWikiHoverPreviews(el, { getEntries, onOpenTab });
  }

  function onMouseOver(e) {
    const link = e.target.closest('.wiki-link[data-wiki-link]');
    if (!link || !container.contains(link)) return;
    const entryId = link.dataset.wikiLink;
    if (!entryId) return;
    clearTimeout(hideTimer);
    if (popupEl && popupEl.dataset.forEntry === entryId) return;
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => showPopup(link, entryId), HOVER_DELAY);
  }

  function onMouseOut(e) {
    const link = e.target.closest('.wiki-link[data-wiki-link]');
    if (!link) return;
    clearTimeout(hoverTimer);
    scheduleClose();
  }

  container.addEventListener('mouseover', onMouseOver);
  container.addEventListener('mouseout', onMouseOut);

  return {
    destroy() {
      container.removeEventListener('mouseover', onMouseOver);
      container.removeEventListener('mouseout', onMouseOut);
      closePopup();
    },
  };
}
