// Small pure helpers for the admin charts (line, donut, bars). No React, no DOM.

export const PALETTE = ['#ff6a13', '#2b2b2b', '#1d7a4c', '#b53f08', '#8c8c8c', '#e0a060', '#5b7f95']; // site orange + black, then calm neutrals
export const OTHER_COLOR = '#cfc8ba';

const r2 = (n) => Math.round(n * 100) / 100;
export const fmt = (n) => Number(n || 0).toLocaleString();
export const sum = (items = []) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);

// "34%" of the total; a slice that exists but rounds to 0 reads "<1%"
export function pctText(value, total) {
  if (!total || !value) return '0%';
  const p = Math.round((value / total) * 100);
  return p === 0 ? '<1%' : `${p}%`;
}

// values -> points in a 0..100 box (y grows downwards, so the biggest value sits at the top)
export function seriesPoints(values = [], max = 1) {
  const n = values.length;
  const top = Math.max(1, Number(max) || 1);
  return values.map((v, i) => ({ x: n > 1 ? r2((i / (n - 1)) * 100) : 50, y: r2(100 - ((Number(v) || 0) / top) * 100) }));
}

// Smooth line through the points that never overshoots (monotone cubic, so a quiet day never dips below zero).
export function monotonePath(pts = []) {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  const dx = [];
  const m = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = dx[i] ? (pts[i + 1].y - pts[i].y) / dx[i] : 0;
  }
  const t = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i += 1) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += `C${r2(pts[i].x + h)},${r2(pts[i].y + t[i] * h)} ${r2(pts[i + 1].x - h)},${r2(pts[i + 1].y - t[i + 1] * h)} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

// the same line closed down to the baseline, for a soft fill underneath
export function areaPath(pts = [], baseline = 100) {
  if (pts.length < 2) return '';
  return `${monotonePath(pts)}L${pts[pts.length - 1].x},${baseline}L${pts[0].x},${baseline}Z`;
}

// Donut slices on a circle whose circumference is 100 (r = 15.9155), so lengths are percentages.
// Zero slices are left out; `gap` leaves a hairline between neighbours when there is more than one.
export function donutSlices(items = [], gap = 0.7) {
  const total = sum(items.filter((i) => i.value > 0));
  if (!total) return [];
  const shown = items.map((item, index) => ({ item, index })).filter(({ item }) => item.value > 0);
  let start = 0;
  return shown.map(({ item, index }) => {
    const pct = (item.value / total) * 100;
    const len = Math.max(0.4, pct - (shown.length > 1 ? gap : 0));
    const slice = { ...item, index, pct: r2(pct), start: r2(start), len: r2(len) };
    start += pct;
    return slice;
  });
}

// roughly `wanted` evenly spaced positions in 0..count-1, always including the first and last
export function axisIndexes(count, wanted = 6) {
  if (count <= 0) return [];
  if (count <= wanted) return Array.from({ length: count }, (_, i) => i);
  const out = new Set();
  for (let k = 0; k < wanted; k += 1) out.add(Math.round((k * (count - 1)) / (wanted - 1)));
  return [...out];
}
