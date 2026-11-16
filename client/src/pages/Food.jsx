import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSpot } from '../services/spotService';
import { isCanceled } from '../services/api';
import SpotRow from '../components/SpotRow';
import ExploreMap from '../components/ExploreMap';
import FoodCard from '../components/food/FoodCard';
import FoodQuickView from '../components/food/FoodQuickView';
import FoodMarquee from '../components/FoodMarquee';
import FoodFilters from '../components/food/FoodFilters';
import FoodLogStrip from '../components/food/FoodLogStrip';
import FoodRoulette from '../components/food/FoodRoulette';
import FoodTripTray from '../components/food/FoodTripTray';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import PageHero from '../components/PageHero';
import { useDebounce } from '../hooks/useDebounce';
import NearMeButton from '../components/NearMeButton';
import { useNearMe } from '../hooks/useNearMe';
import { useAllSpots } from '../hooks/useAllSpots';
import { useFavoriteIds } from '../hooks/useFavoriteIds';
import { sortByDistance } from '../utils/geo';
import { TRIED } from '../components/food/FoodFun';
import { useLocalList } from '../hooks/useLocalList';
import { manilaMinutes } from '../utils/fun';
import { DEFAULT_FILTERS, TRIP_MAX, activeCount, filterFoods, mealForMinutes, pickFeatured, readFilters, sortFoods, triedKey, typeCounts, withPlace, writeFilters } from '../utils/food';
import { useI18n } from '../i18n/I18nContext';

// 24 divides evenly into 2, 3, 4 and 6 columns, so the grid fills its last row on most screens.
const PAGE_SIZE = 24;

const FOOD_QUERY = { category: 'food' }; // every food place is loaded once; searching, filtering and sorting then happen instantly in the browser
const TRIP_KEY = 'souley:food-trip';

