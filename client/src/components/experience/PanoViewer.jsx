import { useRef, useState } from 'react';
import SpotImage from '../SpotImage';
import { useI18n } from '../../i18n/I18nContext';

// Drag (or use arrow keys) to pan across a wide crop of the photo.
export default function PanoViewer({ src, alt }) {
  const { t } = useI18n();
  const box = useRef(null);
  const drag = useRef(null);
  const [pos, setPos] = useState(50); // percent
  const [failed, setFailed] = useState(false);
  const clamp = (v) => Math.max(0, Math.min(100, v));

  if (!src || failed) return <SpotImage src="" alt={alt} className="h-64 w-full sm:h-80" />;

  const onDown = (e) => { drag.current = { x: e.clientX, pos }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current || !box.current) return;
    const w = box.current.clientWidth || 1;
    setPos(clamp(drag.current.pos - ((e.clientX - drag.current.x) / w) * 100));
  };
  const onUp = () => { drag.current = null; };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setPos((p) => clamp(p - 8)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPos((p) => clamp(p + 8)); }
  };

  return (
    <div>
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-label={t('pano.aria', { alt })}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
        className="h-64 cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing sm:h-80"
      >
        <img src={src} alt={alt} draggable={false} onError={() => setFailed(true)}
          className="h-full w-[220%] max-w-none select-none object-cover"
          style={{ transform: `translateX(-${pos * (120 / 220)}%)` }} />
      </div>
      <p className="xp-hint">{t('pano.hint')}</p>
    </div>
  );
}
