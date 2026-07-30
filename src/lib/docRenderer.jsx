import React from 'react';

// Renders the subset of Tiptap JSON this app's editor produces
// (paragraph, blockquote, text with bold/italic marks, hardBreak).

function renderMarks(text, marks = []) {
  return marks.reduce((el, mark) => {
    if (mark.type === 'bold') return <strong>{el}</strong>;
    if (mark.type === 'italic') return <em>{el}</em>;
    return el;
  }, text);
}

function renderInline(nodes = []) {
  return nodes.map((n, i) => {
    if (n.type === 'text') return <React.Fragment key={i}>{renderMarks(n.text, n.marks)}</React.Fragment>;
    if (n.type === 'hardBreak') return <br key={i} />;
    return null;
  });
}

// Top-level blocks of a Tiptap doc — the unit comments anchor to.
export function docToBlocks(content) {
  return content?.content || [];
}

export function renderBlock(node, key) {
  if (node.type === 'blockquote') {
    return (
      <blockquote key={key}>
        {(node.content || []).map((p, i) => (
          <p key={i}>{renderInline(p.content)}</p>
        ))}
      </blockquote>
    );
  }
  const inline = renderInline(node.content);
  return <p key={key}>{inline.length ? inline : <br />}</p>;
}
