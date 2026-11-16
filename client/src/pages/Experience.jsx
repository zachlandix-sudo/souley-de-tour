import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpots } from '../hooks/useSpots';
import { useAllSpots } from '../hooks/useAllSpots';
import { useSoundscape } from '../hooks/useSoundscape';
import { useTripCanvas } from '../hooks/useTripCanvas';
import { toLatLng } from '../utils/geo';
import { directionsUrl, typeLabel, visitorBlurb } from '../utils/food';
import { filterStops, isFood, townsOf } from '../utils/journey';
import SpotImage from '../components/SpotImage';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import PanoViewer from '../components/experience/PanoViewer';
import DayNightSlider from '../components/experience/DayNightSlider';
import ExperienceMap from '../components/experience/ExperienceMap';
import LiveStatus from '../components/experience/LiveStatus';
import SoundscapePlayer from '../components/experience/SoundscapePlayer';
import TripCanvas from '../components/experience/TripCanvas';
import HorizonHero from '../components/experience/HorizonHero';
import CoastDiorama from '../components/experience/CoastDiorama';
import FunFacts from '../components/experience/FunFacts';
import JourneyFilters from '../components/experience/JourneyFilters';
import { useI18n } from '../i18n/I18nContext';

const QUERY = { limit: 5, sort: 'popularity' }; // the first five load fast so the page paints at once
const ALL = { sort: 'popularity' }; // then every place and food stop loads behind them
const PAGE = 6; // stops drawn at first, and added by each "Show more"
const CENTER = [10.35, 125.0];
const LEVEL = { easy: 1, moderate: 2, hard: 3 };
const pad = (n) => String(n).padStart(2, '0');
// 10.3472, 125.0 -> 10°20′N 125°00′E (a chart-style caption, from the spot's own coordinates)
const dms = (v, pos, neg) => { const a = Math.abs(v); const d = Math.floor(a); return `${d}°${pad(Math.floor((a - d) * 60))}′${v >= 0 ? pos : neg}`; };
const coords = (s) => { const p = toLatLng(s); return p ? `${dms(p[0], 'N', 'S')} ${dms(p[1], 'E', 'W')}` : ''; };

