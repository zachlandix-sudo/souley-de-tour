import { useLayoutEffect, useRef, useState } from 'react';

// Section titles: the words slide up one by one from behind an invisible edge (the same family as the big Home title),
// slow and soft, once, when the title scrolls into view. A short orange line then draws itself under it.
//   align="center": for a centred title (the line draws from the middle).   rule={false}: no line.
// Without IntersectionObserver (tests, old browsers) or with "reduce motion" it renders as a plain heading, nothing
// moves. While it animates, the words are aria-hidden and the heading keeps its full text for screen readers.
export default function CalmTitle({ as: Tag = 'h2', text, align = 'left', rule = true, className = '', ...rest }) {
  const ref = useRef(null);
  const [mode, setMode] = useState('plain'); // plain -> armed (words hidden) -> in (words risen)

  // Layout effect: the words are hidden before the browser paints, so the title never flashes and then jumps.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setMode('plain'); return undefined; }
    setMode('armed');
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setMode('in'); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  const animated = mode !== 'plain';
  const words = String(text).split(' ');
  return (
    <Tag ref={ref} className={`calm-title ${animated ? 'is-armed' : ''} ${mode === 'in' ? 'is-in' : ''} ${align === 'center' ? 'is-center' : ''} ${className}`} {...rest}>
      {animated ? (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">
            {words.map((w, i) => (
              <span key={i}><span className="calm-mask"><span className="calm-word" style={{ '--i': i }}>{w}</span></span>{i < words.length - 1 ? ' ' : ''}</span>
            ))}
          </span>
          {rule && <span aria-hidden="true" className="calm-rule" />}
        </>
      ) : text}
    </Tag>
  );
}
