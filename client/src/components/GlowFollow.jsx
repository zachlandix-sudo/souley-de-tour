import { useEffect, useRef } from 'react';
import { damp, frameDt } from '../utils/motion';

// A soft pool of warm light that glides after the pointer across its parent. Desktop only.
export default function GlowFollow({ size = 640, alpha = 0.18, className = '' }) {
  const el = useRef(null);
  useEffect(() => {
    const node = el.current, host = node?.parentElement;
    if (!host || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let x = 0, y = 0, tx = 0, ty = 0, a = 0, ta = 0, raf = 0, prev = 0;
    const paint = (now) => {
      raf = 0;
      const dt = frameDt(prev, now); prev = now; // same glide on 60 and 144 Hz screens
      const f = damp(0.07, dt);
      x += (tx - x) * f; y += (ty - y) * f; a += (ta - a) * damp(0.06, dt);
      node.style.background = `radial-gradient(${size}px circle at ${x}px ${y}px, rgba(255,150,70,${alpha * a}), rgba(255,106,19,${alpha * a * 0.35}) 38%, transparent 70%)`;
      if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5 || Math.abs(ta - a) > 0.01) raf = requestAnimationFrame(paint); else prev = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
    const move = (e) => { const r = host.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!ta) { x = tx; y = ty; } ta = 1; kick(); };
    const leave = () => { ta = 0; kick(); };
    host.addEventListener('pointermove', move); host.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); };
  }, [size, alpha]);
  return <div ref={el} aria-hidden="true" className={`pointer-events-none absolute inset-0 mix-blend-screen ${className}`} />;
}
