import { useEffect, useRef } from 'react';
import { damp, frameDt } from '../utils/motion';

// "Flow wave": a glowing sea of orange particle hills rolling endlessly toward you, under a black haze.
// Look: getlayers.ai/layer/flow-wave. Drawn on a plain 2D canvas (no WebGL / three.js, so it adds no library and no weight).
//
// How it works: a fixed grid of points on the ground (x across, z into the distance). Each frame the height of every point is
// a few travelling sine waves, so the hills roll while the points stay put. Points are projected with simple perspective,
// then faded with distance (the haze) and brightened on the crests.
//
// It answers the visitor (update 65), all on the same grid, no extra layers:
//   - cursor: a pool of light follows the mouse; the points under it glow, grow and lift a little (mouse / pen only).
//   - click / tap: a shockwave ring spreads from the spot and lifts the points it passes (at most 4 at once).
//   - scroll: scrolling down flies you forward through the hills (scroll up reverses), fast scrolling makes the hills swell,
//     and the camera sinks lower the further down the page you are.
//   - the pointer also still nudges the camera sideways, as before.
// Reduced motion: one still frame, no loop, no listeners. Off screen or in a background tab: the loop stops.
//
// INP (update 66). This loop runs every frame, so every click, tap or key press lands next to a frame of drawing: the frame that
// is already running delays the event (input delay), and the next frame's drawing sits in front of the paint that shows the result
// (presentation delay). So:
//   - the grid is a quality step (`q`) that a small governor lowers when frames cost too much and raises again when they are cheap;
//   - for ~140 ms after a pointer-down / key-down every other frame is skipped, so the paint that answers the interaction is light;
//   - a click ring only does the expensive distance maths for points that are inside the ring's band (squared distances, no hypot);
//   - the pointer handler stores coordinates only; the one layout read happens once per frame, in the loop, not once per event;
//   - everything that never changes between frames (x, fog, height scale per point) is computed once per build, not once per frame.

const GLOW = [255, 106, 19]; // particle colour: the site orange
const BUCKETS = 8; // brightness steps; one fillStyle per step keeps the draw loop cheap
export const POOL_R = 170; // px: radius of the light pool under the cursor
export const RING_LIFE = 2.1; // s: how long a click shockwave lives
export const RING_SPEED = 380; // px/s: how fast it spreads
const RING_W = 52; // px: thickness of the ring
export const RING_REACH = RING_W * 2.2; // px: further than this from a ring's front it adds less than 0.01, which the draw loop ignores anyway

const Q_MIN = 0.5, Q_MAX = 1; // grid quality: share of the full grid that is drawn
const SLOW_MS = 6.5, FAST_MS = 2.4; // average cost of one frame's JavaScript (ms): above SLOW the grid shrinks, below FAST it may grow back
const HOLD_MS = 140; // how long after a pointer-down / key-down the loop runs at half rate

// Height of the sea at (x, z) at time t (seconds). Values are roughly -1..1.
export function waveHeight(x, z, t) {
  return (
    0.55 * Math.sin(x * 0.55 + z * 0.35 - t * 0.55)
    + 0.3 * Math.sin(z * 0.8 - t * 0.9 + x * 0.2)
    + 0.18 * Math.sin((x - z) * 1.3 + t * 0.7)
  );
}

// Perspective for one point. Returns null when the point is behind the camera. Kept apart from the canvas so it can be tested.
export function project(x, y, z, cam) {
  const d = z + cam.back;
  if (d <= 0.05) return null;
  const k = cam.focal / d;
  return { sx: cam.cx + (x - cam.camX) * k, sy: cam.horizon + (cam.camY - y) * k, k, d };
}

// Soft round spot: 1 in the middle, 0 at distance r and beyond, smooth in between (the cursor's light pool).
export function spot(dx, dy, r = POOL_R) {
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return 0;
  const f = 1 - Math.sqrt(d2) / r;
  return f * f * (3 - 2 * f);
}

// Strength 0..1 of a click shockwave at distance d (px) from where it started, `age` seconds after the click.
// The ring is a narrow bump that travels outwards and fades as it ages.
export function ringStrength(d, age) {
  if (age < 0 || age >= RING_LIFE) return 0;
  const k = (d - age * RING_SPEED) / RING_W;
  if (k > 3 || k < -3) return 0;
  return Math.exp(-k * k) * (1 - age / RING_LIFE) ** 1.6;
}

// Where a phone or an older laptop should start: fewer points from the first frame (the governor still adjusts from there).
function startQuality() {
  const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8;
  return cores <= 4 || mem <= 4 ? 0.7 : Q_MAX;
}

