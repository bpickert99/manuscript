import { Extension } from '@tiptap/core';

const INDENT_STEP_PX = 24;
const MAX_INDENT = 8;

// Adds a paragraph/blockquote `indent` attribute (rendered as margin-left)
// plus Tab / Shift-Tab and toolbar commands to change it.
export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'blockquote'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = parseInt(element.style.marginLeft || '0', 10);
              return Number.isNaN(value) ? 0 : Math.round(value / INDENT_STEP_PX);
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent * INDENT_STEP_PX}px` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const step = (delta) => () => ({ tr, state, dispatch }) => {
      const { $from, $to } = state.selection;
      let changed = false;
      state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (this.options.types.includes(node.type.name)) {
          const level = Math.min(Math.max((node.attrs.indent || 0) + delta, 0), MAX_INDENT);
          if (level !== node.attrs.indent) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: level });
            changed = true;
          }
        }
      });
      if (changed && dispatch) dispatch(tr);
      return changed;
    };

    return {
      indent: step(1),
      outdent: step(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    };
  },
});
