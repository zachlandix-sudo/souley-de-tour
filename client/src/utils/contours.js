// Depth contours, like the lines on a nautical chart of Sogod Bay.
// A smooth height field is built from a seed, then sliced at even levels (marching squares).
// The same seed always gives the same map, so every spot gets its own placeholder.

export function hashSeed(input) {
  let h = 2166136261;
  for (const ch of String(input ?? '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeField(seed, width, height) {
  const r = rng(hashSeed(seed));
  const peaks = Array.from({ length: 3 + Math.floor(r() * 2) }, () => ({
    x: width * (0.2 + r() * 0.7), y: height * (0.15 + r() * 0.7),
    sx: width * (0.14 + r() * 0.18), sy: height * (0.16 + r() * 0.22), a: 0.55 + r() * 0.45,
  }));
  const p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
  const k = Math.max(width, height) / 1000;
  return (x, y) => {
    let v = 0;
    for (const p of peaks) v += p.a * Math.exp(-(((x - p.x) ** 2) / (2 * p.sx ** 2) + ((y - p.y) ** 2) / (2 * p.sy ** 2)));
    v += 0.07 * Math.sin(x / (210 * k) + p1) * Math.cos(y / (160 * k) + p2);
    v += 0.04 * Math.sin((x + y) / (95 * k) + p3);
    return v;
  };
}

// A rolling seabed that fills any size (the seeded map above fades to flat away from its peaks, which leaves big empty areas).
// Used where the chart has to cover a large moving area, such as the home page town journey.
export function makeTerrain(seed) {
  const r = rng(hashSeed(seed));
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28];
  return (x, y) => 0.55
    + 0.30 * Math.sin(x / 230 + ph[0]) * Math.cos(y / 190 + ph[1])
    + 0.22 * Math.sin((x * 0.8 + y) / 300 + ph[2])
    + 0.12 * Math.sin((y - x * 0.6) / 120 + ph[3]);
}

function chaikin(pts, closed) {
  let out = pts;
  for (let pass = 0; pass < 2; pass++) {
    const next = [];
    const n = out.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = out[i], b = out[(i + 1) % n];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out = closed ? next : [out[0], ...next, out[n - 1]];
  }
  return out;
}

function sliceLevel(f, level, cols, rows, cw, ch) {
  // Edge ids: h:i:j is the top edge of cell (i,j); v:i:j is its left edge.
  const val = (i, j) => f(i * cw, j * ch);
  const grid = [];
  for (let j = 0; j <= rows; j++) { const row = []; for (let i = 0; i <= cols; i++) row.push(val(i, j)); grid.push(row); }
  const pointOn = (id) => {
    const [t, i, j] = id.split(':'); const I = +i, J = +j;
    const [a, b] = t === 'h' ? [grid[J][I], grid[J][I + 1]] : [grid[J][I], grid[J + 1][I]];
    const u = (level - a) / (b - a || 1e-9);
    return t === 'h' ? [(I + u) * cw, J * ch] : [I * cw, (J + u) * ch];
  };
  const adj = new Map();
  const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const tl = grid[j][i] >= level, tr = grid[j][i + 1] >= level, br = grid[j + 1][i + 1] >= level, bl = grid[j + 1][i] >= level;
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const T = `h:${i}:${j}`, B = `h:${i}:${j + 1}`, L = `v:${i}:${j}`, R = `v:${i + 1}:${j}`;
      const segs = { 1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[T, L], [B, R]], 6: [[T, B]], 7: [[T, L]], 8: [[T, L]], 9: [[T, B]], 10: [[T, R], [L, B]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]] }[code];
      segs.forEach(([a, b]) => link(a, b));
    }
  }
  const seen = new Set();
  const lines = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    // Walk to one end of the chain (or all the way round a loop), then trace it.
    let begin = start, prev = null, loop = false;
    for (;;) {
      const next = adj.get(begin).find((n) => n !== prev);
      if (!next || next === start) { loop = next === start; break; }
      prev = begin; begin = next;
    }
    const ids = [begin]; seen.add(begin);
    let p = null, cur = begin;
    for (;;) {
      const next = adj.get(cur).find((n) => n !== p && !seen.has(n));
      if (!next) break;
      ids.push(next); seen.add(next); p = cur; cur = next;
    }
    if (ids.length < 4) continue;
    lines.push({ pts: chaikin(ids.map(pointOn), loop), closed: loop });
  }
  return lines;
}

const toPath = ({ pts, closed }) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${closed ? 'Z' : ''}`;

// Returns [{ d, major, level }]; level counts up from the shallow edge towards the deep centre.
export function contourPaths({ seed = 'souley', width = 1600, height = 900, levels = 14, cell = 22, terrain = false } = {}) {
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const f = terrain ? makeTerrain(seed) : makeField(seed, width, height);
  const out = [];
  for (let n = 0; n < levels; n++) {
    const level = 0.1 + n * 0.075;
    sliceLevel(f, level, cols, rows, cell, cell).forEach((line) => out.push({ d: toPath(line), major: n % 4 === 3, level: n }));
  }
  return out;
}
