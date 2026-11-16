import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CalmTitle from '../CalmTitle';
import Contours from '../Contours';
import { useI18n } from '../../i18n/I18nContext';
import { listSpots } from '../../services/spotService';
import townMap from '../../data/townMap.json';
import { PICKS, SL_ORDER } from '../../utils/townMap';

const TOWNS = Object.fromEntries(townMap.towns.features.map((f) => [f.properties.id, f.properties]));
const spotCache = new Map(); // town name -> { total, names }, so a second click on the same town is instant

// How many spots the town has and its three most viewed, from the live API. Fails quietly: the card still shows the written picks.
function useTownSpots(name, enabled) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!enabled || !name) { setInfo(null); return undefined; }
    if (spotCache.has(name)) { setInfo(spotCache.get(name)); return undefined; }
    setInfo(null);
    const ctrl = new AbortController();
    listSpots({ municipality: name, limit: 3, sort: 'popularity' }, ctrl.signal)
      .then((r) => {
        const v = { total: r.pagination?.total ?? r.data.length, names: r.data.map((s) => s.name) };
        spotCache.set(name, v);
        if (!ctrl.signal.aborted) setInfo(v);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [name, enabled]);
  return info;
}

// The box that opens when a town is picked. The "See spots" button lives here, right on the map.
function TownCard({ town, onClose, spotsIn, Arrow, overlay }) {
  const { t } = useI18n();
  const sl = town.sl;
  const live = useTownSpots(town.name, sl);
  const picks = live?.names?.length ? live.names.join(' · ') : PICKS[town.id];
  return (
    <aside
      aria-live="polite"
      aria-label={town.name}
      className={`tm-card ${overlay ? 'tm-card--overlay' : ''} surface-dark relative border border-white/15 bg-night/85 p-5 text-white backdrop-blur-md sm:p-6`}
    >
      <button type="button" onClick={onClose} aria-label={t('hp.map.close')} className="absolute right-3 top-3 grid h-8 w-8 place-items-center text-white/70 hover:text-orange">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">{t(sl ? 'hp.map.kickerSl' : 'hp.map.kickerNb')}</p>
      <h3 className="mt-2 pr-8 font-display text-4xl leading-none sm:text-5xl">{town.name}</h3>
      {sl ? (
        <>
          <p className="mt-3 font-semibold">{t(`hp.towns.${town.id}`)}</p>
          {live && <p className="mt-1 text-sm text-white/60">{live.total > 0 ? t('hp.map.spots', { n: live.total }) : t('hp.map.noSpots')}</p>}
          {picks && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{t('hp.map.picks')}</p>
              <p className="mt-1 text-sm text-white/80">{picks}</p>
            </div>
          )}
          <Link to={spotsIn(town.name)} className="btn btn-primary mt-5 inline-flex items-center gap-2">{t('hp.towns.see')} <Arrow /></Link>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/70">{t('hp.map.nbNote')}</p>
      )}
    </aside>
  );
}

