import { useLayoutEffect, useRef, useState } from 'react';

// A number that counts up once, when it scrolls into view. Without IntersectionObserver (tests, old browsers) or with
// "reduce motion" it simply shows the final number.
export default function CountUp({ value = 0 }) {
  const end = Number(value) || 0;
  const ref = useRef(null);
  const [n, setN] = useState(end);
  useLayoutEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || end === 0 || !ref.current) { setN(end); return undefined; }
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const dur = 800 + Math.min(700, end * 5);
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        setN(Math.round(end * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [end]);
  return <span ref={ref}>{n}</span>;
}