export default function Experience() {
  const { t } = useI18n();
  const { spots, loading, error, retry } = useSpots(QUERY);
  const sound = useSoundscape();
  const trip = useTripCanvas();
  const [dark, setDark] = useState(true); // opens dark (the site is dark-dominant); the switch still offers light
  const [activeId, setActiveId] = useState(null);
  const [startTime, setStartTime] = useState('08:00');
  const refs = useRef({});
  const col = useRef(null);
  const rail = useRef(null);
  const everything = useAllSpots(ALL);
  const [kind, setKind] = useState('all'); // 'all' | 'places' | 'food'
  const [town, setTown] = useState('');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(PAGE);
  const pending = useRef(null); // a stop to scroll to once it has been drawn
  // The fast top five stay first (so nothing jumps when the full list arrives); every other place and food stop follows.
  const pool = useMemo(() => {
    const first = spots.filter((s) => s && s._id);
    const seen = new Set(first.map((s) => s._id));
    return [...first, ...everything.spots.filter((s) => s && s._id && !seen.has(s._id))];
  }, [spots, everything.spots]);
  const list = useMemo(() => filterStops(pool, { kind, town, q }), [pool, kind, town, q]);
  const stops = useMemo(() => list.slice(0, shown), [list, shown]); // what is drawn on the page and on the map
  const towns = useMemo(() => townsOf(pool), [pool]);
  const counts = useMemo(() => { const f = pool.filter(isFood).length; return { all: pool.length, places: pool.length - f, food: f }; }, [pool]);
  const active = stops.find((s) => s._id === activeId) || stops[0];
  const total = list.length;

  // Whichever stop is mostly in view becomes the active one (drives map, status, difficulty).
  useEffect(() => {
    if (!stops.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (best) setActiveId(best.target.dataset.id);
    }, { threshold: [0.3, 0.6], rootMargin: '-20% 0px -20% 0px' });
    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [stops]);

  // The orange route thread fills as the reader travels down the stops (CSS variable, no re-render).
  useEffect(() => {
    const el = col.current;
    if (!el) return undefined;
    let raf = 0;
    const upd = () => { raf = 0; const r = el.getBoundingClientRect(); el.style.setProperty('--p', Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / r.height)).toFixed(4)); };
    const on = () => { if (!raf) raf = requestAnimationFrame(upd); };
    upd();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [stops.length]);

  useEffect(() => { setShown(PAGE); }, [kind, town, q]);

  const goTo = (id) => {
    setActiveId(id);
    const el = refs.current[id];
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    pending.current = id; // not drawn yet (further down the list, or hidden by a filter): the effect below finishes the job
    const at = list.findIndex((s) => s._id === id);
    if (at < 0) { setKind('all'); setTown(''); setQ(''); } else setShown((n) => Math.max(n, at + 1));
  };
  useEffect(() => {
    const id = pending.current;
    if (!id) return;
    const el = refs.current[id];
    if (el) { pending.current = null; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    const at = list.findIndex((s) => s._id === id);
    if (at >= 0) setShown((n) => Math.max(n, at + 1));
  }, [list, stops]);

  // Keep the current stop's pill in view inside the pager rail (scrolls the rail sideways only, never the page).
  useEffect(() => {
    const r = rail.current;
    const b = r && r.querySelector('[aria-current="step"]');
    if (!b || typeof r.scrollTo !== 'function') return;
    const calm = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    r.scrollTo({ left: Math.max(0, b.parentElement.offsetLeft - (r.clientWidth - b.offsetWidth) / 2), behavior: calm ? 'auto' : 'smooth' });
  }, [active?._id]);

  const activeIdx = Math.max(0, stops.findIndex((s) => s._id === active?._id));
  const activeFood = isFood(active);
  const level = activeFood ? 0 : LEVEL[active?.difficulty] || 0; // food stops have no hiking effort

  return (
    <div className={`xp ${dark ? 'xp-dark surface-dark' : ''}`}>
      <div className="xp-bar">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/spots" className="xp-link">{t('exp.destinations')}</Link>
            <a href="#canvas" className="xp-link">{t('exp.canvas')}{trip.stops.length ? ` (${trip.stops.length})` : ''}</a>
          </div>
          <div className="flex items-center gap-2">
            {sound.supported && (
              <button type="button" onClick={sound.toggle} aria-pressed={sound.playing} className="xp-switch">
                <i aria-hidden="true" />{t('exp.sound')}: {sound.playing ? t('exp.on') : t('exp.off')}
              </button>
            )}
            <button type="button" onClick={() => setDark((d) => !d)} aria-pressed={dark} className="xp-switch">
              <i aria-hidden="true" />{dark ? t('exp.light') : t('exp.dark')}
            </button>
          </div>
        </div>
      </div>

      <HorizonHero />

      {!loading && !error && spots.length > 0 && <CoastDiorama stops={spots} onJump={goTo} />}

      <section id="journey" aria-label={t('exp.journey')} className="xp-journey">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          {loading && <Loading label={t('exp.loading')} />}
          {!loading && error && <ErrorState onRetry={retry} />}
          {!loading && !error && pool.length === 0 && <EmptyState title={t('exp.empty')} />}
          {!loading && !error && pool.length > 0 && (
            <>
              <div className="xp-jhead">
                <h2 className="xp-jtitle">{t('exp.journey')}</h2>
                <p className="xp-jlead">{t('exp.allLead', { n: counts.all })}</p>
              </div>
              <JourneyFilters kind={kind} onKind={setKind} town={town} onTown={setTown} q={q} onQ={setQ} towns={towns} counts={counts} shown={stops.length} total={total} loadingAll={everything.loading} failed={!!everything.error} onRetry={everything.retry} />
              {stops.length === 0 && <p className="xp-none">{t('exp.noMatch')}</p>}
              {stops.length > 0 && (<>
              <ol ref={rail} aria-label={t('exp.progress')} className="xp-rail">
                {stops.map((s, i) => (
                  <li key={s._id}>
                    <button type="button" onClick={() => goTo(s._id)} aria-current={s._id === active?._id ? 'step' : undefined} className="xp-rail-btn">
                      <b>{pad(i + 1)}</b><span>{s.name}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="xp-layout">
                <div className="xp-stops" ref={col}>
                  {stops.map((s, i) => {
                    const saved = trip.has(s._id);
                    const food = isFood(s);
                    const kindLabel = typeLabel(s);
                    const facts = food
                      ? [kindLabel].filter(Boolean)
                      : [s.bestTimeToVisit && t('exp.bestTime', { v: s.bestTimeToVisit }), s.entranceFee && t('exp.fee', { v: s.entranceFee }), s.difficulty && t('exp.diff', { v: t(`diff.${s.difficulty}`) })].filter(Boolean);
                    return (
                      <article key={s._id} data-id={s._id} data-kind={food ? 'food' : 'place'} ref={(el) => { refs.current[s._id] = el; }} aria-labelledby={`stop-${s._id}`} className="xp-plate" data-active={s._id === active?._id} data-passed={i <= activeIdx}>
                        <div className="xp-photo">
                          {food
                            ? <SpotImage src={s.images?.[0]} fallbacks={s.images?.slice(1)} slug={s.slug} alt={s.name} className="h-64 w-full sm:h-80" />
                            : i % 2 === 0 ? <PanoViewer src={s.images?.[0]} alt={s.name} /> : <DayNightSlider src={s.images?.[0]} alt={s.name} />}
                          {food && <span className="xp-kind">{t('exp.food')}</span>}
                        </div>
                        <div className="xp-plate-body">
                          <p className="xp-num"><b>{pad(i + 1)}</b><span>{t('exp.of')} {pad(total)}</span></p>
                          <h3 id={`stop-${s._id}`} className="xp-name">{s.name}</h3>
                          <p className="xp-where">{[s.barangay, s.municipality].filter(Boolean).join(', ')}{!food && coords(s) && <em>{coords(s)}</em>}</p>
                          <p className="xp-desc">{food ? (visitorBlurb(s) || t('exp.foodBlurb', { type: kindLabel || t('exp.food'), town: s.municipality })) : (s.shortDescription || s.description)}</p>
                          {facts.length > 0 && <ul className="xp-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>}
                          <div className="xp-actions">
                            <button type="button" onClick={() => trip.toggle(s)} aria-pressed={saved} className={`btn ${saved ? 'bg-orange text-night' : 'btn-dark'}`}>
                              {saved ? t('exp.savedCanvas') : t('exp.saveCanvas')}
                            </button>
                            <Link to={food ? `/food?place=${s.slug}` : `/spots/${s.slug}`} className="btn btn-outline">{t('exp.details')}</Link>
                            {food && <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">{t('exp.directions')} <span aria-hidden="true">↗</span></a>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {shown < total && (
                    <div className="xp-more-stops">
                      <button type="button" className="btn btn-outline" onClick={() => setShown((n) => n + PAGE * 2)}>{t('exp.showMore', { n: Math.min(PAGE * 2, total - shown) })}</button>
                      <button type="button" className="xp-link" onClick={() => setShown(total)}>{t('exp.showAll', { n: total })}</button>
                    </div>
                  )}
                </div>

                <aside aria-label={t('exp.aside')} className="xp-console">
                  <div className="xp-now" key={active?._id}>
                    <p className="xp-now-n" aria-hidden="true">{pad(activeIdx + 1)}<small>/{pad(total)}</small></p>
                    <div>
                      <p className="xp-now-name">{active?.name}</p>
                      <p className="xp-now-coord">{active && (activeFood ? (active.address || active.municipality) : coords(active))}</p>
                    </div>
                  </div>
                  <ExperienceMap stops={stops} activeId={active?._id} onSelect={goTo} dark />
                  <details className="xp-more">
                    <summary>{t('exp.more')}</summary>
                    <LiveStatus position={toLatLng(active) || CENTER} name={active?.name || t('exp.region')} card="xp-cell" />
                    {level > 0 && (
                      <section aria-label="Difficulty" className="xp-cell">
                        <h3 className="xp-cell-title">{t('exp.effort')}</h3>
                        <div className="xp-effort" role="img" aria-label={t('exp.diff', { v: t(`diff.${active.difficulty}`) })}>
                          {[1, 2, 3].map((n) => <span key={n} data-on={n <= level} />)}
                          <b>{t(`diff.${active.difficulty}`)}</b>
                        </div>
                      </section>
                    )}
                    <SoundscapePlayer sound={sound} card="xp-cell" />
                  </details>
                </aside>
              </div>
              </>)}
            </>
          )}
        </div>
      </section>

      <FunFacts />

      <TripCanvas trip={trip} startTime={startTime} onStartTime={setStartTime} card="xp-slab" />
    </div>
  );
}
