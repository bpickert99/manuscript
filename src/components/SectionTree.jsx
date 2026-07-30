import React, { useEffect, useRef, useState } from 'react';
import LeafSection from './LeafSection';

export function SectionHeading({ node, depth, updateNode }) {
  const [val, setVal] = useState(node.title);
  const timer = useRef(null);

  useEffect(() => { setVal(node.title); }, [node.id]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(e) {
    setVal(e.target.value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateNode(node.id, { title: e.target.value }), 1200);
  }

  return (
    <input
      className={"agg-heading agg-heading-" + Math.min(depth, 3)}
      value={val}
      onChange={handleChange}
    />
  );
}

// Recursively renders a node: a heading for every branch below the page
// root, an editable LeafSection for every leaf, and a centered "• • •"
// scene break between two leaf siblings (scenes in the same chapter).
export default function SectionTree({ node, depth, updateNode, onFocusEditor }) {
  const isLeaf = !node.children || node.children.length === 0;
  if (isLeaf) {
    return <LeafSection node={node} onFocusEditor={onFocusEditor} />;
  }

  return (
    <div className="agg-branch">
      {depth > 0 && <SectionHeading node={node} depth={depth} updateNode={updateNode} />}
      {node.children.map((child, i) => {
        const childIsLeaf = !child.children || child.children.length === 0;
        const next = node.children[i + 1];
        const nextIsLeaf = next && (!next.children || next.children.length === 0);
        return (
          <React.Fragment key={child.id}>
            <SectionTree node={child} depth={depth + 1} updateNode={updateNode} onFocusEditor={onFocusEditor} />
            {childIsLeaf && nextIsLeaf && <div className="scene-break">• • •</div>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
