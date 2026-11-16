import { stampLook, stampTilt } from './passport';

// The shareable passport card: a 1080 x 1350 picture (the size social apps like) drawn with the canvas, no extra library.
// The stamps here are simplified postmarks (same shape and ink as on the page, town and date inside).
export const CARD = { w: 1080, h: 1350 };
const COVER = { black: ['#2b2b2b', '#000000'], navy: ['#2c4a80', '#0a1428'], green: ['#2a6048', '#07170f'], burgundy: ['#78283a', '#1c070c'] };
const INK = { '#b53f08': '#ff8a4c', '#0e6b7a': '#46c4d8', '#3d3f94': '#9194f7', '#2e6b3b': '#74d48b' }; // brighter versions of the page inks, for a dark card
const GOLD = ['#ffc9a3', '#ff6a13', '#b5470a'];
const DISPLAY = '"Bodoni Moda", "Bodoni 72", Didot, "Times New Roman", serif';
const SANS = '"Hanken Grotesk", "Helvetica Neue", Arial, system-ui, sans-serif';
export const MAX_CARD_STAMPS = 6;

const font = (weight, size, family) => `${weight} ${Math.round(size)}px ${family}`;

// Shrinks the text until it fits `maxW`; if it still does not fit at `min` px, it is cut with an ellipsis.
function fitText(ctx, text, maxW, size, weight, family, min = 16) {
  let px = size;
  ctx.font = font(weight, px, family);
  while (ctx.measureText(text).width > maxW && px > min) { px -= 2; ctx.font = font(weight, px, family); }
  let out = text;
  while (ctx.measureText(out).width > maxW && out.length > 1) out = out.slice(0, -1);
  return out === text ? text : `${out.trimEnd()}…`;
}

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GOLD[0]); g.addColorStop(0.5, GOLD[1]); g.addColorStop(1, GOLD[2]);
  return g;
}

