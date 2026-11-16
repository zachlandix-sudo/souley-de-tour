import { useLayoutEffect, useRef, useState } from 'react';

// Text that assembles itself: every word (or letter) is its own inline-block that springs up from 0.35em below
// while fading in, one after another, once, when the block scrolls into view.
//   by="word" | "letter"   stagger: ms between units   delay: ms before the first unit
// Without IntersectionObserver (tests, old browsers) or with "reduce motion" it renders as plain text. While it
// animates the units are aria-hidden and a screen-reader copy keeps the full text.
export default function SplitText({ as: Tag = 'span', text, by = 'word', stagger = 40, delay = 0, className = '', ...rest }) {
  const ref = useRef(null);
  const [mode, setMode] = useState('plain'); // plain -> armed -> in

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setMode('plain'); return undefined; }
    setMode('armed');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setMode('in'); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  if (mode === 'plain') return <Tag ref={ref} className={className} {...rest}>{text}</Tag>;

  let n = 0;
  const words = String(text).split(' ');
  return (
    <Tag ref={ref} className={`st ${mode === 'in' ? 'is-in' : ''} ${className}`} style={{ '--st-d': `${delay}ms`, '--st-s': `${stagger}ms` }} {...rest}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="st-flow">
        {words.map((w, wi) => (
          <span key={wi} className="st-word">
            {by === 'letter'
              ? Array.from(w).map((c, ci) => <span key={ci} className="st-u" style={{ '--i': n++ }}>{c}</span>)
              : <span className="st-u" style={{ '--i': n++ }}>{w}</span>}
          </span>
        ))}
      </span>
    </Tag>
  );
}