// "Explore by town": a tilted satellite map of Southern Leyte (real terrain, real photos) with the town borders on it, and the Leyte towns around it. Pick a town on the map (or in the list under it)
// and its box opens with the "See spots" button. The map loads when the section nears the screen. Where WebGL (or IntersectionObserver)
// is missing, the list and the box still work on their own.
export default function TownsExplorer({ spotsIn, Arrow }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('idle'); // idle -> loading -> map | list
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [Map3D, setMap3D] = useState(null);
  const stage = useRef(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setMode('list'); return undefined; }
    let gone = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setMode('loading');
      import('./TownMap3D').then((m) => { if (!gone) { setMap3D(() => m.default); setMode('map'); } }).catch(() => { if (!gone) setMode('list'); });
    }, { rootMargin: '400px 0px' });
    if (stage.current) io.observe(stage.current);
    return () => { gone = true; io.disconnect(); };
  }, []);

  const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const coop = useMemo(() => ({
    'CooperativeGesturesHandler.WindowsHelpText': t('hp.map.coopWin'),
    'CooperativeGesturesHandler.MacHelpText': t('hp.map.coopMac'),
    'CooperativeGesturesHandler.MobileHelpText': t('hp.map.coopTouch'),
  }), [t]);

  const town = selected ? TOWNS[selected] : null;
  const showMap = mode !== 'list';
  const reset = () => { if (selected) setSelected(null); else setResetKey((k) => k + 1); };
  const pick = (id) => setSelected((cur) => (cur === id ? null : id));
  const neighbours = Object.values(TOWNS).filter((x) => !x.sl);

  return (
    <section aria-labelledby="towns-title" className="surface-dark border-t border-white/15 bg-night text-white">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-20 sm:px-6">
        <CalmTitle as="h2" id="towns-title" className="text-4xl sm:text-5xl" text={t('hp.towns.title')} />
        <p className="mt-3 max-w-xl text-white/70">{t('hp.towns.lead')}</p>
      </div>

      {showMap && (
        <div ref={stage} role="group" aria-label={t('hp.map.label')} className="tm-stage relative mx-auto h-[clamp(560px,82vh,860px)] max-w-[1600px] overflow-hidden border-y border-white/15" style={{ '--contour': '#9a4210' }}>
          <Contours seed="sogod-bay" width={1200} height={800} levels={14} cell={26} terrain className="absolute inset-0 h-full w-full opacity-40" />
          {Map3D && (
            <Map3D
              selectedId={selected}
              onSelect={setSelected}
              onReady={() => setReady(true)}
              onFail={() => setMode('list')}
              resetKey={resetKey}
              reduceMotion={reduceMotion}
              coop={coop}
            />
          )}
          {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-white/60" role="status">{t('hp.map.loading')}</p>}

          {ready && (
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-x-4 gap-y-2 sm:left-6 sm:top-5">
              <button type="button" onClick={reset} className="btn btn-sm pointer-events-auto border border-white/30 bg-night/60 text-white backdrop-blur hover:bg-white hover:text-black">{t('hp.map.reset')}</button>
              <p className="hidden text-xs text-white/60 sm:block">{t('hp.map.hint')}</p>
              <p className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap text-[0.65rem] uppercase tracking-[0.12em] text-white/60 sm:text-[0.7rem]">
                <span className="flex items-center gap-2"><i aria-hidden="true" className="inline-block h-2.5 w-2.5 border-2 border-white" />{t('hp.map.legendSl')}</span>
                <span className="flex items-center gap-2"><i aria-hidden="true" className="inline-block h-2.5 w-2.5 border border-dashed border-white/60" />{t('hp.map.legendNb')}</span>
              </p>
            </div>
          )}
          {town && ready && (
            <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-6 sm:bottom-6 lg:right-auto lg:w-[24rem]">
              <TownCard key={town.id} town={town} onClose={() => setSelected(null)} spotsIn={spotsIn} Arrow={Arrow} overlay />
            </div>
          )}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <ul aria-label={t('hp.map.chips')} className="flex flex-wrap gap-2">
          {SL_ORDER.map((id) => (
            <li key={id}>
              <button
                type="button"
                aria-pressed={selected === id}
                onClick={() => pick(id)}
                className={`tm-chip border px-3.5 py-2 text-sm font-semibold transition-colors ${selected === id ? 'border-orange bg-orange text-black' : 'border-white/25 text-white hover:border-white hover:bg-white hover:text-black'}`}
              >
                {TOWNS[id].name}
              </button>
            </li>
          ))}
        </ul>
        <ul aria-label={t('hp.map.legendNb')} className="mt-3 flex flex-wrap gap-2">
          {neighbours.map((x) => (
            <li key={x.id}>
              <button type="button" aria-pressed={selected === x.id} onClick={() => pick(x.id)} className={`tm-chip border px-3 py-1.5 text-xs font-semibold transition-colors ${selected === x.id ? 'border-white bg-white text-black' : 'border-white/15 text-white/60 hover:border-white/60 hover:text-white'}`}>
                {x.name}
              </button>
            </li>
          ))}
        </ul>
        {/* Without the map (no WebGL), the box opens right under the list instead. */}
        {!showMap && town && <div className="mt-6 max-w-md"><TownCard key={town.id} town={town} onClose={() => setSelected(null)} spotsIn={spotsIn} Arrow={Arrow} /></div>}
      </div>
    </section>
  );
}
