import { useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useCountTo } from '../hooks/useCountTo';
import { COUNT_MS, MODES, ROUTE_DRAW_MS, arrival, estimateTravel, formatDuration, formatRoadKm } from '../utils/travel';

const ERRORS = { denied: 'travel.denied', unsupported: 'travel.unsupported', error: 'travel.error' };
const SLOT = 'surface-dark absolute right-3 top-3 z-[600] w-[min(19rem,calc(100%-1.5rem))]';

function ModeIcon({ id }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  if (id === 'walk') return <svg {...common}><circle cx="13" cy="4.5" r="1.7" /><path d="M13 8l-2 5.5 3 3-1 5M11.8 9.6L8.6 12M12.4 9.6l3.4 2.4M11 13.5l-3 6" /></svg>;
  if (id === 'bike') return <svg {...common}><circle cx="5.5" cy="16.5" r="3" /><circle cx="18.5" cy="16.5" r="3" /><path d="M5.5 16.5H11l3-6.5h3.5M14 10l-1.5-3H10" /></svg>;
  return <svg {...common}><path d="M4 16v-3.5L6.2 8h11.6L20 12.5V16zM4 16v2M20 16v2" /><circle cx="8" cy="14.5" r="1" /><circle cx="16" cy="14.5" r="1" /></svg>;
}

// The card: "from you to <spot>", the estimated time counting up as the route is drawn, and a walk / motorbike / car switch.
function TravelCard({ spot, origin, dest, mode, onMode, phase, motion, onClose }) {
  const { t } = useI18n();
  const est = useMemo(() => estimateTravel(origin, dest, mode), [origin, dest, mode]);
  const counting = phase === 'drawing' || phase === 'done';
  const settled = phase === 'done' || !motion;
  const opts = { enabled: counting, firstMs: ROUTE_DRAW_MS, moreMs: COUNT_MS, animate: motion };
  const minutes = useCountTo(est ? est.minutes : 0, opts);
  const km = useCountTo(est ? est.roadKm : 0, opts);
  const when = useMemo(() => (est ? arrival(new Date(), est.minutes) : null), [est]);
  if (!est) return null;

  const modeLabel = t(MODES.find((m) => m.id === mode)?.labelKey || 'travel.car').toLowerCase();
  const shownTime = minutes < 1 && est.minutes >= 1 ? '0 min' : formatDuration(minutes); // no "< 1 min" flash at the start of the count
  const arriveTime = `${when.time}${when.dayOffset > 0 ? ` (+${when.dayOffset} d)` : ''}`;

  return (
    <div className={`${SLOT} travel-card border-l-4 border-orange bg-night text-white shadow-lg`}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-orange">{t('travel.from')}</p>
          <p className="truncate font-display text-lg leading-tight">{spot.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('travel.close')} className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center text-white/70 transition-colors hover:text-orange">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
        </button>
      </div>

      <div className="px-4 pb-3 pt-2">
        <p aria-hidden="true" title={t('travel.estimate')} className="font-display text-3xl leading-none tabular-nums sm:text-4xl">
          {counting ? shownTime : <span className="travel-calc text-lg text-white/70">{t('travel.calculating')}</span>}
        </p>
        <p aria-hidden="true" className="mt-1.5 min-h-4 text-xs text-white/70">{counting ? t('travel.km', { km: formatRoadKm(km) }) : ''}</p>
        <p className={`min-h-4 text-xs text-white/70 transition-opacity duration-500 ${settled ? 'opacity-100' : 'opacity-0'}`}>{t('travel.arrive', { time: arriveTime })}</p>
        <p className="sr-only" aria-live="polite">{settled ? t('travel.live', { time: formatDuration(est.minutes), mode: modeLabel }) : ''}</p>
      </div>

      <div role="group" aria-label={t('travel.mode')} className="grid grid-cols-3 border-t border-white/15">
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => onMode(m.id)}
            className={`flex min-h-11 items-center justify-center gap-1.5 px-2 text-xs font-semibold transition-colors ${mode === m.id ? 'bg-orange text-black' : 'text-white/80 hover:bg-white/10'}`}>
            <ModeIcon id={m.id} />
            <span>{t(m.labelKey)}</span>
          </button>
        ))}
      </div>
      <p className="hidden px-4 pb-3 pt-2 text-[0.68rem] leading-snug text-white/60 sm:block">{t('travel.estimate')}</p>
    </div>
  );
}

// What sits in the corner of the map, depending on how far along the visitor is:
//   no location yet      a button: "Travel time from me"  (and the reason, if the browser said no)
//   location, no spot    a one-line hint: tap a pin
//   location + spot      the card
// `near` is the object returned by useNearMe. `phase` comes from TravelLayer ('flying' | 'drawing' | 'done').
export default function TravelPanel({ near, spot, origin, dest, mode, onMode, phase, motion, onClose }) {
  const { t } = useI18n();
  if (!near.active) {
    const problem = ERRORS[near.status];
    return (
      <div className={`${SLOT} flex flex-col items-end gap-2`}>
        <button type="button" onClick={near.enable} disabled={near.status === 'locating'}
          className="flex items-center gap-2 border-l-4 border-orange bg-night px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-lg transition-colors hover:bg-orange hover:text-black disabled:opacity-70">
          <span aria-hidden="true" className="travel-chip-dot" />
          {near.status === 'locating' ? t('travel.locating') : t('travel.locate')}
        </button>
        {problem && <p role="alert" className="bg-night px-3 py-2 text-xs text-white">{t(problem)}</p>}
      </div>
    );
  }
  if (!spot || !dest) {
    return (
      <div className={`${SLOT} flex justify-end`}>
        <p className="travel-card border-l-4 border-orange bg-night px-3 py-2.5 text-xs text-white shadow-lg">{t('travel.pick')}</p>
      </div>
    );
  }
  return <TravelCard key={spot._id ?? spot.slug} spot={spot} origin={origin} dest={dest} mode={mode} onMode={onMode} phase={phase} motion={motion} onClose={onClose} />;
}
