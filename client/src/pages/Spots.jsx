import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import CategoryChips from '../components/CategoryChips';
import FilterPanel from '../components/FilterPanel';
import SpotRow from '../components/SpotRow';
import ExploreMap from '../components/ExploreMap';
import VibePad from '../components/spot/VibePad';
import ScrollTop from '../components/ScrollTop';
import PageHero from '../components/PageHero';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { SkeletonRows } from '../components/Loading';
import { useSpots } from '../hooks/useSpots';
import { useAllSpots } from '../hooks/useAllSpots';
import { useCategories } from '../hooks/useCategories';
import { useDebouncedCallback } from '../hooks/useDebounce';
import NearMeButton from '../components/NearMeButton';
import { useNearMe } from '../hooks/useNearMe';
import { useI18n } from '../i18n/I18nContext';
import { sortByDistance } from '../utils/geo';
import { buildSearchParams, parseSpotQuery, SORTS } from '../utils/query';

export default function Spots() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseSpotQuery(searchParams), [searchParams]);
  const { spots, pagination, loading, error, retry } = useSpots(query);
  const { categories } = useCategories();
  const [showFilters, setShowFilters] = useState(false);
  const [showVibe, setShowVibe] = useState(false);
  const listRef = useRef(null);
  const vibeSpots = useAllSpots({}, { enabled: showVibe }); // the whole list, loaded only once the pad is opened
  const [view, setView] = useState('list'); // mobile only
  const [activeId, setActiveId] = useState(null); // hover
  const [selectedId, setSelectedId] = useState(null); // clicked: the map jumps to its pin
  const nearMe = useNearMe();
  const { t } = useI18n();
  // Distance sorting applies to the spots on the current page.
  const shown = useMemo(() => (nearMe.active ? sortByDistance(spots, nearMe.origin) : spots), [spots, nearMe.active, nearMe.origin]);

  const update = (patch, replace = false) =>
    setSearchParams(buildSearchParams({ ...query, ...patch, page: patch.page ?? 1 }), { replace });
  const updateSearch = useDebouncedCallback((text) => update({ search: text }), 400);

  // Out-of-range page (e.g. page=99) is corrected to the last page.
  useEffect(() => {
    if (pagination && pagination.pages >= 1 && query.page > pagination.pages) {
      setSearchParams(buildSearchParams({ ...query, page: pagination.pages }), { replace: true });
    }
  }, [pagination, query, setSearchParams]);

  const clearFilters = () => {
    updateSearch.cancel();
    setSearchParams(new URLSearchParams());
  };
  const toggleSelect = (id) => setSelectedId((cur) => (cur === id ? null : id));
  const mapActive = selectedId ?? activeId;
  const calm = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // A pin was clicked: scroll to its row and let an orange wash fade across it so the eye finds it.
  const scrollToRow = (id) => {
    const el = document.getElementById(`spot-row-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!calm()) el.animate?.([{ backgroundColor: 'rgba(255, 106, 19, .24)' }, { backgroundColor: 'rgba(255, 106, 19, 0)' }], { duration: 1600, easing: 'ease-out' });
  };
  // A new page of results: bring the top of the list into view.
  const toResults = () => requestAnimationFrame(() => document.getElementById('spots-results')?.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }));
  const hasFilters = Object.keys(query).some((k) => !['page', 'limit'].includes(k));
  const listKey = searchParams.toString(); // a new search or page remounts the rows, so they arrive again

  // Rows slide in as they come into view (data-in is what the CSS watches; it is not a class, because React rewrites classes on hover).
  useEffect(() => {
    const root = listRef.current;
    if (!root) return undefined;
    const rows = [...root.querySelectorAll('.gal-in')];
    const show = (el) => { el.dataset.in = '1'; };
    if (calm() || typeof IntersectionObserver === 'undefined') { rows.forEach(show); return undefined; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    rows.forEach((r) => io.observe(r));
    const safety = setTimeout(() => rows.forEach(show), 4000); // never leave a row hidden
    return () => { io.disconnect(); clearTimeout(safety); };
  }, [shown]);

  return (
    <div className="spots-page">
      <PageHero title={t('spots.title')} seed="spots-hero" countText={!loading && !error && spots.length > 0 ? t('spots.count', { n: pagination?.total ?? spots.length }) : undefined} />
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="gal-toolbar relative z-10 -mt-10 space-y-3 border border-line bg-white p-4 sm:-mt-12 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[16rem] flex-1">
              <SearchBar value={query.search || ''} onChange={(t) => updateSearch(t.trim())} onSubmit={(t) => { updateSearch.cancel(); update({ search: t }); }} />
            </div>
            <label className="text-sm">
              <span className="sr-only">Sort by</span>
              <select value={query.sort || ''} onChange={(e) => update({ sort: e.target.value })} className="field w-auto">
                <option value="">Sort: Newest</option>
                {SORTS.filter((s) => s !== 'newest').map((s) => <option key={s} value={s}>{`Sort: ${s[0].toUpperCase()}${s.slice(1)}`}</option>)}
              </select>
            </label>
            <NearMeButton nearMe={nearMe} />
            <button type="button" aria-expanded={showVibe} onClick={() => setShowVibe((v) => !v)} className={`vp-open btn btn-sm ${showVibe ? 'btn-dark' : 'btn-outline'}`}>
              <span aria-hidden="true" className="vp-spark">✦</span> Vibe pad
            </button>
            <button type="button" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)} className="btn btn-outline btn-sm">
              More filters
            </button>
          </div>
          <CategoryChips categories={categories} active={query.category || ''} onSelect={(slug) => update({ category: slug })} />
          {showFilters && <div className="sp-unfold"><FilterPanel query={query} onChange={(patch) => update(patch)} /></div>}
        </div>

        {showVibe && (
          <div className="mt-6">
            <VibePad spots={vibeSpots.spots} loading={vibeSpots.loading} error={vibeSpots.error} onRetry={vibeSpots.retry} onClose={() => setShowVibe(false)} />
          </div>
        )}

        <div className="mt-6 flex gap-2 md:hidden" role="group" aria-label="Switch view">
          {['list', 'map'].map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={`flex-1 rounded-sm border px-3 py-2 text-sm ${view === v ? 'border-night bg-night text-white' : 'border-line'}`}>
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section id="spots-results" aria-label="Results" className={`relative scroll-mt-4 ${view === 'map' ? 'hidden md:block' : ''}`}>
            {loading && <><span className="sp-load" aria-hidden="true" /><SkeletonRows /></>}
            {!loading && error && <ErrorState onRetry={retry} />}
            {!loading && !error && spots.length === 0 && (
              <EmptyState title="No spots match your search." actionLabel={hasFilters ? 'Clear filters' : undefined} onAction={clearFilters} />
            )}
            {!loading && !error && spots.length > 0 && (
              <>
                <div ref={listRef} key={listKey}>
                  {shown.map((s, i) => (
                    <SpotRow key={s._id} spot={s} index={i} rowId={`spot-row-${s._id}`} highlighted={activeId === s._id} selected={selectedId === s._id} onHover={setActiveId} onSelect={toggleSelect} />
                  ))}
                </div>
                <Pagination page={query.page} pages={pagination?.pages || 1} onChange={(page) => { update({ page }); toResults(); }} />
              </>
            )}
          </section>
          <section aria-label="Map" className={`sp-map ${view === 'list' ? 'hidden md:block' : ''} relative h-[70svh] border border-line md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:max-h-[58rem]`}>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 z-[1000] h-[3px] bg-orange" />
            <ExploreMap spots={spots} activeId={mapActive} visible={view} live travel focusActive={selectedId != null} nearMe={nearMe} onPinHover={setActiveId} onPinClick={(id) => { setSelectedId(id); scrollToRow(id); }} />
          </section>
        </div>
      </div>
      <ScrollTop />
    </div>
  );
}
