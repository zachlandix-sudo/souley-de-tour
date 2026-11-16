import { useEffect, useRef } from 'react';
import { damp, frameDt } from '../utils/motion';

// Wraps a card so it leans toward the pointer in 3D while a soft light follows the pointer across the glass.
// It only writes CSS variables on its own element (--rx, --ry, --gx, --gy, --gl); the look is in index.css (.about-tilt, .about-card::after).
// Mouse / pen only: a phone or a reduced-motion setting gets a flat card. The loop runs only while the card is still moving.
export default function TiltCard({ className = '', max = 7, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const mq = (q) => window.matchMedia?.(q).matches;
    if (!el || mq('(prefers-reduced-motion: reduce)') || !mq('(hover: hover) and (pointer: fine)')) return undefined;
    const s = { x: 0, y: 0, tx: 0, ty: 0, g: 0, tg: 0, raf: 0, prev: 0 };
    let box = null; // where the card sits, measured while it is NOT tilted, so the tilt cannot feed back into the measurement
    const measure = () => { const r = el.getBoundingClientRect(); box = { l: r.left, t: r.top, w: Math.max(1, r.width), h: Math.max(1, r.height), sx: window.scrollX, sy: window.scrollY }; };
    const put = () => {
      el.style.setProperty('--rx', `${(-s.y * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(s.x * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${((s.x + 1) * 50).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((s.y + 1) * 50).toFixed(1)}%`);
      el.style.setProperty('--gl', s.g.toFixed(3));
    };
    const loop = (now) => {
      s.raf = 0;
      const k = damp(0.13, frameDt(s.prev, now)); s.prev = now;
      s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; s.g += (s.tg - s.g) * k;
      put();
      if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.tg - s.g) > 0.004) s.raf = requestAnimationFrame(loop); else s.prev = 0;
    };
    const kick = () => { if (!s.raf) s.raf = requestAnimationFrame(loop); };
    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      if (!box) measure();
      const left = box.l + (box.sx - window.scrollX), top = box.t + (box.sy - window.scrollY);
      s.tx = Math.max(-1, Math.min(1, ((e.clientX - left) / box.w) * 2 - 1));
      s.ty = Math.max(-1, Math.min(1, ((e.clientY - top) / box.h) * 2 - 1));
      s.tg = 1; kick();
    };
    const onLeave = () => { s.tx = 0; s.ty = 0; s.tg = 0; box = null; kick(); };
    el.addEventListener('pointerenter', measure);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(s.raf);
      el.removeEventListener('pointerenter', measure); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave);
    };
  }, [max]);
  return <div ref={ref} className={className}>{children}</div>;
}
