import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SpotImage from '../SpotImage';
import { SaveTrip } from './Actions';
import { useI18n } from '../../i18n/I18nContext';

const peso = (n) => `₱${Math.round(n).toLocaleString('en-US')}`;
const fmtDate = (iso, long) => {
  try { return new Intl.DateTimeFormat('en-PH', long ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso)); } catch { return iso; }
};

// A number that eases up to its value (and again when the value changes). Reduced motion: it just shows the value.
function useCount(end) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(end); from.current = end; return undefined; }
    const a = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 800);
      const v = Math.round(a + (end - a) * (1 - (1 - p) ** 3));
      setN(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  return n;
}

// Many places share one point (a town centre is used when the exact spot is not known), so pins that land within 16 px of each
// other are fanned out on a small ring around their shared point, and every number stays visible.
function spread(xy) {
  const group = xy.map(() => -1);
  const groups = [];
  xy.forEach(([x, y], i) => {
    const g = groups.findIndex((m) => Math.hypot(m.x - x, m.y - y) < 16);
    if (g < 0) { group[i] = groups.length; groups.push({ x, y, ids: [i] }); } else { group[i] = g; groups[g].ids.push(i); }
  });
  return xy.map(([x, y], i) => {
    const g = groups[group[i]];
    if (g.ids.length < 2) return [x, y];
    const a = -Math.PI / 2 + (g.ids.indexOf(i) * 2 * Math.PI) / g.ids.length;
    return [g.x + 20 * Math.cos(a), g.y + 20 * Math.sin(a)];
  });
}

const W = 520;
const H = 290;
const PAD = 40;

