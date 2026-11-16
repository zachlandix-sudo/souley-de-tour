import { useEffect, useRef } from 'react';

// Desktop only. A soft ring trails the pointer and swells over anything clickable; buttons lean toward the pointer.
// INP (update 66): the pointermove handler only stores the position and the element under it. The hit test (closest) and the
// layout reads (getBoundingClientRect) run once per frame in the loop, so they never force a layout in the middle of an event
// while another component has just changed styles, and a fast mouse costs one hit test per frame, not one per event.
export default function CustomCursor() {
  const ring = useRef(null);
  const dot = useRef(null);
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const r = ring.current, d = dot.current;
    document.documentElement.classList.add('has-cursor');
    let x = -100, y = -100, rx = -100, ry = -100, s = 1, ts = 1, raf = 0, magnet = null, over = null;
    const release = () => { if (magnet) { magnet.style.transform = ''; magnet = null; } };
    // What the pointer is over: swell the ring on clickable things, lean a button toward the pointer, move the light on a card.
    const hover = (target) => {
      const t = target?.closest?.('a, button, summary, label, [role="button"]');
      ts = t ? 2.1 : 1; r.dataset.hot = t ? '1' : '';
      const b = target?.closest?.('.btn');
      if (b !== magnet) release();
      if (b && !b.disabled) {
        const box = b.getBoundingClientRect();
        b.style.transform = `translate(${(x - (box.left + box.width / 2)) * 0.22}px, ${(y - (box.top + box.height / 2)) * 0.3}px)`;
        magnet = b;
      }
      const lc = target?.closest?.('.lux-card');
      if (lc) { const lb = lc.getBoundingClientRect(); lc.style.setProperty('--mx', `${x - lb.left}px`); lc.style.setProperty('--my', `${y - lb.top}px`); }
    };
    const loop = () => {
      raf = 0;
      if (over) { const target = over; over = null; hover(target); }
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; s += (ts - s) * 0.18;
      r.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0) scale(${s})`;
      d.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1 || Math.abs(ts - s) > 0.01) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const onMove = (e) => {
      x = e.clientX; y = e.clientY; over = e.target;
      if (r.dataset.on !== '1') r.dataset.on = d.dataset.on = '1';
      kick();
    };
    const onLeave = () => { over = null; r.dataset.on = d.dataset.on = ''; release(); };
    const onDown = () => { if (r.dataset.press !== '1') r.dataset.press = '1'; };
    const onUp = () => { if (r.dataset.press) r.dataset.press = ''; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown); window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf); release();
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown); window.removeEventListener('pointerup', onUp);
    };
  }, []);
  return (
    <>
      <div ref={ring} aria-hidden="true" className="cursor-ring" />
      <div ref={dot} aria-hidden="true" className="cursor-dot" />
    </>
  );
}