export default function FlowWave({ className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext?.('2d');
    if (!cv || !ctx) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const st = {
      dpr: 1, w: 0, h: 0, cols: 0, rows: 0, span: 9, px: 0, tx: 0, visible: true, raf: 0, rz: 0, prev: 0, t0: performance.now(), buckets: [],
      mx: 0, my: 0, tmx: 0, tmy: 0, glow: 0, tglow: 0, hasPtr: false, // cursor light pool (canvas px, smoothed / target)
      cx: 0, cy: 0, moved: false, // last pointer position in the window (stored by the event, used by the loop)
      rings: [], // click shockwaves: { x, y, t0, age }
      lastY: null, sv: 0, fly: 0, pg: 0, max: 1, frame: 0, // scroll: smoothed speed, distance flown, page progress 0..1
      q: reduce ? Q_MAX : startQuality(), ema: 0, slow: 0, fast: 0, // quality step and the average cost of a frame
      hold: 0, skipNext: false, // interaction hold: until this time every other frame is skipped
      xs: null, zs: null, fogs: null, hs: null, // per-grid-point constants, filled by build()
    };

    // Ground size in world units. x spans -span..span (narrower on a phone, so the points still fill a tall, thin screen), z runs from 0 (near) to DEPTH (far).
    const DEPTH = 30;

    const build = () => {
      const narrow = st.w < 700;
      st.cols = Math.max(24, Math.round((narrow ? 70 : 150) * st.q)); st.rows = Math.max(16, Math.round((narrow ? 44 : 80) * st.q)); st.span = narrow ? 4.2 : 9;
      const { cols, rows, span } = st;
      st.buckets = Array.from({ length: BUCKETS }, () => new Float32Array(cols * rows * 3)); // x, y, size per point
      // Everything that does not change from frame to frame.
      st.xs = new Float32Array(cols * rows); st.zs = new Float32Array(rows); st.fogs = new Float32Array(rows); st.hs = new Float32Array(rows);
      for (let j = 0; j < rows; j++) {
        const z = (j / (rows - 1)) ** 1.25 * DEPTH; // rows bunch up near the camera, where detail shows
        st.zs[j] = z; st.fogs[j] = 1 - z / DEPTH; st.hs[j] = 1.05 + z * 0.045;
        const widen = span * (1 + z * 0.09); // the sea widens with distance so it always fills the screen
        for (let i = 0; i < cols; i++) st.xs[j * cols + i] = ((i / (cols - 1)) * 2 - 1) * widen;
      }
    };

    const draw = (now) => {
      const dt = frameDt(st.prev, now); st.prev = now;
      st.px += (st.tx - st.px) * damp(0.05, dt);
      const t = reduce ? 4.2 : (now - st.t0) / 1000;
      const { w, h, cols, rows, xs, zs, fogs, hs } = st;

      // Pointer: one layout read per frame (not one per pointermove event), and only when the pointer moved.
      if (st.moved) {
        st.moved = false;
        const r = cv.getBoundingClientRect();
        st.tmx = st.cx - r.left; st.tmy = st.cy - r.top;
        if (!st.hasPtr) { st.mx = st.tmx; st.my = st.tmy; st.hasPtr = true; }
      }

      // Scroll: speed (world units / s, signed), the distance flown, how far down the page we are, and how much the hills swell.
      let swell = 1;
      if (!reduce) {
        const y = window.scrollY || 0;
        if (st.lastY !== null) st.sv += (Math.max(-9, Math.min(9, ((y - st.lastY) / (dt / 1000)) * 0.004)) - st.sv) * damp(0.1, dt);
        st.lastY = y;
        st.fly += st.sv * (dt / 1000);
        if (st.frame++ % 40 === 0) st.max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        st.pg += (Math.min(1, Math.max(0, y / st.max)) - st.pg) * damp(0.08, dt);
        swell = 1 + Math.min(0.85, Math.abs(st.sv) * 0.09);
      }
      // Cursor and rings.
      if (st.hasPtr) { const k = damp(0.22, dt); st.mx += (st.tmx - st.mx) * k; st.my += (st.tmy - st.my) * k; }
      st.glow += (st.tglow - st.glow) * damp(0.08, dt);
      const pool = st.glow > 0.01, mx = st.mx, my = st.my, glow = st.glow;
      const rings = st.rings;
      for (let q = rings.length - 1; q >= 0; q--) { rings[q].age = (now - rings[q].t0) / 1000; if (rings[q].age >= RING_LIFE) rings.splice(q, 1); }
      // Per ring: where its band starts and ends (squared) and how strong it still is. A point outside the band cannot be touched,
      // so it skips the maths entirely, and the fade (a power) is worked out once per ring instead of once per point.
      let nr = 0; const rx = [], ry = [], rc = [], rf = [], lo2 = [], hi2 = [];
      for (let q = 0; q < rings.length; q++) {
        const age = rings[q].age, fade = (1 - age / RING_LIFE) ** 1.6;
        if (fade < 0.01) continue;
        const c = age * RING_SPEED, lo = Math.max(0, c - RING_REACH), hi = c + RING_REACH;
        rx[nr] = rings[q].x; ry[nr] = rings[q].y; rc[nr] = c; rf[nr] = fade; lo2[nr] = lo * lo; hi2[nr] = hi * hi; nr++;
      }

      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // The camera sits above the water and looks a little down; the horizon is just above the middle of the screen.
      // The further down the page, the lower the camera sinks, so the hills tower over you toward the end.
      const cam = { focal: Math.max(w, h * 1.1) * 0.62, cx: w / 2, horizon: h * (st.w < 700 ? 0.42 : 0.34) - st.pg * h * 0.03, camY: 3.1 - st.pg * 0.9, back: 3.2, camX: st.px * 1.6 };
      const counts = new Int32Array(BUCKETS);
      const sizeK = st.w < 700 ? 1.2 : 1, fly = st.fly;
      // Fewer points means each one is drawn a little bigger, so the sea keeps its density to the eye.
      const sizeQ = 1 / Math.sqrt(st.q);

      for (let j = 0; j < rows; j++) {
        const z = zs[j], fog = fogs[j], hsc = hs[j];
        const fogB = 0.15 + 0.85 * fog ** 0.8;
        for (let i = 0; i < cols; i++) {
          const x = xs[j * cols + i];
          const hgt = waveHeight(x, z + fly, t) * swell; // + fly: scrolling slides the whole pattern toward (or away from) you
          const p = project(x, hgt * hsc, z, cam);
          if (!p) continue;
          const sx = p.sx;
          let sy = p.sy, lift = 0, boost = 0;
          if (pool) { const f = spot(sx - mx, sy - my) * glow; if (f > 0) { lift += f * 30; boost += f * 0.85; } }
          for (let q = 0; q < nr; q++) {
            const dx = sx - rx[q], dy = sy - ry[q], d2 = dx * dx + dy * dy;
            if (d2 < lo2[q] || d2 > hi2[q]) continue; // outside the ring's band: no sqrt, no exp
            const k = (Math.sqrt(d2) - rc[q]) / RING_W, s = Math.exp(-k * k) * rf[q]; // the same bump as ringStrength()
            if (s > 0.01) { lift += s * 46; boost += s * 1.1; }
          }
          sy -= lift;
          if (sx < -6 || sx > w + 6 || sy < -6 || sy > h + 6) continue;
          // Crests glow, troughs go dim, the distance melts into the haze; light from the cursor / a ring adds to it.
          const crest = Math.min(1, Math.max(0, (hgt + 1) / 2));
          const b = Math.min(1, Math.max(0, (0.25 + 0.75 * crest) * fogB + boost));
          const bi = Math.min(BUCKETS - 1, Math.floor(b * BUCKETS));
          const size = Math.min(4.2, Math.max(0.9, Math.min(3.4, p.k * 0.04 * sizeK * sizeQ) * (1 + boost * 0.8)));
          const arr = st.buckets[bi], n = counts[bi]++ * 3;
          arr[n] = sx; arr[n + 1] = sy; arr[n + 2] = size;
        }
      }

      // Additive blending is what makes overlapping particles read as light rather than dots.
      ctx.globalCompositeOperation = 'lighter';
      if (pool) {
        const R = POOL_R * 1.5, g = ctx.createRadialGradient(mx, my, 0, mx, my, R);
        g.addColorStop(0, `rgba(${GLOW[0]}, ${GLOW[1]}, ${GLOW[2]}, ${(0.22 * glow).toFixed(3)})`);
        g.addColorStop(1, `rgba(${GLOW[0]}, ${GLOW[1]}, ${GLOW[2]}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(mx - R, my - R, R * 2, R * 2);
      }
      for (let bi = 0; bi < BUCKETS; bi++) {
        const n = counts[bi];
        if (!n) continue;
        const a = 0.18 + (bi / (BUCKETS - 1)) * 0.8;
        const arr = st.buckets[bi];
        // The brightest steps first get a wide, faint halo: that is the glow on the crests.
        if (bi >= BUCKETS - 3) {
          ctx.fillStyle = `rgba(${GLOW[0]}, ${GLOW[1]}, ${GLOW[2]}, ${(0.05 + (bi - (BUCKETS - 3)) * 0.03).toFixed(3)})`;
          ctx.beginPath();
          for (let q = 0; q < n; q++) { const o = q * 3; if (arr[o + 2] > 2) continue; const r = arr[o + 2] * 3.6; ctx.rect(arr[o] - r / 2, arr[o + 1] - r / 2, r, r); } // big near dots are bright enough already; a square halo around them would look like a box
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${GLOW[0]}, ${GLOW[1]}, ${GLOW[2]}, ${a.toFixed(3)})`;
        ctx.beginPath();
        for (let q = 0; q < n; q++) {
          const o = q * 3, r = arr[o + 2];
          ctx.rect(arr[o] - r / 2, arr[o + 1] - r / 2, r, r);
        }
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    // The quality governor: judged on the average cost of the JavaScript in a frame (ms), with a delay both ways so it never flaps.
    const govern = (ms) => {
      st.ema = st.ema ? st.ema + (ms - st.ema) * 0.12 : ms;
      if (st.ema > SLOW_MS && st.q > Q_MIN) { st.fast = 0; if (++st.slow > 24) { st.slow = 0; st.q = Math.max(Q_MIN, +(st.q - 0.15).toFixed(2)); build(); } }
      else if (st.ema < FAST_MS && st.q < Q_MAX) { st.slow = 0; if (++st.fast > 300) { st.fast = 0; st.q = Math.min(Q_MAX, +(st.q + 0.1).toFixed(2)); build(); } }
      else { st.slow = 0; st.fast = 0; }
    };

    const tick = (now) => {
      st.raf = 0;
      if (now < st.hold) { // an interaction has just happened: let every other frame go by so the paint that answers it is light
        st.skipNext = !st.skipNext;
        if (st.skipNext && st.visible && !reduce) { st.raf = requestAnimationFrame(tick); return; }
      }
      const a = performance.now();
      draw(now);
      govern(performance.now() - a);
      if (st.visible && !reduce) st.raf = requestAnimationFrame(tick); else { st.prev = 0; st.lastY = null; }
    };
    const kick = () => { if (!st.raf && st.visible && !reduce) st.raf = requestAnimationFrame(tick); };

    const resize = () => {
      st.rz = 0;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      st.dpr = Math.min(window.devicePixelRatio || 1, 1.5); st.vw = window.innerWidth; // a sharper canvas is not worth a slower page
      st.w = r.width; st.h = r.height;
      cv.width = Math.round(r.width * st.dpr); cv.height = Math.round(r.height * st.dpr);
      build();
      draw(performance.now()); kick();
    };
    const onResize = () => { if (!st.rz) st.rz = requestAnimationFrame(resize); }; // many resize events in one frame become one rebuild
    // -1..1 across the window; the camera follows it slowly. A mouse or pen also steers the light pool.
    // The handler only stores numbers; the loop turns them into canvas coordinates (one layout read per frame, not per event).
    const onMove = (e) => {
      st.tx = (e.clientX / Math.max(1, st.vw || window.innerWidth)) * 2 - 1;
      if (e.pointerType !== 'touch') { st.cx = e.clientX; st.cy = e.clientY; st.moved = true; st.tglow = 1; }
      kick();
    };
    const onLeave = () => { st.tglow = 0; };
    // Pointer-down and key-down start the interaction hold (see tick).
    const onHold = () => { st.hold = performance.now() + HOLD_MS; st.skipNext = false; };
    // A click or a tap (not a scroll gesture, and not Enter on a keyboard: that has detail 0) sends a ring across the sea.
    const onClick = (e) => {
      if (e.detail === 0) return;
      const r = cv.getBoundingClientRect();
      st.rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now(), age: 0 });
      if (st.rings.length > 4) st.rings.shift();
      kick();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(cv);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) kick(); }) : null;
    io?.observe(cv);
    if (!ro) window.addEventListener('resize', onResize);
    const root = document.documentElement;
    if (!reduce) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onHold, { passive: true });
      window.addEventListener('keydown', onHold, { passive: true });
      window.addEventListener('click', onClick, { passive: true });
      root.addEventListener('pointerleave', onLeave);
    }
    resize();
    return () => {
      cancelAnimationFrame(st.raf); cancelAnimationFrame(st.rz); ro?.disconnect(); io?.disconnect();
      window.removeEventListener('resize', onResize); window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onHold); window.removeEventListener('keydown', onHold);
      window.removeEventListener('click', onClick); root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`flow-wave ${className}`} />;
}
