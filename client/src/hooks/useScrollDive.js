import { useEffect } from 'react';

// Scroll "dive": writes --dive on the element, 0 while it fills the top of the screen, 1 once it has scrolled away.
// CSS does the rest (see ".hero-dive" in index.css), so the only work per frame is one style write.
// The scroll listener only runs while the element is on screen. With "reduce motion" or without IntersectionObserver
// the hook does nothing and the element never gets the data-dive attribute that the CSS needs, so it stays still.
export function useScrollDive(ref, { reach = 0.8 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0, listening = false;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * reach)));
      el.style.setProperty('--dive', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const start = () => { if (listening) return; listening = true; el.setAttribute('data-dive', ''); update(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); };
    const stop = () => { if (!listening) return; listening = false; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else { update(); stop(); } });
    io.observe(el);
    return () => { io.disconnect(); stop(); cancelAnimationFrame(raf); el.removeAttribute('data-dive'); el.style.removeProperty('--dive'); };
  }, [ref, reach]);
}
