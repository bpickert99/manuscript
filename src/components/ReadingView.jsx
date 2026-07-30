import React from 'react';
import { useApp, buildTree } from '../context/AppContext';
import { docToBlocks, renderBlock } from '../lib/docRenderer';
import { countWordsInContent } from '../lib/wordCount';

function collectLeaves(node, acc) {
  if (!node.children || node.children.length === 0) {
    acc.push(node);
  } else {
    node.children.forEach((c) => collectLeaves(c, acc));
  }
  return acc;
}

function findInTree(list, id) {
  for (const n of list) {
    if (n.id === id) return n;
    const found = findInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

// Read-only, concatenated view of every leaf descendant's content, in
// document order — selecting a Book/Part shows everything nested below it.
export default function ReadingView({ nodeId }) {
  const { nodes, selectNode } = useApp();
  const tree = buildTree(nodes);
  const node = findInTree(tree, nodeId);
  if (!node) return null;

  const leaves = collectLeaves(node, []);
  const totalWords = leaves.reduce((sum, l) => sum + countWordsInContent(l.content), 0);

  return (
    <div className="editor-wrap">
      <div className="reading-header">
        <div className="reading-header-title">{node.title}</div>
        <div className="reading-header-meta">
          Reading {leaves.length} section{leaves.length === 1 ? '' : 's'} · {totalWords.toLocaleString()} words
        </div>
      </div>
      <div className="editor-scroll reading-scroll">
        {leaves.length === 0 ? (
          <div className="editor-empty-state">
            <p>Nothing written under "{node.title}" yet.</p>
          </div>
        ) : (
          leaves.map((leaf) => {
            const blocks = docToBlocks(leaf.content);
            return (
              <div key={leaf.id} className="reading-section">
                <h3
                  className="reading-section-title"
                  onClick={() => selectNode(leaf.id)}
                  title="Open for editing"
                >
                  {leaf.title}
                </h3>
                {blocks.length === 0 ? (
                  <p className="reading-section-empty">Empty.</p>
                ) : (
                  blocks.map((b, i) => renderBlock(b, i))
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
