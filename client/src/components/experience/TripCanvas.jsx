import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Timeline from './Timeline';
import SpotImage from '../SpotImage';
import { buildTimeline, fmtDuration, totalMinutes } from '../../utils/timeline';
import { exportTripGuide } from '../../utils/tripExport';
import { useI18n } from '../../i18n/I18nContext';

export default function TripCanvas({ trip, startTime, onStartTime, card }) {
  const { t } = useI18n();
  const dragFrom = useRef(null);
  const [notice, setNotice] = useState('');
  const items = useMemo(() => buildTimeline(trip.stops, startTime), [trip.stops, startTime]);

  const onExport = () => setNotice(exportTripGuide(items) ? '' : t('canvas.popup'));

  return (
    <section id="canvas" aria-labelledby="canvas-title" className="xp-canvas surface-dark">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <h2 id="canvas-title" className="text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.03]">{t('canvas.title')}</h2>
      <p className="mt-4 max-w-xl text-white/75">{t('canvas.lead')}</p>

      {trip.stops.length === 0 ? (
        <p className={`mt-10 border border-dashed p-10 text-center ${card}`}>{t('canvas.empty')}</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.stops.map((s, i) => (
              <li key={s.id} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragFrom.current !== null) trip.move(dragFrom.current, i); dragFrom.current = null; }}
                className={`xp-slab cursor-grab overflow-hidden ${card}`}>
                <SpotImage src={s.image} slug={s.slug} alt={s.name} className="h-28 w-full" />
                <div className="p-3">
                  <p className="font-semibold"><span className="xp-chip-n">{String(i + 1).padStart(2, '0')}</span> {s.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <button type="button" disabled={i === 0} onClick={() => trip.move(i, i - 1)} aria-label={t('canvas.earlier', { name: s.name })} className="xp-mini">←</button>
                    <button type="button" disabled={i === trip.stops.length - 1} onClick={() => trip.move(i, i + 1)} aria-label={t('canvas.later', { name: s.name })} className="xp-mini">→</button>
                    {s.slug && <Link to={`/spots/${s.slug}`} className="xp-mini">{t('canvas.details')}</Link>}
                    <button type="button" onClick={() => trip.remove(s.id)} className="xp-mini xp-mini-danger">{t('common.remove')}</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="text-3xl">{t('canvas.timeline')}</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label>{t('canvas.start')} <input type="time" value={startTime} onChange={(e) => onStartTime(e.target.value || '08:00')} className="field ml-1 w-auto px-2 py-1" /></label>
                <span>{t('canvas.total')} <strong>{fmtDuration(totalMinutes(items))}</strong></span>
              </div>
            </div>
            <div className="mt-6"><Timeline items={items} onMinutes={trip.setMinutes} card={card} /></div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onExport} className="btn btn-primary">{t('canvas.export')}</button>
            <button type="button" onClick={trip.clear} className="btn btn-outline">{t('canvas.clear')}</button>
            {notice && <span role="alert" className="text-sm text-danger">{notice}</span>}
          </div>
          <p className="mt-2 text-xs opacity-70">{t('canvas.printHint')}</p>
        </>
      )}
      </div>
    </section>
  );
}
