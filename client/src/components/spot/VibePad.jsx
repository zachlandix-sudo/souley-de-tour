import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SpotImage from '../SpotImage';
import { SNAP, VIBE_RADIUS, ZONES, matchPct, rankByVibe, vibeOf, zoneOf } from '../../utils/vibe';

// "Vibe pad": drag the glowing dot around a mood grid (slow to wild across, nature to heritage up) and the spots that fit that mood
// light up and line up on the right, best match first. Every spot is a dot on the pad, placed from its categories and activities
// (utils/vibe.js); a bigger dot is a better rated spot.
//   - the dot has a short comet tail, a soft light under it, and thin dashed lines to its three best matches
//   - let go while moving and it coasts to a stop; stop near a spot and it snaps onto it ("lock")
//   - the area of the pad you are in lights up, and the best match wears a name tag
//   - the list re-orders by sliding (not jumping), the percentages count up, the mood name hops in letter by letter
//   - tap a dot to tune to that spot's mood; the arrow keys move the dot; the two sliders do the same job for touch and screen readers
// Everything that moves is switched off with "reduce motion".
const KEY = 'souley:vibe';
const START = { x: 0.5, y: 0.5 };
const clamp = (v) => Math.min(1, Math.max(0, v));
const still = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function remembered() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && Number.isFinite(v.x) && Number.isFinite(v.y) ? { x: clamp(v.x), y: clamp(v.y) } : START;
  } catch { return START; }
}

// A number that counts up or down to its new value instead of jumping.
function Count({ to }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    if (still()) { setV(to); from.current = to; return undefined; }
    const a = from.current;
    const t0 = performance.now();
    let id = 0;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 380);
      const n = Math.round(a + (to - a) * (1 - (1 - k) ** 3));
      from.current = n;
      setV(n);
      if (k < 1) id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [to]);
  return <>{v}</>;
}

