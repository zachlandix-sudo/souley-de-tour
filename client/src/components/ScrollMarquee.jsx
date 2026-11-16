import { useEffect, useLayoutEffect, useRef } from 'react';
import { damp, frameDt } from '../utils/motion';

// "Night ribbon": a black band of place names that glides sideways (one line of fairly large text with generous padding, so it reads as a bold strip rather than a thin line). Scrolling speeds it up, flips its direction
// and makes it lean into the move. The name nearest the middle of the screen lights up orange. Under every name a thin
// line draws itself in and wipes itself out again, one after another (100 ms apart, 2 s each, forever), and a small
// diamond beside it does the same. Three more touches (all CSS, see index.css "ribbon"): the band opens from its middle
// the first time it scrolls into view; the name that lights up hops letter by letter while its diamond spins; and a soft
// glint crosses the band every few seconds. Decorative only: hidden from screen readers, still with "reduce motion".
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function ScrollMarquee({ items }) {
  const track = useRef(null);
  const outer = useRef(null); // never clipped: this is what the observer watches (a clipped element reads as "not on screen")
  const band = useRef(null); // the clipped, black band inside it
  // The opening: hide the band from its edges in, then let it open once it is on screen. Skipped (band simply shown)
  // for "reduce motion" and when there is no IntersectionObserver, so it can never stay hidden.
  useLayoutEffect(() => {
    const b = band.current, o = outer.current;
    if (!b || !o || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    b.classList.add('mq-prep');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { b.classList.add('is-open'); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(o);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const towns = [...el.querySelectorAll('[data-town]')];
    let centers = [];
    const measure = () => { centers = towns.map((t) => t.offsetLeft + t.offsetWidth / 2); };
    measure();
    document.fonts?.ready?.then(measure);
    window.addEventListener('resize', measure);

    let x = 0, last = window.scrollY, v = 0, dir = -1, skew = 0, lit = -1, raf = 0, visible = true, prev = 0;
    const loop = (now) => {
      raf = 0;
      // Everything below is tuned for 60 Hz; `k` (1 at 60 Hz, 0.42 at 144 Hz) keeps the speed and the easing the same on faster screens.
      const dt = frameDt(prev, now); prev = now;
      const k = dt / (1000 / 60);
      const d = window.scrollY - last; last = window.scrollY;
      v += (Math.abs(d) / k - v) * damp(0.1, dt);
      if (d !== 0) dir = d > 0 ? -1 : 1;
      x += dir * (0.55 + v * 0.45) * k;
      const half = el.scrollWidth / 2;
      if (x <= -half) x += half; else if (x > 0) x -= half;
      skew += (-dir * clamp(v * 0.5, 0, 8) - skew) * damp(0.12, dt); // lean in the direction of travel, settle when scrolling stops
      el.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      // the spotlight: the town whose centre is closest to the middle of the band
      const mid = el.parentElement.clientWidth / 2 - x;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < centers.length; i++) { const dd = Math.abs(centers[i] - mid); if (dd < bestD) { bestD = dd; best = i; } }
      if (best !== lit) { towns[lit]?.classList.remove('is-lit'); towns[best].classList.add('is-lit'); lit = best; }
      if (visible) raf = requestAnimationFrame(loop);
    };
    // Off screen: the loop stops, and the CSS loops (drawn lines, glint) are paused through .mq-off.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      outer.current?.classList.toggle('mq-off', !visible);
      if (visible && !raf) { prev = 0; raf = requestAnimationFrame(loop); }
    });
    io.observe(el.parentElement);
    raf = requestAnimationFrame(loop);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, []);

  const row = items.map((name, i) => {
    const wait = { '--d': `${i * 100}ms` };
    return (
      <span key={name} data-town className="marquee-item mr-[0.6em] inline-flex items-center gap-[0.6em]">
        <span className="relative inline-block pb-[0.1em]">
          <sup style={{ fontSize: 'max(.6rem, .26em)' }} className="mr-[0.3em] align-top font-sans font-semibold tracking-[.2em] text-orange">{String(i + 1).padStart(2, '0')}</sup>
          <span className={`marquee-name ${i % 2 ? 'marquee-solid' : 'marquee-outline'}`}>
            {[...name].map((ch, k) => <span key={k} className="mq-ch" style={{ '--k': k }}>{ch === ' ' ? '\u00a0' : ch}</span>)}
          </span>
          <svg className="marquee-line absolute inset-x-0 bottom-0 h-[2px] w-full" viewBox="0 0 100 2" preserveAspectRatio="none" focusable="false"><path d="M0 1H100" pathLength="1" style={wait} /></svg>
        </span>
        <svg className="marquee-gem h-[.34em] w-[.34em] shrink-0" viewBox="0 0 20 20" focusable="false"><path d="M10 1 19 10 10 19 1 10Z" pathLength="1" style={wait} /></svg>
      </span>
    );
  });
  return (
    <div ref={outer} aria-hidden="true" className="surface-dark relative">
    <div ref={band} className="mq-band relative overflow-hidden bg-night py-6 text-[#ffffff] sm:py-8">
      <div className="marquee-glow pointer-events-none absolute inset-0" />
      <span className="marquee-rule absolute inset-x-0 top-0 h-px" />
      <span className="marquee-rule absolute inset-x-0 bottom-0 h-px" />
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-night to-transparent sm:w-32" />
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-night to-transparent sm:w-32" />
      <div ref={track} className="relative flex w-max whitespace-nowrap font-display text-[clamp(2.1rem,4.8vw,3.9rem)] leading-none will-change-transform">
        <div className="flex">{row}</div><div className="flex">{row}</div>
      </div>
      <span className="mq-sweep" />
    </div>
    </div>
  );
}
