import { useEffect, useRef, useState } from 'react';
import SpotImage from './SpotImage';
import Lightbox from './Lightbox';

// The spot hero photo opens like a shutter, settles from a slight zoom, drifts slower than the page as you scroll,
// and cross-fades when you pick another thumbnail. `children` are laid over the photo (title, shade, buttons);
// they sit outside the frame that morphs into the page, so the morph moves the photo only. Thumbnails and the full-screen button float top-right.
export default function ImageGallery({ images = [], alt, slug, morph = false, children }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const frame = useRef(null);
  const list = images.filter(Boolean);

  useEffect(() => {
    const el = frame.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      el.style.setProperty('--py', String(Math.round(Math.min(28, Math.max(0, -r.top) * 0.12))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <div className="relative">
      <div ref={frame} className={`overflow-hidden ${morph ? '' : 'gallery-reveal'}`} style={morph ? { viewTransitionName: 'spot-photo' } : undefined}>
        <div className="gallery-parallax">
          <div key={index} className={morph && index === 0 ? '' : 'gallery-swap'}>
            <SpotImage src={list[index] || ''} fallbacks={index === 0 ? list.slice(1) : []} slug={slug} alt={alt} className="sd-photo w-full" />
          </div>
        </div>
      </div>
      {list.length > 0 && <button type="button" tabIndex={-1} aria-hidden="true" className="sd-zoom" onClick={() => setOpen(true)} />}
      {children}
      {list.length > 0 && (
      <ul className="sd-thumbs">
        {list.length > 1 && list.map((src, i) => (
          <li key={src + i}>
            <button type="button" aria-label={`Show photo ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className={`sd-thumb ${i === index ? 'is-on' : ''}`}>
              <SpotImage src={src} alt={`${alt} thumbnail ${i + 1}`} className="h-full w-full" />
            </button>
          </li>
        ))}
        <li><button type="button" className="sd-thumb is-expand" aria-label={list.length > 1 ? `View all ${list.length} photos` : 'View photo full screen'} onClick={() => setOpen(true)}><span aria-hidden="true">⤢</span></button></li>
      </ul>
      )}
      {open && <Lightbox images={list} index={index} alt={alt} onIndex={setIndex} onClose={() => setOpen(false)} />}
    </div>
  );
}
