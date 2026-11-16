import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { formatDistance, stampLook, stampTilt, STAMP_RADIUS_KM } from '../../utils/passport';
import StampMark from './StampMark';
import { toLatLng } from '../../utils/geo';

const LOCALES = { en: 'en-PH', fil: 'fil-PH', ceb: 'en-PH' };

// The stamp: a pressed mark with the visit date (its own shape and ink colour per spot), or a dashed outline waiting for one.
function Mark({ id, stamp, locale, slam, town }) {
  const look = stampLook(id);
  if (!stamp) {
    return <span aria-hidden="true" className="pp-empty-mark pp-stamp-slot"><StampMark ghost town={town} {...look} /></span>;
  }
  const d = new Date(stamp.at);
  return (
    <span aria-hidden="true" className="pp-stamp-slot">
      <span style={{ '--tilt': `${stampTilt(id) * 1.5}deg`, transform: 'rotate(var(--tilt))' }}
        className={`pp-ink-mark block h-full w-full ${slam ? 'stamp-slam' : ''}`}>
        <StampMark {...look} town={town} method={stamp.method}
          day={d.toLocaleDateString(locale, { day: 'numeric' })} mon={d.toLocaleDateString(locale, { month: 'short' })} year={d.toLocaleDateString(locale, { year: 'numeric' })} />
      </span>
      {slam && (
        <>
          <span style={{ borderColor: look.ink }} className="stamp-ink pointer-events-none absolute inset-0 rounded-full border-2" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} style={{ '--a': `${i * 45 + 12}deg`, background: look.ink }} className="stamp-speck pointer-events-none absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full" />
          ))}
        </>
      )}
    </span>
  );
}

// One spot in the passport. `origin` is the visitor's [lat, lng] (or null); `check` is canStamp(spot, origin).
export default function StampCard({ spot, stamp, origin, check, onStamp, onManual, onRemove, index = 0 }) {
  const { t, lang } = useI18n();
  const locale = LOCALES[lang] || 'en-PH';
  const hasCoords = !!toLatLng(spot);

  // Only a stamp pressed just now slams down; stamps already in the passport appear quietly.
  const had = useRef(!!stamp);
  const [slam, setSlam] = useState(false);
  useEffect(() => {
    if (stamp && !had.current) {
      had.current = true; setSlam(true);
      const id = setTimeout(() => setSlam(false), 1500);
      return () => clearTimeout(id);
    }
    had.current = !!stamp;
    return undefined;
  }, [stamp]);

  let hint = '';
  if (!stamp) {
    if (!hasCoords) hint = t('passport.noCoords');
    else if (!origin) hint = t('passport.needLoc');
    else if (!check.ok) hint = t('passport.tooFar', { d: formatDistance(check.distanceKm), r: Math.round(STAMP_RADIUS_KM * 1000) });
  }

  return (
    <li style={{ '--n': Math.min(index, 8) }} className={`gal-in pp-visa ${stamp ? 'is-stamped' : ''} flex gap-4 p-4 pl-6 ${slam ? 'stamp-thud' : ''}`}>
      <Mark id={spot._id} stamp={stamp} locale={locale} slam={slam} town={spot.municipality || ''} />
      <div className="min-w-0 flex-1">
        <h4 className="font-display text-xl leading-snug"><Link to={`/spots/${spot.slug}`} className="hover:text-ember">{spot.name}</Link></h4>
        {stamp ? (
          <>
            <p className="mt-1 text-sm text-muted">
              {t('passport.stamped', { date: new Date(stamp.at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </p>
            <p className="text-xs text-muted">{stamp.method === 'manual' ? t('passport.byManual') : t('passport.byGps')}</p>
            <button type="button" onClick={() => onRemove(spot._id)} className="mt-2 text-xs text-muted underline hover:text-danger">{t('passport.remove')}</button>
          </>
        ) : (
          <>
            {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {check.ok && <button type="button" onClick={() => onStamp(spot)} className="btn btn-primary btn-sm">{t('passport.stampIt')}</button>}
              <button type="button" onClick={() => onManual(spot)} className="btn btn-outline btn-sm">{t('passport.manual')}</button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
