import { useEffect, useRef } from 'react';

// A statement that lights up word by word as it scrolls into the middle of the screen. `as` picks the element (p by default, blockquote for a quote).
// The scroll listener only runs while the statement is near the screen, and a word's style is only written when its
// value actually changed, so the rest of the page never pays for it.
export default function ScrollLitText({ text, className = '', as: Tag = 'p' }) {
  const ref = useRef(null);
  const words = String(text).split(' ');
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const spans = [...el.querySelectorAll('[data-w]')];
    const shown = spans.map(() => '');
    let raf = 0, live = false;
    const update = () => {
      raf = 0;
      const b = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - b.top) / (vh * 0.5 + b.height * 0.6)));
      spans.forEach((w, i) => {
        const o = (0.16 + 0.84 * Math.min(1, Math.max(0, p * spans.length * 1.2 - i))).toFixed(3);
        if (o !== shown[i]) { shown[i] = o; w.style.opacity = o; }
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const start = () => { if (live) return; live = true; window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); onScroll(); };
    const stop = () => { if (!live) return; live = false; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
    update();
    // Without IntersectionObserver (tests, old browsers) it simply listens all the time, as before.
    if (typeof IntersectionObserver === 'undefined') start();
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else { update(); stop(); } }, { rootMargin: '120px 0px' });
    io?.observe(el);
    return () => { io?.disconnect(); cancelAnimationFrame(raf); stop(); };
  }, [text]);
  return <Tag ref={ref} className={className}>{words.map((w, i) => <span key={i} data-w className="transition-opacity duration-200">{w}{i < words.length - 1 ? ' ' : ''}</span>)}</Tag>;
}
