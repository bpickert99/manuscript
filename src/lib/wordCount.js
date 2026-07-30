export function countWordsInContent(content) {
  if (!content) return 0;
  let count = 0;
  function walk(node) {
    if (!node) return;
    if (node.type === 'text' && node.text) {
      count += node.text.trim().split(/\s+/).filter(Boolean).length;
    }
    if (node.content) node.content.forEach(walk);
  }
  walk(content);
  return count;
}

// Own word count + every descendant's, keyed by node id.
export function computeWordCounts(nodes) {
  const own = {};
  const childrenOf = {};
  nodes.forEach((n) => {
    own[n.id] = countWordsInContent(n.content);
    const p = n.parentId || null;
    if (!childrenOf[p]) childrenOf[p] = [];
    childrenOf[p].push(n.id);
  });

  const memo = {};
  function total(id) {
    if (memo[id] !== undefined) return memo[id];
    let sum = own[id] || 0;
    (childrenOf[id] || []).forEach((childId) => { sum += total(childId); });
    memo[id] = sum;
    return sum;
  }
  nodes.forEach((n) => total(n.id));
  return memo;
}
