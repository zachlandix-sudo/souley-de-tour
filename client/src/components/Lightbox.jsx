import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SpotImage from './SpotImage';

// Full-screen photo viewer. A real dialog: Escape and the dark area close it, left/right arrows and swipes change photo,
// Tab stays inside, the page behind does not scroll, and focus goes back to the button that opened it.
export default function Lightbox({ images, index, alt, onIndex, onClose }) {
  const root = useRef(null);
  const closeBtn = useRef(null);
  const touchX = useRef(null);
  const count = images.length;
  const go = (d) => onIndex((index + d + count) % count);

  useEffect(() => {
    const opener = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = overflow; if (opener && document.contains(opener)) opener.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowRight' && count > 1) { go(1); return; }
      if (e.key === 'ArrowLeft' && count > 1) { go(-1); return; }
      if (e.key !== 'Tab' || !root.current) return;
      const items = [...root.current.querySelectorAll('button')];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
    touchX.current = null;
    if (count > 1 && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return createPortal(
    <div ref={root} className="lb-root" role="dialog" aria-modal="true" aria-label={`${alt}, photos`}>
      <div className="lb-scrim" onClick={onClose} aria-hidden="true" />
      <div className="lb-top">
        <p className="lb-count" aria-live="polite">{index + 1} / {count}</p>
        <button ref={closeBtn} type="button" className="lb-close" onClick={onClose} aria-label="Close photos">&times;</button>
      </div>
      <figure className="lb-stage" onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd}>
        <SpotImage key={index} src={images[index]} alt={`${alt}, photo ${index + 1}`} className="lb-img" />
        {count > 1 && (
          <>
            <button type="button" className="lb-nav is-prev" aria-label="Previous photo" onClick={() => go(-1)}>&larr;</button>
            <button type="button" className="lb-nav is-next" aria-label="Next photo" onClick={() => go(1)}>&rarr;</button>
          </>
        )}
      </figure>
      {count > 1 && (
        <ul className="lb-strip">
          {images.map((src, i) => (
            <li key={src + i}>
              <button type="button" aria-label={`Photo ${i + 1}`} aria-current={i === index} onClick={() => onIndex(i)} className={i === index ? 'is-on' : ''}>
                <SpotImage src={src} alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body
  );
}