// The outline of a stamp, centred on (0, 0).
function outline(ctx, shape, r) {
  ctx.beginPath();
  if (shape === 'octagon') {
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i + Math.PI / 8;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  } else if (shape === 'scallop') {
    for (let i = 0; i <= 360; i += 1) {
      const a = (i / 360) * Math.PI * 2;
      const rr = r * (0.95 + 0.05 * Math.cos(a * 18));
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  } else if (shape === 'rect') {
    const w = r * 1.15, h = r * 0.82, k = 14;
    ctx.moveTo(-w + k, -h); ctx.arcTo(w, -h, w, h, k); ctx.arcTo(w, h, -w, h, k); ctx.arcTo(-w, h, -w, -h, k); ctx.arcTo(-w, -h, w, -h, k); ctx.closePath();
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
}

function drawStamp(ctx, cx, cy, r, stamp, locale) {
  const look = stampLook(stamp.id);
  const ink = INK[look.ink] || look.ink;
  const d = new Date(stamp.at);
  const day = Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale, { day: 'numeric' });
  const mon = Number.isNaN(d.getTime()) ? '' : `${d.toLocaleDateString(locale, { month: 'short' })} ${d.getFullYear()}`;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((stampTilt(stamp.id) * 1.5 * Math.PI) / 180);
  outline(ctx, look.shape, r);
  ctx.globalAlpha = 0.16; ctx.fillStyle = ink; ctx.fill();
  ctx.globalAlpha = 1; ctx.strokeStyle = ink; ctx.lineWidth = 7; ctx.stroke();
  ctx.save(); ctx.scale(0.86, 0.86); outline(ctx, look.shape, r); ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const k = r / 96; // everything inside the stamp scales with it
  const inner = r * (look.shape === 'rect' ? 1.55 : 1.22);
  ctx.font = font(900, 22 * k, SANS);
  ctx.fillText(fitText(ctx, (stamp.municipality || '').toUpperCase(), inner, 22 * k, 900, SANS, 11), 0, -r * 0.45);
  ctx.font = font(800, 60 * k, DISPLAY);
  ctx.fillText(day, 0, -2);
  ctx.font = font(800, 20 * k, SANS);
  ctx.fillText(mon.toUpperCase(), 0, r * 0.45);
  ctx.restore();
}

// Draws the whole card on `ctx` (a 2D canvas context). `data`:
// { color, rankLabel, count, total, townsVisited, badgeTowns[], stamps[{ id, name, municipality, at }] newest first,
//   holder: { name, homeTown, number } | null, origin, locale, title, progress, labels: { stamps, towns, badges, guest } }
export function drawPassportCard(ctx, data) {
  const { w, h } = CARD;
  const [c1, c2] = COVER[data.color] || COVER.black;
  const locale = data.locale || 'en-PH';
  const labels = data.labels || {};

  const bg = ctx.createRadialGradient(w * 0.3, 0, 40, w * 0.3, 0, h * 1.05);
  bg.addColorStop(0, c1); bg.addColorStop(0.7, c2); bg.addColorStop(1, '#050505');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  ctx.lineWidth = 3; ctx.strokeStyle = goldGradient(ctx, 0, 0, w, h); ctx.strokeRect(36, 36, w - 72, h - 72);
  ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.strokeRect(54, 54, w - 108, h - 108); ctx.globalAlpha = 1;

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = goldGradient(ctx, w * 0.25, 0, w * 0.75, 0);
  ctx.font = font(400, 96, DISPLAY);
  ctx.fillText(fitText(ctx, data.title || 'Leyte Passport', w - 200, 96, 400, DISPLAY, 48), w / 2, 180);
  ctx.font = font(700, 30, SANS); ctx.globalAlpha = 0.85;
  ctx.fillText('SOULEY de Tour', w / 2, 232); ctx.globalAlpha = 1;

  // progress ring
  const cx = w / 2, cy = 392, R = 112;
  const pct = data.total > 0 ? Math.min(1, data.count / data.total) : 0;
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  if (pct > 0) { ctx.strokeStyle = goldGradient(ctx, cx - R, cy - R, cx + R, cy + R); ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
  ctx.font = font(400, 100, DISPLAY); ctx.fillText(String(data.count), cx, cy - 6);
  ctx.font = font(600, 26, SANS); ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillText(`/ ${data.total}`, cx, cy + 62);

  // rank and holder
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = goldGradient(ctx, w * 0.3, 0, w * 0.7, 0);
  ctx.font = font(400, 58, DISPLAY); ctx.fillText(fitText(ctx, data.rankLabel || '', w - 220, 58, 400, DISPLAY, 30), w / 2, 590);
  const holder = data.holder;
  ctx.fillStyle = '#fff';
  ctx.font = font(400, 46, DISPLAY);
  ctx.fillText(fitText(ctx, holder?.name || labels.guest || '', w - 220, 46, 400, DISPLAY, 26), w / 2, 646);
  const sub = [holder?.homeTown, holder?.number].filter(Boolean).join('   ·   ');
  if (sub) { ctx.font = font(600, 26, SANS); ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fillText(fitText(ctx, sub, w - 220, 26, 600, SANS, 16), w / 2, 688); }

  // three numbers
  const stats = [[data.count, labels.stamps], [data.townsVisited, labels.towns], [(data.badgeTowns || []).length, labels.badges]];
  stats.forEach(([n, label], i) => {
    const x = 180 + i * ((w - 360) / 2);
    ctx.fillStyle = '#fff'; ctx.font = font(400, 58, DISPLAY); ctx.fillText(String(n), x, 774);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = font(700, 20, SANS); ctx.fillText(fitText(ctx, (label || '').toUpperCase(), 250, 20, 700, SANS, 12), x, 808);
  });

  // newest stamps: one row of 96 px stamps, or two rows of 68 px stamps, always clear of the numbers above and the footer below
  const shown = (data.stamps || []).slice(0, MAX_CARD_STAMPS);
  const cols = 3, cellW = (w - 160) / cols;
  const two = shown.length > cols;
  const r = two ? 68 : 96, firstY = two ? 912 : 950, rowGap = 182, nameDy = r + 30;
  if (!shown.length) {
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([10, 12]); ctx.lineWidth = 3;
    for (let i = 0; i < cols; i += 1) { ctx.beginPath(); ctx.arc(80 + cellW * (i + 0.5), firstY, 90, 0, Math.PI * 2); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  shown.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = 80 + cellW * (col + 0.5), y = firstY + row * rowGap;
    drawStamp(ctx, x, y, r, s, locale);
    ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = font(600, 22, SANS);
    ctx.fillText(fitText(ctx, s.name || '', cellW - 24, 22, 600, SANS, 14), x, y + nameDy);
  });

  // footer
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if ((data.badgeTowns || []).length) {
    ctx.fillStyle = goldGradient(ctx, w * 0.2, 0, w * 0.8, 0);
    ctx.font = font(700, 24, SANS);
    ctx.fillText(fitText(ctx, `${labels.badges}: ${data.badgeTowns.join(', ')}`, w - 200, 24, 700, SANS, 14), w / 2, h - 104);
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = font(600, 24, SANS);
  ctx.fillText(data.origin || '', w / 2, h - 74);
}

// A PNG of the card, or null when this browser cannot draw it.
export async function passportCardBlob(data) {
  if (typeof document === 'undefined') return null;
  try { // make sure the site fonts are ready before drawing with them
    await Promise.all([document.fonts?.load(font(400, 40, DISPLAY)), document.fonts?.load(font(700, 24, SANS))]);
  } catch { /* the fallback fonts are fine */ }
  const canvas = document.createElement('canvas');
  canvas.width = CARD.w; canvas.height = CARD.h;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  drawPassportCard(ctx, data);
  return new Promise((resolve) => { try { canvas.toBlob((b) => resolve(b || null), 'image/png'); } catch { resolve(null); } });
}

// Saves a blob as a file (for browsers that cannot share a picture directly).
export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
