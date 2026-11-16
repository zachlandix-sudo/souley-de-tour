import { useEffect, useMemo, useRef, useState } from 'react';
import { toLatLng } from '../../utils/geo';
import { useI18n } from '../../i18n/I18nContext';

// A cardboard-contour model of the coast in pure CSS 3D (no WebGL, no dependency): stacked terraces that you can
// spin by dragging, with a billboard pin per stop. Same idea as the site's depth-chart contours, made physical.
const SPAN = 200; // svg units across a layer
const hash = (str) => { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; };
const LAYERS = [
  { r: 96, fill: '#0d4c5c', stroke: 'rgba(63,182,201,.55)' },
  { r: 76, fill: '#cdb98a', stroke: 'rgba(255,255,255,.25)' },
  { r: 67, fill: '#86b36e', stroke: 'rgba(255,255,255,.22)' },
  { r: 58, fill: '#64a05b', stroke: 'rgba(255,255,255,.22)' },
  { r: 49, fill: '#4c8a50', stroke: 'rgba(255,255,255,.22)' },
  { r: 40, fill: '#3b7048', stroke: 'rgba(255,255,255,.22)' },
  { r: 31, fill: '#6b6f63', stroke: 'rgba(255,255,255,.28)' },
  { r: 22, fill: '#9a9e92', stroke: 'rgba(255,255,255,.35)' },
];
const STEP = 15; // px between terraces
const TOP = (LAYERS.length - 1) * STEP;