// A small drawn map of one day: the route grows from stop to stop, numbered pins pop in, and the rest of the trip sits behind as faint dots.
// Fitted to the day's own stops (never closer than ~6 km across) so a day in one town does not zoom into nothing.
function MiniMap({ stops, others = [], route = true, label }) {
  const pts = stops.filter((s) => s.lat != null && s.lng != null);
  if (!pts.length) return null;
  const lngs = pts.map((p) => p.lng);
  const lats = pts.map((p) => p.lat);
  const cx = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((cy * Math.PI) / 180);
  const spanX = Math.max(Math.max(...lngs) - Math.min(...lngs), 0.06) * kx;
  const spanY = Math.max(Math.max(...lats) - Math.min(...lats), 0.04);
  const k = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const at = (p) => [W / 2 + (p.lng - cx) * kx * k, H / 2 + (cy - p.lat) * k];
  const xy = spread(pts.map(at));
  let d = `M${xy[0][0].toFixed(1)} ${xy[0][1].toFixed(1)}`;
  for (let i = 1; i < xy.length; i += 1) {
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    const bend = (i % 2 ? 1 : -1) * 0.14;
    d += ` Q${((x0 + x1) / 2 - (y1 - y0) * bend).toFixed(1)} ${((y0 + y1) / 2 + (x1 - x0) * bend).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const faint = others.filter((p) => p.lat != null).map(at).filter(([x, y]) => x > 6 && x < W - 6 && y > 6 && y < H - 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ask-map" role="img" aria-label={label}>
      {faint.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" className="ask-map-dot" />)}
      {route && xy.length > 1 && (<>
        <path d={d} className="ask-map-line base" />
        <path d={d} pathLength="1" className="ask-map-line run" />
      </>)}
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${xy[i][0].toFixed(1)} ${xy[i][1].toFixed(1)})`} aria-hidden="true">
          <g className={`ask-map-pin${p.food ? ' food' : ''}`} style={{ '--d': `${0.25 + i * 0.18}s` }}>
            <circle r="13" />
            <text y="4.5" textAnchor="middle">{p.n}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

function Stop({ it, p, i }) {
  const { t } = useI18n();
  return (
    <li className="ask-stop" style={{ '--d': `${0.15 + i * 0.1}s` }}>
      <span className="ask-pin" aria-hidden="true" data-food={it.kind === 'food' ? '1' : ''}>{it.visitOrder}</span>
      {p && <span className="ask-stop-photo"><SpotImage src={p.image} slug={p.slug} alt="" className="h-full w-full" /></span>}
      <span className="min-w-0 flex-1">
        {p ? <Link className="ask-stop-name" to={`/spots/${p.slug}`}>{p.name}</Link> : <span className="text-white/80">{t('ask.stop')}</span>}
        <span className="ask-stop-meta">
          {p?.municipality && <span>{p.municipality}</span>}
          {it.slot && <span className="ask-slot" data-slot={it.slot}>{t(`ask.slot.${it.slot}`)}</span>}
          {it.cost > 0 && <span>{peso(it.cost)}</span>}
        </span>
        {it.notes && <span className="mt-0.5 block text-sm text-white/60">{it.notes}</span>}
      </span>
    </li>
  );
}

function Tips({ tips }) {
  const { t } = useI18n();
  const groups = [['ask.tipBest', tips?.bestTime], ['ask.tipBring', tips?.bring], ['ask.tipSafe', tips?.safety]].filter(([, l]) => l?.length);
  if (!groups.length) return null;
  return (
    <details className="ask-tips">
      <summary>{t('ask.tips')}</summary>
      <div className="space-y-3 pt-3">
        {groups.map(([k, list]) => (
          <div key={k}><p className="ask-label">{t(k)}</p><p className="mt-1 text-sm leading-relaxed text-white/70">{list.join(' · ')}</p></div>
        ))}
      </div>
    </details>
  );
}

// The right-hand side of the page ("the board"): for a trip, week jumps, a day strip, the day's drawn route and stops, the running
// total and tips; for plain recommendations, a map of where the places are. `m` is one reply from the server.
export default function Board({ m }) {
  const { t } = useI18n();
  const days = m.days || [];
  const plan = m.plan;
  const [di, setDi] = useState(0);
  const strip = useRef(null);
  const total = useCount(plan?.totalBudget || 0);
  const byId = useMemo(() => {
    const map = new Map();
    (m.recs || []).forEach((r) => r.spot && map.set(String(r.spotId), r.spot));
    (m.places || []).forEach((p) => map.set(String(p.id), p));
    return map;
  }, [m.recs, m.places]);

  // keep the chosen day in view in a long strip (scrolls the strip only, never the page)
  useEffect(() => {
    const el = strip.current;
    const b = el?.querySelector('[aria-pressed="true"]');
    if (el && b) el.scrollTo?.({ left: b.offsetLeft - el.clientWidth / 2 + b.clientWidth / 2, behavior: 'smooth' });
  }, [di]);

  if (!days.length) {
    const stops = (m.recs || []).map((r, i) => ({ ...(r.spot || {}), n: i + 1 })).filter((s) => s.lat != null);
    return (
      <div className="ask-board-card">
        <p className="ask-label">{t('ask.mapPlaces')}</p>
        <MiniMap stops={stops} route={false} label={t('ask.mapPlaces')} />
      </div>
    );
  }

  const day = days[Math.min(di, days.length - 1)];
  const rows = day.items.map((it) => ({ it, p: byId.get(String(it.touristSpotId)) }));
  const mapStops = rows.filter((r) => r.p).map(({ it, p }) => ({ ...p, n: it.visitOrder, food: it.kind === 'food' }));
  const others = days.flatMap((d, i) => (i === di ? [] : d.items.map((it) => byId.get(String(it.touristSpotId))).filter(Boolean)));
  const stopCount = days.reduce((n, d) => n + d.items.length, 0);
  const weeks = Math.ceil(days.length / 7);

  return (
    <div className="ask-board-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="ask-label">{t('ask.board')}</p>
          <p className="mt-2 text-sm text-white/70">
            {plan ? t('ask.summary', { d: days.length, n: stopCount, pace: t(`ask.pace.${plan.pace}`) }) : t('ask.planReady', { d: days.length, n: stopCount })}
          </p>
          {plan?.startDate && <p className="text-sm text-[#ff6a13]">{fmtDate(plan.startDate, true)}{plan.endDate && plan.endDate !== plan.startDate ? ` – ${fmtDate(plan.endDate, true)}` : ''}</p>}
        </div>
        {plan?.totalBudget > 0 && (
          <div className="shrink-0 text-right" title={t('ask.totalNote')}>
            <p className="font-display text-3xl leading-none tabular-nums text-[#ffffff]">{peso(total)}</p>
            <p className="mt-1 text-xs text-white/50">{t('ask.total')}</p>
          </div>
        )}
      </div>
      {plan?.shortfall && <p className="ask-note mt-3"><span aria-hidden="true" />{t('ask.short', { n: plan.plannedDays, m: plan.requestedDays })}</p>}

      {weeks > 1 && (
        <div className="ask-weeks" role="group" aria-label={t('ask.dayCount')}>
          {Array.from({ length: weeks }, (_, w) => (
            <button key={w} type="button" aria-pressed={Math.floor(di / 7) === w} onClick={() => setDi(w * 7)} className="ask-chip">{t('ask.week', { n: w + 1 })}</button>
          ))}
        </div>
      )}
      <div className="ask-strip-wrap">
        <button type="button" className="ask-step" aria-label={t('ask.prevDay')} disabled={di === 0} onClick={() => setDi(di - 1)}>‹</button>
        <div className="ask-strip" ref={strip} role="group" aria-label={t('ask.dayCount')}>
          {days.map((d, i) => (
            <button key={d.dayNumber} type="button" className="ask-daytab" aria-pressed={i === di} aria-label={`${t('trips.day', { n: d.dayNumber })}${d.date ? `, ${fmtDate(d.date, true)}` : ''}`} onClick={() => setDi(i)}>
              <b>{d.dayNumber}</b>{d.date && <i>{fmtDate(d.date)}</i>}
            </button>
          ))}
        </div>
        <button type="button" className="ask-step" aria-label={t('ask.nextDay')} disabled={di >= days.length - 1} onClick={() => setDi(di + 1)}>›</button>
      </div>

      <ol className="mt-4">
        <li key={day.dayNumber} className="ask-bday">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="font-display text-2xl text-[#ffffff]">{t('trips.day', { n: day.dayNumber })}</p>
            {day.title && <p className="text-sm text-[#ff6a13]">{day.title}</p>}
          </div>
          <MiniMap key={di} stops={mapStops} others={others} label={t('ask.mapLabel', { n: day.dayNumber })} />
          {!rows.length && <p className="ask-note mt-3"><span aria-hidden="true" />{t('ask.rest')}</p>}
          <ul className="space-y-2.5">{rows.map(({ it, p }, i) => <Stop key={it.touristSpotId + it.visitOrder} it={it} p={p} i={i} />)}</ul>
          {day.budget > 0 && <p className="mt-3 text-right text-sm text-white/55">{t('ask.dayCost', { n: Math.round(day.budget).toLocaleString('en-US') })}</p>}
        </li>
      </ol>
      <Tips tips={m.tips} />
      <div className="mt-4"><SaveTrip question={m.question} days={days} /></div>
    </div>
  );
}
