import { useLayoutEffect, useRef, useState } from 'react';
import { hashSeed } from '../utils/contours.js';

// "Unveil": the card photo reveal. Wrap the <SpotImage> inside the photo frame (the frame keeps position: relative,
// overflow: hidden). The photo starts hidden; when the card is 30% in view it is drawn up like a curtain, with a thin
// ember light-line riding the edge, while the picture settles from a slow 1.28x zoom, comes up out of the dark, and a
// single soft glint crosses it at the end. Plays once per card, then the extra layers are removed.
//
// Only clip-path, transform and opacity animate (no blur, no filter, no shadow). The look lives in index.css,
// block "card photo reveal"; this file only decides WHEN it plays:
//   data-pr="wait"  hidden, waiting to come into view (painted in a layout effect, so the photo never flashes first)
//   data-pr="play"  the 2.2 s reveal
//   data-pr="done"  nothing left; the photo is just a photo (also the start state with reduce-motion, jsdom, old browsers)
// The reveal starts only once the photo has loaded (or failed, or 1.4 s passed), so an empty frame is never "revealed".
// Clicking the card mid-reveal finishes it at once, so the photo morph to the spot page starts from the clean photo.

export const REVEAL_MS = 2200; // curtain 1.4 s, settle 2.2 s, glint ends at 2.2 s (keep in step with index.css)
const READY_CAP_MS = 1400;
export const revealDelay = (seed) => hashSeed(seed) % 320; // so a row of cards does not open in lockstep

const canPlay = () => typeof window !== 'undefined'
  && typeof IntersectionObserver !== 'undefined'
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

export default function PhotoReveal({ seed, children }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState(() => (canPlay() ? 'wait' : 'done'));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.dataset.pr !== 'wait') return undefined;

    const timers = [];
    const cleanups = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    const finish = () => { el.dataset.pr = 'done'; setPhase('done'); };
    const play = () => { setPhase('play'); later(finish, REVEAL_MS + 1300); }; // the timer is only a safety net

    // Wait for the photo (load or error), but never longer than READY_CAP_MS.
    const whenReady = (cb) => {
      const img = el.querySelector('img');
      if (!img || img.complete) { cb(); return; }
      let fired = false;
      const go = () => { if (fired) return; fired = true; img.removeEventListener('load', go); img.removeEventListener('error', go); cb(); };
      img.addEventListener('load', go);
      img.addEventListener('error', go);
      later(go, READY_CAP_MS);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      whenReady(() => later(play, revealDelay(seed)));
    }, { threshold: 0.3 });
    io.observe(el);

    const onEnd = (e) => { if (e.target.classList?.contains('pr-glint')) finish(); }; // the glint is the last layer to end
    el.addEventListener('animationend', onEnd);

    const link = el.closest('a');
    link?.addEventListener('click', finish);

    cleanups.push(() => io.disconnect(), () => el.removeEventListener('animationend', onEnd), () => link?.removeEventListener('click', finish));
    return () => { timers.forEach(clearTimeout); cleanups.forEach((fn) => fn()); };
  }, [seed]);

  return (
    <div ref={ref} data-pr={phase} className="pr">
      <div className="pr-clip"><div className="pr-zoom">{children}</div></div>
      {phase !== 'done' && (
        <>
          <span aria-hidden="true" className="pr-edge" />
          <span aria-hidden="true" className="pr-glint" />
        </>
      )}
    </div>
  );
}