function outline(seed, radius, i) {
  const rnd = hash(`${seed}-shape`);
  const harm = Array.from({ length: 5 }, (_, k) => ({ a: (0.16 / (k + 1)) * (0.6 + rnd()), p: rnd() * 6.283 }));
  const pts = [];
  for (let n = 0; n < 96; n++) {
    const th = (n / 96) * 6.283;
    let f = 1;
    harm.forEach((h, k) => { f += h.a * Math.sin((k + 2) * th + h.p + i * 0.07); });
    pts.push(`${(Math.cos(th) * radius * f).toFixed(1)},${(Math.sin(th) * radius * f).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

// lat/lng of each stop -> -0.62..0.62 around the island centre (falls back to a ring when coordinates are missing)
function place(stops) {
  const ll = stops.map((s) => toLatLng(s));
  const ok = ll.filter(Boolean);
  const lat = ok.map((p) => p[0]), lng = ok.map((p) => p[1]);
  const [la0, la1, lo0, lo1] = [Math.min(...lat), Math.max(...lat), Math.min(...lng), Math.max(...lng)];
  const spread = Math.max(la1 - la0, lo1 - lo0);
  return stops.map((s, i) => {
    const p = ll[i];
    if (!p || !(spread > 1e-4)) { const a = (i / stops.length) * 6.283 - 1.2; return { x: Math.cos(a) * 0.5, y: Math.sin(a) * 0.5 }; }
    return { x: ((p[1] - (lo0 + lo1) / 2) / spread) * 1.24, y: (((la0 + la1) / 2 - p[0]) / spread) * 1.24 };
  });
}

export default function CoastDiorama({ stops, onJump }) {
  const { tx } = useI18n();
  const scene = useRef(null);
  const st = useRef({ rx: 56, rz: -28, vz: 0, drag: false, lx: 0, ly: 0, auto: true });
  const [sel, setSel] = useState(stops[0]?._id);
  const [auto, setAuto] = useState(true);
  const spots = useMemo(() => place(stops), [stops]);
  const shapes = useMemo(() => LAYERS.map((l, i) => outline('southern-leyte', l.r, i)), []);
  const cur = stops.find((s) => s._id === sel) || stops[0];

  useEffect(() => { st.current.auto = auto; }, [auto]);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const tick = () => {
      const s = st.current;
      if (!s.drag) { s.rz += s.vz + (s.auto && !reduce ? 0.12 : 0); s.vz *= 0.94; if (Math.abs(s.vz) < 0.002) s.vz = 0; }
      const el = scene.current;
      if (el) { el.style.setProperty('--rx', s.rx.toFixed(2)); el.style.setProperty('--rz', s.rz.toFixed(2)); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const down = (e) => { const s = st.current; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.vz = 0; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    s.lx = e.clientX; s.ly = e.clientY;
    s.rz += dx * 0.45; s.vz = dx * 0.45; s.rx = Math.min(72, Math.max(30, s.rx - dy * 0.3));
  };
  const up = () => { st.current.drag = false; };
  const key = (e) => {
    if (e.key === 'ArrowLeft') { st.current.vz = -4; e.preventDefault(); }
    if (e.key === 'ArrowRight') { st.current.vz = 4; e.preventDefault(); }
  };
  const surprise = () => {
    const pool = stops.filter((s) => s._id !== sel);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    st.current.vz = 16;
    window.setTimeout(() => pick && setSel(pick._id), 650);
  };

  return (
    <section aria-labelledby="dio-title" className="dio">
      <i aria-hidden="true" className="dio-glow" />
      {Array.from({ length: 16 }, (_, k) => <i key={k} aria-hidden="true" className="dio-fly" style={{ '--x': `${(k * 37) % 100}%`, '--y': `${(k * 53) % 90}%`, '--d': `${6 + (k % 5) * 1.7}s`, '--dl': `${(k % 7) * -1.3}s` }} />)}
      <div className="dio-wrap">
        <div className="dio-copy">
          <h2 id="dio-title" className="dio-title">{tx('Spin the coast')}</h2>
          <p className="dio-lead">{tx('Drag to turn the island, tilt it up or down, and tap a pin to meet a stop.')}</p>

          {cur && (
            <div className="dio-card" key={cur._id} aria-live="polite">
              <p className="dio-card-n font-display">{String(stops.indexOf(cur) + 1).padStart(2, '0')}</p>
              <h3 className="dio-card-name font-display">{cur.name}</h3>
              <p className="dio-card-where">{[cur.barangay, cur.municipality].filter(Boolean).join(', ')}</p>
              <p className="dio-card-desc">{cur.shortDescription || cur.description}</p>
            </div>
          )}
          <div className="dio-actions">
            <button type="button" className="dio-btn dio-btn--solid" onClick={() => onJump?.(cur._id)}>{tx('Jump to this stop')}</button>
            <button type="button" className="dio-btn" onClick={surprise}>{tx('Surprise me')}</button>
            <button type="button" className="dio-btn dio-btn--quiet" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>{auto ? tx('Pause rotation') : tx('Auto-rotate')}</button>
          </div>
        </div>

        <div className="dio-stage" role="group" aria-label={tx('3D model of the coast. Drag to rotate, arrow keys also turn it.')} tabIndex={0}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
          <div ref={scene} className="dio-scene">
            <span aria-hidden="true" className="dio-shadow" />
            {[0, 1, 2].map((k) => <span key={k} aria-hidden="true" className="dio-ripple" style={{ '--dl': `${k * -2.4}s` }} />)}
            {LAYERS.map((l, i) => (
              <svg key={i} aria-hidden="true" viewBox={`${-SPAN / 2} ${-SPAN / 2} ${SPAN} ${SPAN}`} className="dio-layer" style={{ transform: `translateZ(${i * STEP}px)` }}>
                <path d={shapes[i]} fill={l.fill} stroke={l.stroke} strokeWidth="0.7" />
              </svg>
            ))}
            <span aria-hidden="true" className="dio-orbit"><i className="dio-boat" /></span>
            {[0, 1, 2].map((k) => <i key={k} aria-hidden="true" className="dio-cloud" style={{ '--cy': `${[-30, 12, 36][k]}%`, '--cd': `${[26, 34, 30][k]}s`, '--cl': `${k * -9}s` }} />)}
            {stops.map((s, i) => (
              <div key={s._id} className="dio-pin" data-on={s._id === sel} style={{ '--px': spots[i].x, '--py': spots[i].y, '--pz': `${TOP + 8}px` }}>
                <button type="button" className="dio-pin-body" aria-label={s.name} aria-pressed={s._id === sel} onClick={() => setSel(s._id)} onPointerDown={(e) => e.stopPropagation()}>
                  <span className="dio-pin-name">{s.name}</span>
                  <span className="dio-pin-dot">{i + 1}</span>
                </button>
              </div>
            ))}
          </div>
          <p aria-hidden="true" className="dio-hint">{tx('Drag to rotate')}</p>
        </div>
      </div>
    </section>
  );
}
