// Quick jump (Ctrl K): which commands match what was typed, best first.
// Each command: { id, label, keywords?: 'words people might type' }. Empty query = the list as it is.
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

function score(cmd, q) {
  const label = norm(cmd.label);
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  const kw = norm(cmd.keywords);
  if (kw.split(/\s+/).some((w) => w.startsWith(q))) return 30;
  if (kw.includes(q)) return 20;
  return 0;
}

export function rankCommands(items, query) {
  const q = norm(query);
  if (!q) return items;
  return items
    .map((c, i) => ({ c, i, s: score(c, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}
