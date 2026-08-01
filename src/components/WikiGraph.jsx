import React from 'react';

function truncate(s, n = 18) {
  return s && s.length > n ? s.slice(0, n - 1) + '…' : s || 'Untitled';
}

// A local graph, Obsidian-style: the selected entry in the center, its
// linked/backlinking entries arranged around it, click to navigate.
export default function WikiGraph({ entry, connections, onNavigate }) {
  const cx = 300;
  const cy = 220;
  const radius = 160;
  const n = connections.length;

  return (
    <svg viewBox="0 0 600 440" className="wiki-graph-svg">
      {connections.map((c, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return <line key={c.id} x1={cx} y1={cy} x2={x} y2={y} className="wiki-graph-edge" />;
      })}

      {connections.map((c, i) => {
        const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return (
          <g key={c.id} className="wiki-graph-node" onClick={() => onNavigate(c.id)}>
            <circle cx={x} cy={y} r={20} />
            <text x={x} y={y + 34}>{truncate(c.title)}</text>
          </g>
        );
      })}

      <g className="wiki-graph-node wiki-graph-center">
        <circle cx={cx} cy={cy} r={28} />
        <text x={cx} y={cy + 46}>{truncate(entry.title)}</text>
      </g>

      {connections.length === 0 && (
        <text x={cx} y={cy + 80} className="wiki-graph-hint">No linked entries yet — type [[ in the text to link one.</text>
      )}
    </svg>
  );
}
