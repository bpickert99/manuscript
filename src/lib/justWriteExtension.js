import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Finds the position right after the last whitespace character in the
// document — i.e. the start of the word currently being typed. Anything
// before that position is locked while Just Write mode is on.
function computeLockBoundary(doc) {
  let boundary = 0;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    boundary = pos + 1;
    node.forEach((child, offset) => {
      if (!child.isText) return;
      const text = child.text;
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) {
          boundary = pos + 1 + offset + i + 1;
        }
      }
    });
    return false;
  });
  return boundary;
}

export const JustWrite = Extension.create({
  name: 'justWrite',

  addStorage() {
    return { enabled: false };
  },

  addCommands() {
    return {
      setJustWrite:
        (enabled) =>
        () => {
          this.storage.enabled = enabled;
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: new PluginKey('justWrite'),
        filterTransaction: (tr, state) => {
          if (!storage.enabled || !tr.docChanged) return true;
          const boundary = computeLockBoundary(state.doc);
          let allowed = true;
          tr.mapping.maps.forEach((stepMap) => {
            stepMap.forEach((fromA) => {
              if (fromA < boundary) allowed = false;
            });
          });
          return allowed;
        },
      }),
    ];
  },
});
