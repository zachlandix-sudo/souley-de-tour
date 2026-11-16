import { useState } from 'react';
import SpotImage from '../SpotImage';
import { useI18n } from '../../i18n/I18nContext';

// Compares the photo by day with a simulated night look (CSS filter, not a real night photo).
export default function DayNightSlider({ src, alt }) {
  const { t } = useI18n();
  const [v, setV] = useState(50);
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <SpotImage src="" alt={alt} className="h-64 w-full sm:h-80" />;
  return (
    <div>
      <div className="relative h-64 overflow-hidden sm:h-80">
        <img src={src} alt={`${alt} by day`} onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
        <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.4) saturate(0.8) hue-rotate(190deg)', clipPath: `inset(0 0 0 ${v}%)` }} />
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${v}%` }} />
        <span className="xp-tag left-3">{t('dn.day')}</span>
        <span className="xp-tag right-3">{t('dn.night')}</span>
      </div>
      <input type="range" min="0" max="100" value={v} onChange={(e) => setV(Number(e.target.value))} aria-label={t('dn.slide')} className="xp-range" />
    </div>
  );
}
