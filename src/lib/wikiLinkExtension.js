import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

// [[Title]] wiki-links, Obsidian-style: typing "[[" opens a searchable
// dropdown of existing entries (or an option to create a new one), and
// picking one inserts an atomic, clickable link node. Links are stored by
// entry id, not by title text, so renaming an entry never breaks a link.
export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      getEntries: () => [],
      onCreateNew: async () => null,
      onNavigate: () => {},
    };
  },

  addAttributes() {
    return {
      entryId: { default: null },
      label: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-wiki-link': node.attrs.entryId || '', class: 'wiki-link' }),
      '[[' + node.attrs.label + ']]',
    ];
  },

  renderText({ node }) {
    return '[[' + node.attrs.label + ']]';
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'wiki-link' + (node.attrs.entryId ? '' : ' wiki-link-broken');
      dom.dataset.wikiLink = node.attrs.entryId || '';
      dom.textContent = node.attrs.label;
      dom.title = node.attrs.entryId ? 'Open "' + node.attrs.label + '"' : 'Entry not found';
      dom.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (node.attrs.entryId) this.options.onNavigate(node.attrs.entryId);
      });
      return { dom };
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,
        pluginKey: new PluginKey('wikiLink'),
        items: ({ query }) => {
          const all = options.getEntries();
          const q = query.trim().toLowerCase();
          const filtered = q
            ? all.filter((e) => e.title.toLowerCase().includes(q))
            : all;
          const items = filtered.slice(0, 8).map((e) => ({ id: e.id, title: e.title, isNew: false }));
          const exact = all.some((e) => e.title.toLowerCase() === q);
          if (q && !exact) items.push({ id: null, title: query.trim(), isNew: true });
          return items;
        },
        command: async ({ editor, range, props }) => {
          let entryId = props.id;
          if (props.isNew) {
            entryId = await options.onCreateNew(props.title);
          }
          if (!entryId) return;
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              { type: 'wikiLink', attrs: { entryId, label: props.title } },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
        render: () => {
          let element = null;
          let selectedIndex = 0;
          let currentItems = [];
          let currentCommand = () => {};

          function renderList() {
            if (!element) return;
            element.innerHTML = '';
            if (currentItems.length === 0) {
              const empty = document.createElement('div');
              empty.className = 'wiki-suggest-empty';
              empty.textContent = 'Type to search or create a new entry...';
              element.appendChild(empty);
              return;
            }
            currentItems.forEach((item, i) => {
              const row = document.createElement('div');
              row.className = 'wiki-suggest-item' + (i === selectedIndex ? ' selected' : '');
              row.textContent = item.isNew ? 'Create "' + item.title + '"' : item.title;
              row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                currentCommand(item);
              });
              element.appendChild(row);
            });
          }

          function updatePosition(clientRect) {
            if (!element || !clientRect) return;
            const rect = clientRect();
            if (!rect) return;
            element.style.left = rect.left + window.scrollX + 'px';
            element.style.top = rect.bottom + window.scrollY + 4 + 'px';
          }

          return {
            onStart: (props) => {
              currentCommand = props.command;
              currentItems = props.items;
              selectedIndex = 0;
              element = document.createElement('div');
              element.className = 'wiki-suggest-menu';
              document.body.appendChild(element);
              renderList();
              updatePosition(props.clientRect);
            },
            onUpdate: (props) => {
              currentCommand = props.command;
              currentItems = props.items;
              selectedIndex = 0;
              renderList();
              updatePosition(props.clientRect);
            },
            onKeyDown: (props) => {
              if (!currentItems.length && props.event.key !== 'Escape') return false;
              if (props.event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                renderList();
                return true;
              }
              if (props.event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
                renderList();
                return true;
              }
              if (props.event.key === 'Enter') {
                if (currentItems[selectedIndex]) currentCommand(currentItems[selectedIndex]);
                return true;
              }
              if (props.event.key === 'Escape') {
                element?.remove();
                element = null;
                return true;
              }
              return false;
            },
            onExit: () => {
              element?.remove();
              element = null;
            },
          };
        },
      }),
    ];
  },
});
