import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// The site header stays with you on screens from tablet up: it tightens and blurs once you scroll,
// slides away while you read downward, comes back the moment you scroll up, and draws a thin
// orange line showing how far down the page you are. (Not on /experience, which has its own sticky bar.)
export default function StickyHeader({ children }) {
  const { pathname } = useLocation();
  const ref = useRef(null);
  const bar = useRef(null);
  const sticky = !pathname.startsWith('/experience');

  useEffect(() => {
    const el = ref.current;
    if (!el || !sticky) return undefined;
    let last = window.scrollY, hidden = false, raf = 0;
    const show = () => { hidden = false; el.dataset.hidden = ''; };
    const update = () => {
      raf = 0;
      const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      el.dataset.scrolled = y > 40 ? '1' : '';
      if (y > last + 4 && y > 320 && !hidden) { hidden = true; el.dataset.hidden = '1'; }
      else if ((y < last - 4 || y < 320) && hidden) show();
      if (Math.abs(y - last) > 4) last = y;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('focusin', show); // keyboard users never lose the menu
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); el.removeEventListener('focusin', show);
      el.dataset.hidden = ''; el.dataset.scrolled = '';
    };
  }, [sticky, pathname]);

  return (
    <header ref={ref} className={`site-header surface-dark bg-night ${sticky ? 'relative sm:sticky sm:top-0 sm:z-[1200]' : 'relative'}`}>
      {children}
      <span ref={bar} aria-hidden="true" className="header-progress pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-orange" style={{ transform: 'scaleX(0)' }} />
    </header>
  );
}