export default function Food() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]); // the filters live in the address (?type=cafe&town=Sogod...), so a view can be shared
  const [search, setSearch] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('ribbon'); // 'ribbon' = the scrolling food-card ribbon, 'grid' = the magazine grid, 'map' = list beside the map
  const [activeId, setActiveId] = useState(null);
  const [linked, setLinked] = useState(null); // a place opened from a shared link that is not in the food list
  const [spin, setSpin] = useState(0); // 0 = the plate spinner is closed; every spin press gives it a new key so it rolls again
  const searchBox = useRef(null);
  const q = useDebounce(search, 300);
  const nearMe = useNearMe();
  const fav = useFavoriteIds();
  const log = useLocalList(TRIED); // "I ate here" stamps (this device only)
  const trip = useLocalList(TRIP_KEY, { max: TRIP_MAX }); // the food trip (this device only)
  const { t } = useI18n();
  const all = useAllSpots(FOOD_QUERY);

  const setFilters = useCallback((patch) => setParams(writeFilters(params, { ...filters, ...patch }), { replace: true }), [params, filters, setParams]);
  const clear = () => { setSearch(''); setParams(writeFilters(params, { ...DEFAULT_FILTERS, sort: filters.sort }), { replace: true }); };
  // typing -> address (after a short pause); address -> typing (Back, a pasted link)
  useEffect(() => { if (q.trim() !== filters.q) setFilters({ q: q.trim() }); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (filters.q !== q.trim()) setSearch(filters.q); }, [filters.q]); // eslint-disable-line react-hooks/exhaustive-deps
  // "/" jumps to the search box, like most sites
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable], [role=dialog]')) return;
      e.preventDefault();
      searchBox.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ----- the list: distance (Near me), filters, sort
  const base = useMemo(() => (nearMe.active ? sortByDistance(all.spots, nearMe.origin) : all.spots), [all.spots, nearMe.active, nearMe.origin]);
  const eff = useMemo(() => ({ ...filters, saved: filters.saved && !!fav.user }), [filters, fav.user]); // "Saved only" means nothing when signed out
  const ctx = useMemo(() => ({ isSaved: fav.saved, tried: new Set(log.list) }), [fav.saved, log.list]);
  const sort = filters.sort === 'near' && !nearMe.active ? 'top' : (filters.sort || (nearMe.active ? 'near' : 'top'));
  // chip counts answer "what would I get if I picked this?", so each facet ignores its own filter
  const byTypeFree = useMemo(() => filterFoods(base, { ...eff, types: [] }, ctx), [base, eff, ctx]);
  const counts = useMemo(() => typeCounts(byTypeFree), [byTypeFree]);
  const townCounts = useMemo(() => filterFoods(base, { ...eff, town: '' }, ctx).reduce((o, s) => ({ ...o, [s.municipality]: (o[s.municipality] || 0) + 1 }), {}), [base, eff, ctx]);
  const towns = useMemo(() => Object.keys(townCounts).sort((a, b) => townCounts[b] - townCounts[a] || a.localeCompare(b)), [townCounts]);
  const townList = useMemo(() => (filters.town && !towns.includes(filters.town) ? [filters.town, ...towns] : towns), [towns, filters.town]);
  const matched = useMemo(() => filterFoods(base, eff, ctx), [base, eff, ctx]);
  const sorted = useMemo(() => sortFoods(matched, sort), [matched, sort]);
  const hasRated = useMemo(() => all.spots.some((s) => s.reviewCount > 0), [all.spots]);
  const filterKey = `${writeFilters(new URLSearchParams(), eff).toString()}|${sort}|${nearMe.active}`;
  useEffect(() => { setPage(1); }, [filterKey]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const view = { loading: all.loading, error: !!all.error, data: sorted.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE), pages, total: sorted.length };
  const retry = all.retry;

  const ready = !view.error && !view.loading && view.data.length > 0;
  // Featured cell: the best-rated place on the first page of an unfiltered, top-rated view.
  const featured = ready && cur === 1 && activeCount(eff) === 0 && !nearMe.active && sort === 'top' ? pickFeatured(view.data) : null;
  const rest = featured ? view.data.filter((s) => s._id !== featured._id) : view.data;
  const ordered = featured ? [featured, ...rest] : rest; // the order the grid shows them, which is also the quick-view stepping order

  // ----- the food log line and the food trip
  const knownKeys = useMemo(() => new Set(base.map(triedKey)), [base]);
  const triedCount = all.loading ? log.list.length : log.list.filter((k) => knownKeys.has(k)).length;
  const bySlug = useMemo(() => new Map(base.map((s) => [s.slug, s])), [base]);
  const tripPlaces = trip.list.map((slug) => bySlug.get(slug)).filter(Boolean);
  const moveStop = (slug, d) => {
    const next = [...trip.list];
    const i = next.indexOf(slug);
    const j = i + d;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    trip.set(next);
  };
  const minutesNow = useMemo(() => manilaMinutes(), []);
  const mealNow = useMemo(() => mealForMinutes(minutesNow), [minutesNow]);

  // ----- quick view (the open place lives in the address as ?place=<slug>, so it can be shared and Back closes it)
  const placeSlug = params.get('place');
  const inPage = placeSlug ? ordered.find((s) => s.slug === placeSlug) : null;
  const elsewhere = placeSlug && !inPage ? (sorted.find((s) => s.slug === placeSlug) || base.find((s) => s.slug === placeSlug)) : null; // on another page, or hidden by a filter
  const open = inPage || elsewhere || (linked && linked.slug === placeSlug ? linked : null);
  const openIndex = inPage ? ordered.indexOf(inPage) : -1;
  const pageOf = (spot) => { const i = sorted.findIndex((s) => s._id === spot._id); return i < 0 ? 0 : Math.floor(i / PAGE_SIZE) + 1; };

  // a shared link or a roulette pick can point at a later page: go to the page that holds it, so Next/Previous work from there
  useEffect(() => {
    if (!elsewhere) return;
    const pg = pageOf(elsewhere);
    if (pg && pg !== page) setPage(pg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elsewhere]);

  useEffect(() => {
    if (!placeSlug || inPage || elsewhere || all.loading || (linked && linked.slug === placeSlug)) return undefined;
    const ctrl = new AbortController();
    getSpot(placeSlug, ctrl.signal).then(setLinked).catch((e) => { if (!isCanceled(e)) setParams(withPlace(params, null), { replace: true }); });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeSlug, inPage, elsewhere, all.loading]);

  const openPlace = useCallback((spot) => setParams(withPlace(params, spot.slug)), [params, setParams]);
  const closePlace = useCallback(() => setParams(withPlace(params, null), { replace: true }), [params, setParams]);
  const step = useCallback((d) => {
    if (openIndex < 0 || ordered.length < 2) return;
    const next = ordered[(openIndex + d + ordered.length) % ordered.length];
    setParams(withPlace(params, next.slug), { replace: true });
  }, [openIndex, ordered, params, setParams]);
  const pick = useCallback((spot) => setParams(withPlace(params, spot.slug), { replace: true }), [params, setParams]);
  const related = open ? base.filter((s) => s._id !== open._id && s.municipality === open.municipality).slice(0, 4) : [];
  const showOnMap = useCallback((spot) => {
    setParams(withPlace(params, null), { replace: true });
    setTab('map');
    const pg = pageOf(spot);
    if (pg) setPage(pg);
    setActiveId(spot._id);
    setTimeout(() => document.getElementById(`food-row-${spot._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, setParams, sorted]);
  const scrollToRow = (id) => document.getElementById(`food-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const pager = view.pages > 1 && (
    <div className="mt-10 flex items-center justify-center gap-5">
      <button type="button" className="btn btn-outline btn-sm" disabled={cur <= 1} onClick={() => { setPage(cur - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('common.prev')}</button>
      <span className="text-sm text-muted">{t('common.page', { p: cur, n: view.pages })}</span>
      <button type="button" className="btn btn-outline btn-sm" disabled={cur >= view.pages} onClick={() => { setPage(cur + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('common.next')}</button>
    </div>
  );

  const body = view.error ? <ErrorState onRetry={retry} />
    : view.loading ? <Loading label="Loading food places" />
    : view.data.length === 0 ? <EmptyState title={activeCount(eff) ? 'No food places match these filters.' : 'No food places found.'} actionLabel="Clear filters" onAction={clear} />
    : null;

  return (
    <div>
      <PageHero wide title={t('food.title')} subtitle={t('food.subtitle')} seed="food-hero" warm countText={ready ? t('food.count', { n: view.total }) : undefined} />
      <section className={`food-wrap mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-10 ${tripPlaces.length ? 'pb-32' : 'pb-16'}`}>
        <div className="gal-toolbar food-toolbar relative z-10 -mt-10 space-y-3 border border-line bg-white p-4 sm:-mt-12 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={searchBox} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('food.search')} aria-label={t('food.search')} aria-keyshortcuts="/" className="field min-w-[14rem] flex-1" />
            <select value={filters.town} onChange={(e) => setFilters({ town: e.target.value })} aria-label="Municipality" className="field w-auto md:hidden">
              <option value="">{t('food.all')}</option>
              {townList.map((tw) => <option key={tw} value={tw}>{tw} ({townCounts[tw] || 0})</option>)}
            </select>
            <NearMeButton nearMe={nearMe} />
            <div className="food-tabs" role="group" aria-label="Switch view">
              {[['ribbon', 'Ribbon'], ['grid', 'Grid'], ['map', 'Map']].map(([v, label]) => (
                <button key={v} type="button" aria-pressed={tab === v} onClick={() => setTab(v)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="food-rail hidden md:flex" role="group" aria-label="Municipality">
            <button type="button" aria-pressed={!filters.town} onClick={() => setFilters({ town: '' })} className="food-chip">{t('food.all')}</button>
            {townList.map((tw) => (
              <button key={tw} type="button" aria-pressed={filters.town === tw} onClick={() => setFilters({ town: tw })} className="food-chip">{tw} <span className="ffl-n">{townCounts[tw] || 0}</span></button>
            ))}
          </div>
          <FoodFilters
            filters={filters}
            onChange={setFilters}
            onClear={clear}
            counts={counts}
            matched={view.total}
            total={all.spots.length}
            hasRated={hasRated}
            user={fav.user}
            nearActive={nearMe.active}
            mealNow={mealNow}
            minutesNow={minutesNow}
            onSpin={() => setSpin((n) => n + 1)}
            spinOpen={spin > 0}
          />
        </div>

        {spin > 0 && <FoodRoulette key={spin} pool={sorted} onOpen={openPlace} onClose={() => setSpin(0)} trip={trip} />}
        {!all.loading && !all.error && <FoodLogStrip tried={triedCount} total={all.spots.length} mode={filters.tried} onMode={(m) => setFilters({ tried: m })} onReset={log.clear} />}

        {tab === 'ribbon' ? (
          <div className="mt-8" aria-label="Results">
            {body || (
              <>
                <FoodMarquee spots={ordered} fav={fav} onOpen={openPlace} />
                {pager}
              </>
            )}
          </div>
        ) : tab === 'grid' ? (
          <div className="mt-8" aria-label="Results">
            {body || (
              <>
                <div className="food-grid">
                  {ordered.map((s, i) => (
                    <FoodCard key={s._id} spot={s} index={i} feature={featured?._id === s._id} active={open?._id === s._id} fav={fav} onOpen={openPlace} tried={log.has(triedKey(s))} trip={trip} />
                  ))}
                </div>
                {pager}
              </>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.3fr)]">
            <div aria-label="Results">
              {body || (
                <>
                  <div>
                    {ordered.map((s, i) => (
                      <SpotRow key={s._id} spot={s} index={i} rowId={`food-row-${s._id}`} highlighted={activeId === s._id} onHover={setActiveId} />
                    ))}
                  </div>
                  {pager}
                </>
              )}
            </div>
            <section aria-label="Map" className="food-map relative h-[70svh] border border-line md:sticky md:top-20 md:h-[calc(100vh-6rem)] md:max-h-[64rem]">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 z-[1000] h-[3px] bg-orange" />
              <ExploreMap spots={view.data} activeId={activeId} visible={tab} live travel nearMe={nearMe} onPinHover={setActiveId} onPinClick={(id) => { setActiveId(id); scrollToRow(id); }} />
            </section>
          </div>
        )}
      </section>

      <FoodTripTray places={tripPlaces} max={TRIP_MAX} onRemove={trip.remove} onMove={moveStop} onClear={trip.clear} onOpen={openPlace} />

      {open && (
        <FoodQuickView
          spot={open}
          position={openIndex >= 0 ? openIndex + 1 : 1}
          total={openIndex >= 0 ? ordered.length : 1}
          onClose={closePlace}
          onStep={openIndex >= 0 ? step : undefined}
          onShowOnMap={showOnMap}
          onPick={pick}
          related={related}
          fav={fav}
          trip={trip}
        />
      )}
    </div>
  );
}
