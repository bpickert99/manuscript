// Walks a Tiptap JSON doc collecting every wikiLink node's target entryId.
export function outgoingLinkIds(content) {
  const ids = [];
  function walk(node) {
    if (!node) return;
    if (node.type === 'wikiLink' && node.attrs?.entryId) ids.push(node.attrs.entryId);
    (node.content || []).forEach(walk);
  }
  walk(content);
  return ids;
}

// Every other entry whose content links to targetId.
export function findBacklinks(entries, targetId) {
  return entries.filter((e) => e.id !== targetId && outgoingLinkIds(e.content).includes(targetId));
}

// The entries targetId itself links out to, resolved against the live list
// (so a renamed or deleted target is reflected immediately).
export function findOutgoing(entries, entry) {
  const ids = new Set(outgoingLinkIds(entry?.content));
  return entries.filter((e) => ids.has(e.id));
}
