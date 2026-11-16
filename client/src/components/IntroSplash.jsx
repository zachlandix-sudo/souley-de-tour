import { useCallback, useEffect, useRef, useState } from 'react';
import Contours from './Contours';

// "Terrain awakens". Plays once per browser session (skipped with "reduce motion"):
//   a warm glow rises, a hairline frame draws itself, the contour map draws itself like gold thread (one line of it in orange),
//   SOULEY rises letter by letter and catches the light, then the black curtain and the name part in two halves.
// A click or key press skips it. Only transforms, opacity and stroke-dashoffset are animated.
const KEY = 'souley-intro';
function shouldPlay() {
  try { return !sessionStorage.getItem(KEY) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
const played = typeof window !== 'undefined' && shouldPlay();

export const CURTAIN_AT = 4.1; // seconds after the intro starts when the curtain begins to open
const COUNT_MS = 3900; // the 000 -> 100 counter and its line
const UNMOUNT_MS = 5400;

let startedAt = null; // performance.now() when the intro was first drawn
let skipped = false;
let over = false; // true once the intro has finished or been skipped: a remounted layout (Map <-> Login...) must not replay it

// Seconds a page headline should still wait before it rises. Read ONCE when the headline mounts (useIntroDelay),
// so a page opened later in the session, or after a skip, does not wait for an intro that is already gone.
export function introDelayNow() {
  if (!played || skipped || over) return 0;
  if (startedAt === null) return CURTAIN_AT;
  return Math.max(0, CURTAIN_AT - (performance.now() - startedAt) / 1000);
}
export function useIntroDelay() {
  return useState(introDelayNow)[0];
}

// Town names that appear under the counter as it counts up (value = the eased 0..1 progress at which the name appears).
const PLACES = [[0, 'Maasin'], [0.17, 'Macrohon'], [0.34, 'Limasawa'], [0.52, 'Hinunangan'], [0.7, 'Silago'], [0.88, 'Sogod']];

// Layers behind each letter that make it a solid, extruded block (3D). Look: index.css, block "intro: 3D name".
// Every layer is a real element in a 3D tree (x6 letters x2 curtain halves) and was the biggest remaining cost of the intro,
// so there are 4 instead of 6; the layer step and the shade step grow to match, so the block keeps the same thickness and colour range.
const DEPTH = 4;
const SIDE_VARS = { '--zs': `${18 / DEPTH}px`, '--cs': `${27 / DEPTH}%` };
// The name block. It is drawn twice, once in each half, so the name itself parts with the curtain.
function Scene() {
  return (
    <>
      <p className="splash-name absolute bottom-1/2 left-0 right-0 mb-[clamp(1.1rem,3.2vw,2.4rem)] text-center font-display text-[clamp(3.1rem,13.5vw,10.5rem)] leading-none text-[#ffffff]" style={SIDE_VARS}>
        {[...'SOULEY'].map((ch, i) => (
          <span key={i} className="l3d-wrap inline-block px-[0.04em] align-bottom" style={{ '--i': i }}>
            <span className="splash-letter l3d" style={{ '--i': i }}>
              {Array.from({ length: DEPTH }, (_, k) => <span key={k} className="l3d-side" style={{ '--z': DEPTH - k }}>{ch}</span>)}
              <span className="l3d-front">{ch}</span>
            </span>
          </span>
        ))}
      </p>
      <div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-[clamp(.8rem,2.4vw,1.8rem)]">
        <span className="splash-rule splash-rule-l" />
        <span className="splash-tour font-display text-[clamp(1.25rem,3.4vw,2.4rem)] italic text-orange">de Tour</span>
        <span className="splash-rule splash-rule-r" />
      </div>
      <p className="splash-tag absolute left-0 right-0 top-1/2 mt-[clamp(2.2rem,5vw,3.6rem)] px-4 text-center text-[clamp(.65rem,1.4vw,.9rem)] uppercase tracking-[.5em] text-[#ff6a13]">
        Southern Leyte · Philippines
      </p>
    </>
  );
}

export default function IntroSplash() {
  const [show, setShow] = useState(played && !over);
  const [leaving, setLeaving] = useState(false);
  const count = useRef(null);
  const bar = useRef(null);
  const place = useRef(null);
  const par = useRef(null);
  const root = useRef(null);
  if (show && startedAt === null && typeof performance !== 'undefined') startedAt = performance.now();

  const finish = useCallback(() => { over = true; document.body.style.overflow = ''; setShow(false); }, []);

  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode: it just plays again next visit */ }
    document.body.style.overflow = 'hidden';
    const done = setTimeout(finish, UNMOUNT_MS);
    // 000 -> 100, written straight into the DOM (no React re-render per frame).
    let raf = 0, t0 = 0, idx = 0;
    const tick = (now) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / COUNT_MS);
      const e = p < 0.5 ? 4 * p * p * p : 1 - ((-2 * p + 2) ** 3) / 2; // ease in and out
      if (count.current) count.current.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (bar.current) bar.current.style.transform = `scaleX(${e})`;
      let i = 0;
      while (i < PLACES.length - 1 && e >= PLACES[i + 1][0]) i += 1;
      if (i !== idx && place.current) { idx = i; place.current.textContent = PLACES[i][1]; }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { clearTimeout(done); cancelAnimationFrame(raf); document.body.style.overflow = ''; };
  }, [show, finish]);

  // Depth: the contour map drifts a little against the pointer (mouse only; touch screens and reduced motion get none).
  useEffect(() => {
    if (!show || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    let raf = 0, x = 0, y = 0;
    const scenes = root.current ? [...root.current.querySelectorAll('.splash-scene')] : [];
    const step = () => {
      raf = 0;
      // 3D: the whole title tilts toward the pointer. Both curtain halves get the same transform, so the seam stays in line.
      // The transform is written straight on the two scene elements: changing a CSS variable on the root made the browser
      // re-check every element of the intro (hundreds of letter layers and map lines) on each pointer move.
      const tilt = `perspective(1500px) rotateX(${(-y * 10).toFixed(1)}deg) rotateY(${(x * 16).toFixed(1)}deg)`;
      scenes.forEach((el) => { el.style.transform = tilt; });
      if (par.current) par.current.style.transform = `translate3d(${(-x * 22).toFixed(1)}px, ${(-y * 14).toFixed(1)}px, 0) scale(1.05)`;
    };
    const move = (e) => { x = e.clientX / window.innerWidth - 0.5; y = e.clientY / window.innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(step); };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [show]);

  // Click, tap or key press skips: the intro fades out fast and the page text rises straight away.
  useEffect(() => {
    if (!show) return undefined;
    const skip = () => {
      if (skipped) return;
      skipped = true;
      document.documentElement.dataset.introSkip = '1';
      setLeaving(true);
      setTimeout(finish, 480);
    };
    const onKey = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) skip(); };
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', onKey); };
  }, [show, finish]);

  if (!show) return null;
  return (
    <div ref={root} aria-hidden="true" data-testid="intro-splash" className={`splash-root fixed inset-0 z-[9999] overflow-hidden ${leaving ? 'splash-leaving' : ''}`}>
      <div className="splash-panel splash-top" />
      <div className="splash-panel splash-bottom" />

      <div className="splash-fx absolute inset-0">
        <div className="splash-glow absolute inset-0" />
        <div ref={par} className="splash-par absolute inset-0">
          {/* accent={17}: one long major line (it enters at the right edge, sweeps over the top of the name and ends at the bottom) is drawn in orange
              with a soft halo, as the single warm thread of the map. It is path 17 of this seed/size; pick the index again if levels or cell change. */}
          <Contours seed="souley-intro" width={1600} height={900} levels={16} cell={24} terrain draw accent={17} className="splash-contours absolute inset-0 h-full w-full" />
        </div>
        <span className="splash-seam" />
        <span className="splash-skip">Click to skip</span>
        <span className="splash-hair splash-hair-t" />
        <span className="splash-hair splash-hair-b" />
        <span className="splash-hair splash-hair-l" />
        <span className="splash-hair splash-hair-r" />
        <div className="splash-meter absolute left-1/2 -translate-x-1/2 text-center">
          <span ref={count} className="block font-display text-lg tabular-nums tracking-[.3em] text-[#ff6a13]">000</span>
          <span className="mt-3 block h-px w-[min(280px,56vw)] bg-white/15"><span ref={bar} className="block h-px origin-left bg-[#ff6a13]" style={{ transform: 'scaleX(0)' }} /></span>
          <span ref={place} className="splash-place mt-3 block text-[.62rem] uppercase tracking-[.45em] text-[#ffffff]/60">Maasin</span>
        </div>
      </div>

      <div className="splash-half splash-top"><div className="splash-scene splash-scene-top"><Scene /></div></div>
      <div className="splash-half splash-bottom"><div className="splash-scene splash-scene-bottom"><Scene /></div></div>
    </div>
  );
}
