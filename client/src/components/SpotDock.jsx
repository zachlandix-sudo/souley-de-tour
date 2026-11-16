import { useEffect, useRef, useState } from 'react';

const smooth = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth');
export const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: smooth(), block: 'start' });

// A floating "on this page" pill. It slides up once the hero photo has scrolled away, highlights the section you are in,
// draws your reading progress along its bottom edge, and has a back-to-top button. Buttons, not #links, so the address
// (and the router) stay untouched. Without IntersectionObserver (tests, old browsers) it simply does not render.
export default function SpotDock({ items, heroRef }) {
  const bar = useRef(null);
  const [show, setShow] = useState(false);
  const [active, setActive] = useState(items[0]?.[0]);
  const supported = typeof IntersectionObserver !== 'undefined';
  const key = items.map(([id]) => id).join('|');

  useEffect(() => {
    if (!supported || !heroRef.current) return undefined;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(heroRef.current);
    return () => io.disconnect();
  }, [heroRef, supported]);

  useEffect(() => {
    if (!supported) return undefined;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }), { rootMargin: '-35% 0px -60% 0px' });
    items.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [key, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.current?.style.setProperty('--p', max > 0 ? String(Math.min(1, h.scrollTop / max)) : '0');
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', on, { passive: true });
    update();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); };
  }, []);

  if (!supported) return null;
  return (
    <nav ref={bar} className={`sd-dock ${show ? 'is-on' : ''}`} aria-label="On this page">
      <span className="sd-dock-bar" aria-hidden="true" />
      {items.map(([id, label]) => (
        <button key={id} type="button" className={active === id ? 'is-on' : ''} aria-current={active === id ? 'true' : undefined} onClick={() => jumpTo(id)}>{label}</button>
      ))}
      <button type="button" className="sd-dock-top" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: smooth() })}>&uarr;</button>
    </nav>
  );
}
