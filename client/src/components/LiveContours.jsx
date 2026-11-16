import { useEffect, useRef } from 'react';
import { makeField } from '../utils/contours';
import { damp, frameDt } from '../utils/motion';

// A living depth chart. The same seeded map as <Contours>, redrawn on a canvas so the water reacts:
// it bulges around the pointer, a tap sends a sonar ripple across the bay, and the lines drift when idle.
// `hoverOnly` keeps it still (and free) until someone touches it, which suits small tiles.
const EDGES = { 1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 5: [['T', 'L'], ['B', 'R']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']], 9: [['T', 'B']], 10: [['T', 'R'], ['L', 'B']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['B', 'R']], 14: [['L', 'B']] };

export default function LiveContours({ seed = 'souley', width = 1600, height = 900, levels = 14, cell = 26, alignX = 0.5, hoverOnly = false, depthLabel = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext?.('2d');
    if (!cv || !ctx) return undefined;
    const host = cv.parentElement;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const base = makeField(seed, width, height);
    const st = { dpr: 1, w: 0, h: 0, s: 1, ox: 0, oy: 0, cols: 1, rows: 1, cv: cell, px: width * 0.7, py: height * 0.5, tx: width * 0.7, ty: height * 0.5, hover: 0, target: 0, ripples: [], t0: performance.now(), visible: true, raf: 0, prev: 0 };
    let grid = new Float32Array(0);
    const introMs = levels * 70 + 1200;

    const field = (x, y, t, now) => {
      let v = base(x, y);
      if (!hoverOnly && !reduce) v += 0.028 * Math.sin(x / 240 + t * 0.45) * Math.cos(y / 190 - t * 0.32);
      if (st.hover > 0.002) { const d2 = (x - st.px) ** 2 + (y - st.py) ** 2; v += 0.4 * st.hover * Math.exp(-d2 / (2 * (width * 0.085) ** 2)); }
      for (const r of st.ripples) {
        const age = (now - r.t0) / 1000, d = Math.hypot(x - r.x, y - r.y) - age * 560;
        v += 0.1 * Math.sin(d / 16) * Math.exp(-(d * d) / (2 * 70 * 70)) * Math.exp(-age / 1.6);
      }
      return v;
    };

    const draw = (now) => {
      const dt = frameDt(st.prev, now); st.prev = now; // the pointer and the bulge follow at the same pace on any refresh rate
      const f = damp(0.14, dt);
      st.px += (st.tx - st.px) * f; st.py += (st.ty - st.py) * f; st.hover += (st.target - st.hover) * damp(0.09, dt);
      st.ripples = st.ripples.filter((r) => now - r.t0 < 3200);
      const t = (now - st.t0) / 1000, { cols, rows, cv: c, dpr, s } = st;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * st.ox, dpr * st.oy);
      if (grid.length !== (cols + 1) * (rows + 1)) grid = new Float32Array((cols + 1) * (rows + 1));
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) grid[j * (cols + 1) + i] = field(i * c, j * c, t, now);
      const color = getComputedStyle(cv).getPropertyValue('--contour').trim() || '#ff6a13';
      ctx.strokeStyle = color; ctx.lineJoin = ctx.lineCap = 'round';
      const g = (i, j) => grid[j * (cols + 1) + i];
      for (let n = 0; n < levels; n++) {
        const L = 0.1 + n * 0.075, major = n % 4 === 3;
        const intro = hoverOnly || reduce ? 1 : Math.min(1, Math.max(0, (now - st.t0 - (levels - n) * 70) / 1200));
        if (intro <= 0) continue;
        ctx.globalAlpha = intro * (major ? 0.85 : 0.38); ctx.lineWidth = (major ? 1.6 : 1) / s;
        ctx.beginPath();
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const tl = g(i, j), tr = g(i + 1, j), br = g(i + 1, j + 1), bl = g(i, j + 1);
          const code = (tl >= L ? 8 : 0) | (tr >= L ? 4 : 0) | (br >= L ? 2 : 0) | (bl >= L ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const P = { T: () => [(i + (L - tl) / (tr - tl)) * c, j * c], B: () => [(i + (L - bl) / (br - bl)) * c, (j + 1) * c], L: () => [i * c, (j + (L - tl) / (bl - tl)) * c], R: () => [(i + 1) * c, (j + (L - tr) / (br - tr)) * c] };
          for (const [a, b] of EDGES[code]) { const A = P[a](), B = P[b](); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
        }
        ctx.stroke();
      }
      if (depthLabel && st.hover > 0.05) {
        // A chart "sounding": the depth under your cursor.
        ctx.globalAlpha = Math.min(1, st.hover); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 1.2 / s;
        ctx.beginPath(); ctx.arc(st.px, st.py, 6 / s, 0, 6.2832); ctx.stroke();
        ctx.font = `600 ${13 / s}px "Hanken Grotesk", sans-serif`;
        ctx.fillText(`${Math.round(field(st.px, st.py, t, now) * 420)} m`, st.px + 12 / s, st.py + 4 / s);
      }
      ctx.globalAlpha = 1;
      return now - st.t0 < introMs;
    };

    const tick = (now) => {
      st.raf = 0;
      const intro = draw(now);
      const live = !hoverOnly || st.target > 0 || st.hover > 0.01 || st.ripples.length > 0 || intro;
      if (st.visible && !reduce && live) st.raf = requestAnimationFrame(tick); else st.prev = 0;
    };
    const kick = () => { if (!st.raf && st.visible && !reduce) st.raf = requestAnimationFrame(tick); };

    const resize = () => {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      st.dpr = Math.min(window.devicePixelRatio || 1, 2); st.w = r.width; st.h = r.height;
      cv.width = Math.round(r.width * st.dpr); cv.height = Math.round(r.height * st.dpr);
      st.s = Math.max(r.width / width, r.height / height);
      st.ox = (r.width - width * st.s) * alignX; st.oy = (r.height - height * st.s) / 2;
      st.cv = cell * (r.width < 700 && !hoverOnly ? 1.4 : 1);
      st.cols = Math.ceil(width / st.cv); st.rows = Math.ceil(height / st.cv);
      draw(performance.now()); kick();
    };
    const toVirtual = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - st.ox) / st.s, (e.clientY - r.top - st.oy) / st.s]; };
    const onMove = (e) => { [st.tx, st.ty] = toVirtual(e); if (!st.target) { st.px = st.tx; st.py = st.ty; } st.target = 1; kick(); };
    const onDown = (e) => { const [x, y] = toVirtual(e); st.ripples.push({ x, y, t0: performance.now() }); kick(); };
    const onLeave = () => { st.target = 0; kick(); };

    const ro = new ResizeObserver(resize); ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); }); io.observe(cv);
    if (!reduce) {
      host.addEventListener('pointermove', onMove); host.addEventListener('pointerdown', onDown); host.addEventListener('pointerleave', onLeave);
    }
    resize();
    return () => {
      cancelAnimationFrame(st.raf); ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointerleave', onLeave);
    };
  }, [seed, width, height, levels, cell, alignX, hoverOnly, depthLabel]);

  return <canvas ref={ref} aria-hidden="true" className={`contours ${className}`} />;
}
