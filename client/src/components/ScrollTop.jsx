import { useEffect, useRef, useState } from 'react';

// A round "back to top" button that appears once you have scrolled a way down. The orange ring around it fills as you scroll
// through the page. Sits bottom-left (the Ask guide lives bottom-right). Look: index.css, block "spots page motion".
export default function ScrollTop({ after = 700 }) {
  const ring = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      ring.current?.style.setProperty('--p', (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4));
      setShow(window.scrollY > after);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [after]);

  const up = () => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return (
    <button type="button" className={`sp-top${show ? ' is-on' : ''}`} aria-label="Back to top" aria-hidden={!show} tabIndex={show ? 0 : -1} onClick={up}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="sp-top-track" cx="22" cy="22" r="19" />
        <circle ref={ring} className="sp-top-ring" cx="22" cy="22" r="19" />
        <path d="M22 28V16M16 21l6-6 6 6" />
      </svg>
    </button>
  );
}