export default function VibePad({ spots = [], loading = false, error = null, onRetry, onClose }) {
  const root = useRef(null);
  const pad = useRef(null);
  const dragging = useRef(false);
  const raf = useRef(0);
  const vel = useRef({ x: 0, y: 0 });
  const last = useRef(null);
  const itemRefs = useRef(new Map());
  const prevTops = useRef(new Map());
  const [pos, setPos] = useState(remembered);
  const posRef = useRef(pos);
  const [glide, setGlide] = useState(false); // the dot is sliding by itself (Surprise me, a tapped dot, a snap)
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(null);
  const [say, setSay] = useState('');

  const place = (p) => { posRef.current = p; setPos(p); };
  const placed = useMemo(() => spots.map((spot) => ({ spot, vibe: vibeOf(spot) })), [spots]);
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const ranked = useMemo(() => rankByVibe(spots, pos), [spots, pos]);
  const top = ranked.slice(0, 6);
  const best = ranked[0];
  const inVibe = ranked.filter((r) => r.match >= 70).length;
  const zone = zoneOf(pos.x, pos.y);
  const lock = best && Math.hypot(best.vibe.x - pos.x, best.vibe.y - pos.y) < SNAP ? best : null;
  const at = { left: `${pos.x * 100}%`, top: `${(1 - pos.y) * 100}%` };

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch { /* private mode: nothing to keep */ } }, [pos]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => { root.current?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'nearest' }); }, []);

  // A tick under the finger each time a different spot becomes the best match (phones that can vibrate).
  const bestId = best?.spot._id;
  useEffect(() => { if (dragging.current) navigator.vibrate?.(6); }, [bestId]);

  // For screen readers: say the mood once the dot has stopped moving, not on every pixel.
  useEffect(() => {
    if (!spots.length) return undefined;
    const t = setTimeout(() => setSay(`${zone.name}. ${inVibe} ${inVibe === 1 ? 'spot is' : 'spots are'} in your vibe. Best match: ${best?.spot.name || 'none'}.`), 700);
    return () => clearTimeout(t);
  }, [zone.name, inVibe, bestId, spots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // The list slides to its new order (FLIP): note where each row was, and after the re-render move it back there and let it glide.
  useLayoutEffect(() => {
    const next = new Map();
    itemRefs.current.forEach((el, id) => next.set(id, el.offsetTop));
    if (!still()) {
      next.forEach((y, id) => {
        const was = prevTops.current.get(id);
        const el = itemRefs.current.get(id);
        if (was == null || was === y || !el) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${was - y}px)`;
        requestAnimationFrame(() => { el.style.transition = 'transform .5s cubic-bezier(.2, .8, .2, 1)'; el.style.transform = ''; });
      });
    }
    prevTops.current = next;
  });

  const glideTo = (p) => { cancelAnimationFrame(raf.current); setGlide(true); place(p); };
  const surprise = () => glideTo({ x: 0.08 + Math.random() * 0.84, y: 0.08 + Math.random() * 0.84 });

  // Stopped near a spot: slide onto it.
  const settle = () => {
    const p = posRef.current;
    let hit = null;
    let bd = SNAP;
    for (const d of placedRef.current) {
      const dd = Math.hypot(d.vibe.x - p.x, d.vibe.y - p.y);
      if (dd < bd) { bd = dd; hit = d; }
    }
    if (hit && bd > 0.004) glideTo(hit.vibe);
  };

  // Let go while moving: coast to a stop (friction, no bouncing).
  const coast = () => {
    let t = performance.now();
    const step = (now) => {
      const dt = Math.min(32, now - t);
      t = now;
      const f = 0.86 ** (dt / 16);
      const v = vel.current;
      v.x *= f; v.y *= f;
      const p = posRef.current;
      const nx = clamp(p.x + v.x * dt);
      const ny = clamp(p.y + v.y * dt);
      if (nx !== p.x + v.x * dt) v.x = 0;
      if (ny !== p.y + v.y * dt) v.y = 0;
      place({ x: nx, y: ny });
      if (Math.hypot(v.x, v.y) > 0.00006) raf.current = requestAnimationFrame(step);
      else settle();
    };
    raf.current = requestAnimationFrame(step);
  };

  const moveTo = (e) => {
    const r = pad.current.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width);
    const y = clamp(1 - (e.clientY - r.top) / r.height);
    const now = performance.now();
    const l = last.current;
    if (l) {
      const dt = Math.max(1, now - l.t);
      vel.current = { x: 0.7 * vel.current.x + 0.3 * ((x - l.x) / dt) * 0.5, y: 0.7 * vel.current.y + 0.3 * ((y - l.y) / dt) * 0.5 };
    }
    last.current = { x, y, t: now };
    place({ x, y });
  };
  const down = (e) => {
    cancelAnimationFrame(raf.current);
    dragging.current = true; last.current = null; vel.current = { x: 0, y: 0 };
    setDrag(true); setGlide(false);
    pad.current.setPointerCapture?.(e.pointerId);
    moveTo(e);
  };
  const move = (e) => { if (dragging.current) moveTo(e); };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDrag(false);
    if (!still() && Math.hypot(vel.current.x, vel.current.y) > 0.0004 && performance.now() - (last.current?.t || 0) < 90) coast();
    else settle();
  };
  const key = (e) => {
    const step = e.shiftKey ? 0.1 : 0.03;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    cancelAnimationFrame(raf.current);
    setGlide(false);
    place({ x: clamp(posRef.current.x + d[0]), y: clamp(posRef.current.y + d[1]) });
  };

  // Name tags: the best match, and whichever dot the pointer is on.
  const tagged = [best && best.match >= 50 ? best : null, hover && hover !== bestId ? placed.find((p) => p.spot._id === hover) : null].filter(Boolean);

  return (
    <section ref={root} aria-labelledby="vp-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose?.(); }} className="vp surface-dark relative overflow-hidden border border-white/15 border-t-2 border-t-orange bg-night text-white">
      <span className="vp-orb vp-orb--a" aria-hidden="true" />
      <span className="vp-orb vp-orb--b" aria-hidden="true" />
      <button type="button" onClick={onClose} aria-label="Close the vibe pad" className="vp-close">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
      </button>
      <div className="relative z-[1] grid gap-x-12 gap-y-9 p-5 sm:p-8 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
        <div>
          <p className="vp-eyebrow">Find your vibe</p>
          <h2 id="vp-title" className="vp-title" aria-label={zone.name}>
            <span key={zone.name} aria-hidden="true">{[...zone.name].map((ch, k) => <span key={k} className="vp-ch" style={{ '--k': k }}>{ch === ' ' ? '\u00a0' : ch}</span>)}</span>
          </h2>
          <p className="vp-lead">Drag the dot, or fling it. The spots that fit your mood light up.</p>

          <div className="vp-padwrap">
            <span className="vp-edge vp-edge--top" aria-hidden="true">Heritage and culture</span>
            <span className="vp-edge vp-edge--bottom" aria-hidden="true">Nature and sea</span>
            <span className="vp-edge vp-edge--left" aria-hidden="true">Slow</span>
            <span className="vp-edge vp-edge--right" aria-hidden="true">Wild</span>
            <div
              ref={pad}
              tabIndex={0}
              role="group"
              aria-label="Vibe pad. The arrow keys move the dot; the sliders below do the same."
              className={`vp-pad${drag ? ' is-drag' : ''}`}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
            >
              <div className="vp-zones" aria-hidden="true">
                {[2, 1, 0].flatMap((row) => [0, 1, 2].map((col) => (
                  <span key={`${row}${col}`} className={`vp-zone${zone.row === row && zone.col === col ? ' is-on' : ''}`}>{ZONES[row][col]}</span>
                )))}
              </div>
              <span className="vp-light" style={at} aria-hidden="true" />
              <svg className="vp-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {top.slice(0, 3).filter((r) => r.match >= 35).map(({ spot, vibe, match }) => (
                  <line key={spot._id || spot.slug} x1={pos.x * 100} y1={(1 - pos.y) * 100} x2={vibe.x * 100} y2={(1 - vibe.y) * 100} style={{ opacity: match / 100 }} />
                ))}
              </svg>
              {placed.map(({ spot, vibe }, i) => {
                const near = matchPct(vibe, pos) >= 70;
                return (
                  <button
                    key={spot._id || spot.slug}
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    title={spot.name}
                    className={`vp-dot${near ? ' is-near' : ''}${hover === spot._id ? ' is-hover' : ''}`}
                    style={{ left: `${vibe.x * 100}%`, top: `${(1 - vibe.y) * 100}%`, '--s': `${(0.5 + ((spot.averageRating || 0) / 5) * 0.34).toFixed(2)}rem`, '--d': `${Math.min(i * 7, 700)}ms` }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => setHover(spot._id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => glideTo(vibe)}
                  />
                );
              })}
              {tagged.map(({ spot, vibe }) => (
                <span key={spot._id || spot.slug} aria-hidden="true" className={`vp-tag${vibe.x > 0.6 ? ' is-left' : ''}`} style={{ left: `${vibe.x * 100}%`, top: `${(1 - vibe.y) * 100}%` }}>{spot.name}</span>
              ))}
              <span aria-hidden="true" className={`vp-ring${glide ? ' is-glide' : ''}`} style={{ ...at, width: `${VIBE_RADIUS * 200}%` }} />
              {[3, 2, 1].map((n) => <span key={n} aria-hidden="true" className={`vp-ghost${glide ? ' is-glide' : ''}`} style={{ ...at, '--n': n }} />)}
              <span aria-hidden="true" className={`vp-puck${glide ? ' is-glide' : ''}${lock ? ' is-lock' : ''}`} style={at} />
            </div>
          </div>

          <div className="vp-sliders">
            <label>
              <span>Slow</span>
              <input type="range" min="0" max="100" value={Math.round(pos.x * 100)} aria-label="Energy, from slow to wild" onChange={(e) => { setGlide(false); place({ ...posRef.current, x: e.target.value / 100 }); }} />
              <span>Wild</span>
            </label>
            <label>
              <span>Nature</span>
              <input type="range" min="0" max="100" value={Math.round(pos.y * 100)} aria-label="Kind of place, from nature and sea to heritage and culture" onChange={(e) => { setGlide(false); place({ ...posRef.current, y: e.target.value / 100 }); }} />
              <span>Heritage</span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="vp-btn" onClick={surprise}>Surprise me <span aria-hidden="true">✦</span></button>
            <button type="button" className="vp-btn" onClick={() => glideTo(START)}>Centre</button>
          </div>
        </div>

        <div className="min-w-0">
          <p className="sr-only" role="status">{say}</p>
          {loading && spots.length === 0 && (
            <ol className="vp-list" aria-label="Loading spots">
              {[0, 1, 2, 3, 4, 5].map((i) => <li key={i} className="vp-skel" style={{ '--i': i }} />)}
            </ol>
          )}
          {!loading && error && (
            <p className="vp-note" role="alert">Could not load the spots. {onRetry && <button type="button" className="underline" onClick={onRetry}>Try again</button>}</p>
          )}
          {!loading && !error && spots.length === 0 && <p className="vp-note">There are no spots to place yet.</p>}
          {top.length > 0 && (
            <>
              <p className="vp-count"><b><Count to={inVibe} /></b> {inVibe === 1 ? 'spot is' : 'spots are'} in your vibe · best matches first</p>
              <ol className="vp-list">
                {top.map(({ spot, match }, i) => {
                  const id = spot._id || spot.slug;
                  return (
                    <li key={id} style={{ '--i': i }} ref={(el) => { if (el) itemRefs.current.set(id, el); else itemRefs.current.delete(id); }}>
                      <Link
                        to={`/spots/${spot.slug}`}
                        className={`vp-item${i === 0 ? ' is-best' : ''}${hover === spot._id ? ' is-hover' : ''}`}
                        onMouseEnter={() => setHover(spot._id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(spot._id)} onBlur={() => setHover(null)}
                      >
                        <SpotImage src={spot.images?.[0]} fallbacks={spot.images?.slice(1)} slug={spot.slug} alt="" className="vp-thumb" />
                        <span className="min-w-0">
                          {i === 0 && <span className="vp-badge">Best fit</span>}
                          <b className="vp-name">{spot.name}</b>
                          <small className="vp-sub">{spot.municipality}{(spot.categoryIds || []).length > 0 && ` · ${spot.categoryIds.map((c) => c.name).slice(0, 2).join(', ')}`}</small>
                          <span className="vp-bar" aria-hidden="true"><i style={{ width: `${match}%` }} /></span>
                        </span>
                        <span className="vp-pct"><Count to={match} /><small>%</small><span className="sr-only"> match</span></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              <p className="vp-foot">Bigger dots are better rated. Tap a dot to tune to that spot.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
