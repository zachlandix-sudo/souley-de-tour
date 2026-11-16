import { useEffect, useRef, useState } from 'react';

const canAnimate = () => typeof IntersectionObserver !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Tells a section when it has first scrolled into view.
//   const [ref, phase] = useInViewOnce();   phase: 'plain' | 'armed' | 'in'
// 'armed' is true from the very first render (so CSS can hide the content before the browser paints, no flash),
// 'in' is set once the element is on screen and stays set. With "reduce motion" or without IntersectionObserver
// (tests, old browsers) the phase is always 'plain': nothing is hidden and nothing moves.
export function useInViewOnce({ rootMargin = '0px 0px -15% 0px' } = {}) {
  const ref = useRef(null);
  const [armed] = useState(canAnimate);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!armed || seen || !el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setSeen(true); } }, { threshold: 0, rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [armed, seen, rootMargin]);
  return [ref, !armed ? 'plain' : seen ? 'in' : 'armed'];
}
