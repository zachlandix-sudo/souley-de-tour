import { useEffect, useRef, useState } from 'react';

// Slow, expensive-feeling entrance: content drifts up out of a soft blur as it enters the screen.
// Add the `lux-rule` class to give the element a hairline that draws itself across the top.
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`lux-reveal ${shown ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}s` }} {...rest}>{children}</Tag>;
}
