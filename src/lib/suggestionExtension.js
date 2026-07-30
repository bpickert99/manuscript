import { Mark, Extension, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';
import { colorForName } from './nameColor';

// Two marks record tracked changes: text a reviewer typed (suggestionInsert)
// and text a reviewer deleted, which is kept in the document — struck
// through — rather than actually removed (suggestionDelete). Both carry a
// shared `id` per edit so accept/reject can act on a whole edit at once.
const suggestionAttrs = {
  id: { default: null },
  author: { default: null },
  createdAt: { default: null },
};

export const SuggestionInsert = Mark.create({
  name: 'suggestionInsert',
  addAttributes() {
    return suggestionAttrs;
  },
  parseHTML() {
    return [{ tag: 'ins[data-suggestion-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'ins',
      mergeAttributes(HTMLAttributes, {
        'data-suggestion-id': HTMLAttributes.id,
        class: 'suggestion-insert',
        style: `--suggestion-color:${colorForName(HTMLAttributes.author)}`,
      }),
      0,
    ];
  },
});

export const SuggestionDelete = Mark.create({
  name: 'suggestionDelete',
  addAttributes() {
    return suggestionAttrs;
  },
  parseHTML() {
    return [{ tag: 'del[data-suggestion-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'del',
      mergeAttributes(HTMLAttributes, {
        'data-suggestion-id': HTMLAttributes.id,
        class: 'suggestion-delete',
        style: `--suggestion-color:${colorForName(HTMLAttributes.author)}`,
      }),
      0,
    ];
  },
});

function addMarkToFragment(fragment, mark) {
  const nodes = [];
  fragment.forEach((node) => {
    if (node.isText || node.isLeaf) {
      nodes.push(node.mark(mark.addToSet(node.marks)));
    } else {
      nodes.push(node.copy(addMarkToFragment(node.content, mark)));
    }
  });
  return Fragment.fromArray(nodes);
}

// Diffs each transaction against the doc it started from and converts plain
// insertions/deletions into tracked-change marks instead of letting them
// through as real edits.
export const SuggestionMode = Extension.create({
  name: 'suggestionMode',

  addOptions() {
    return { enabled: false, author: 'Reviewer' };
  },

  addExtensions() {
    return [SuggestionInsert, SuggestionDelete];
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: new PluginKey('suggestionMode'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!options.enabled) return null;
          const relevant = transactions.some((tr) => tr.docChanged && !tr.getMeta('suggestionSkip'));
          if (!relevant) return null;

          const oldDoc = oldState.doc;
          const newDoc = newState.doc;
          const start = oldDoc.content.findDiffStart(newDoc.content);
          if (start === null) return null;
          const diffEnd = oldDoc.content.findDiffEnd(newDoc.content);
          if (!diffEnd) return null;
          const { a: oldEnd, b: newEnd } = diffEnd;

          const suggestionId = 'sg-' + Math.random().toString(36).slice(2, 10);
          const author = options.author || 'Reviewer';
          const createdAt = Date.now();

          let tr = newState.tr;

          if (newEnd > start) {
            const insertMark = newState.schema.marks.suggestionInsert.create({ id: suggestionId, author, createdAt });
            tr = tr.addMark(start, newEnd, insertMark);
          }

          if (oldEnd > start) {
            const deletedSlice = oldDoc.slice(start, oldEnd);
            if (deletedSlice.size > 0) {
              const deleteMark = newState.schema.marks.suggestionDelete.create({ id: suggestionId, author, createdAt });
              const markedFragment = addMarkToFragment(deletedSlice.content, deleteMark);
              tr = tr.insert(start, markedFragment);
            }
          }

          tr.setMeta('suggestionSkip', true);
          tr.setMeta('addToHistory', false);
          return tr;
        },
      }),
    ];
  },
});

// Walks a live editor's document collecting every suggestion mark, grouped
// by id, for rendering an accept/reject list.
export function collectSuggestions(doc) {
  const byId = {};
  doc.descendants((node, pos) => {
    if (!node.isText && !node.isLeaf) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== 'suggestionInsert' && mark.type.name !== 'suggestionDelete') return;
      const id = mark.attrs.id;
      if (!byId[id]) {
        byId[id] = {
          id,
          author: mark.attrs.author,
          createdAt: mark.attrs.createdAt,
          insertedText: '',
          deletedText: '',
        };
      }
      const text = node.isText ? node.text : '';
      if (mark.type.name === 'suggestionInsert') byId[id].insertedText += text;
      else byId[id].deletedText += text;
    });
  });
  return Object.values(byId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// Accepts or rejects every mark range sharing a suggestion id.
export function resolveSuggestion(editor, suggestionId, decision) {
  const { state } = editor;
  const insertRanges = [];
  const deleteRanges = [];
  state.doc.descendants((node, pos) => {
    if (!node.isText && !node.isLeaf) return;
    node.marks.forEach((mark) => {
      if (mark.attrs.id !== suggestionId) return;
      const range = { from: pos, to: pos + node.nodeSize };
      if (mark.type.name === 'suggestionInsert') insertRanges.push(range);
      if (mark.type.name === 'suggestionDelete') deleteRanges.push(range);
    });
  });
  if (insertRanges.length === 0 && deleteRanges.length === 0) return;

  const tr = state.tr;
  const insertMarkType = state.schema.marks.suggestionInsert;
  const deleteMarkType = state.schema.marks.suggestionDelete;

  if (decision === 'accept') {
    insertRanges.forEach(({ from, to }) => tr.removeMark(from, to, insertMarkType));
    [...deleteRanges].sort((a, b) => b.from - a.from).forEach(({ from, to }) => tr.delete(from, to));
  } else {
    deleteRanges.forEach(({ from, to }) => tr.removeMark(from, to, deleteMarkType));
    [...insertRanges].sort((a, b) => b.from - a.from).forEach(({ from, to }) => tr.delete(from, to));
  }
  tr.setMeta('suggestionSkip', true);
  tr.setMeta('addToHistory', false);
  editor.view.dispatch(tr);
}

// Same idea as collectSuggestions but works on plain Tiptap JSON, so
// callers can show a pending-suggestion count without mounting an editor.
export function countSuggestionsInJSON(json) {
  const ids = new Set();
  function walk(node) {
    if (!node) return;
    (node.marks || []).forEach((m) => {
      if (m.type === 'suggestionInsert' || m.type === 'suggestionDelete') ids.add(m.attrs?.id);
    });
    (node.content || []).forEach(walk);
  }
  walk(json);
  return ids.size;
}

// True once a doc has zero pending suggestion marks.
export function hasNoPendingSuggestions(doc) {
  let clean = true;
  doc.descendants((node) => {
    if (!clean) return false;
    if (!node.isText && !node.isLeaf) return true;
    if (node.marks.some((m) => m.type.name === 'suggestionInsert' || m.type.name === 'suggestionDelete')) {
      clean = false;
      return false;
    }
    return true;
  });
  return clean;
}
