const PALETTE = ['#2c4a6e', '#5a7a3e', '#8b5a2b', '#6a3d7a', '#2e6e6e', '#8b3030', '#4a6e2c', '#6e4a2c'];

export function colorForName(name) {
  const str = name || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
