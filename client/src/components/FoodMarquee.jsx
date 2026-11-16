import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SpotImage from './SpotImage';
import Rating from './Rating';
import SaveHeart from './food/SaveHeart';
import { Burst, CostSplitter } from './spot/SpotFun';
import { directionsUrl, typeLabel, visitorBlurb } from '../utils/food';
import { foodMood, manilaMinutes, priceTier, rankFor, readList, writeList } from '../utils/fun';
import { formatKm } from '../utils/geo';

// "Food ribbon": the same scroll-driven band as ScrollMarquee, but every slide is a food card.
//
// The band
//  - glides on its own; scrolling the page speeds it up, flips its direction and leans it into the move
//  - drag it (mouse or finger) and let go: it keeps flying and slows down; a sideways trackpad swipe or wheel nudges it;
//    a plain tap on a card still opens it
//  - the card nearest the middle lifts and gets an orange frame; hovered cards tilt toward the pointer with a glint
//  - Prev / Next, ← → keys, Pause / Play and Slow / Normal / Fast; a thin bar shows where you are in the list
//  - hovering or tabbing into the ribbon holds it still so nothing moves under the cursor
// Finding food
//  - search box (name or town), kind chips (Café, Bakery, ...), sort: Top rated / Nearest / Shuffle
// The spotlight panel under the band (the lit card)
//  - name, town, rating, kind of meal and price tier, a line of text, distance when "Nearest" is on
//  - Open, Directions, Save (♡), Share link, Surprise me (flies the band to a random place)
//  - "I ate here" stamp with confetti and a little food-explorer rank (the same food log the quick view uses)
//  - a group-meal budget splitter
// Tap a card to zoom it in place (more details and actions appear on it); tap it again to shrink it back.
// On the Food page, pass onOpen(spot) so a card opens that page's quick view without leaving the page.
// The second copy of the row only makes the loop seamless, so it is hidden from screen readers and the tab key.
// With "reduce motion" the band never moves: it is a normal swipeable row, and Prev / Next / Surprise just scroll to a card.
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TRIED = 'souley:food-tried';
const SPEEDS = { slow: 0.45, normal: 1, fast: 2.4 };
const SORTS = [['', 'Default'], ['rating', 'Top rated'], ['shuffle', 'Shuffle']];
const PLAN = 'souley:food-plan';
const TIERS = [['Budget-friendly', '₱'], ['Mid-range', '₱₱'], ['Treat yourself', '₱₱₱']];
// "Right now": a guess from the kind of place and the time in Manila. It is not opening hours.
function mealNow() {
  const h = Math.floor(manilaMinutes() / 60);
  if (h >= 5 && h < 10) return ['Breakfast', ['bakery', 'cafe']];
  if (h >= 10 && h < 15) return ['Lunch', ['restaurant', 'eatery', 'food_stall', 'fast_food', 'market', 'food_shop']];
  if (h >= 15 && h < 18) return ['Merienda', ['cafe', 'bakery', 'food_stall', 'food_shop']];
  if (h >= 18 && h < 21) return ['Dinner', ['restaurant', 'restobar', 'eatery', 'fast_food']];
  return ['Late bite', ['restobar', 'fast_food', 'restaurant']];
}
// One Google Maps route through the planned places, in order (Maps takes up to 10 stops). Searches by name, like Directions.
function routeUrl(list) {
  const where = (s) => [s.name, s.address || s.municipality, 'Southern Leyte, Philippines'].filter(Boolean).join(', ');
  const stops = list.slice(0, 10).map(where);
  const u = new URLSearchParams({ api: '1', destination: stops.pop(), travelmode: 'driving' });
  if (stops.length) u.set('waypoints', stops.join('|'));
  return `https://www.google.com/maps/dir/?${u}`;
}

export default function FoodMarquee({ spots = [], fav, onOpen }) {
  const root = useRef(null);
  const band = useRef(null);
  const track = useRef(null);
  const ctl = useRef({ fly: null, step: null, to: null });
  const pending = useRef(null); // a place to fly to once the filters have been cleared
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('');
  const [seed, setSeed] = useState(0);
  const [at, setAt] = useState(0); // index (into `list`) of the lit card
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState('normal');
  const [tried, setTried] = useState(() => readList(TRIED));
  const [burst, setBurst] = useState(0);
  const [shared, setShared] = useState(false);
  const [tierF, setTierF] = useState('');
  const [top, setTop] = useState(false);
  const [now, setNow] = useState(false);
  const [plan, setPlan] = useState(() => readList(PLAN));
  const [tour, setTour] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(null); // id of the card that is zoomed in
  const meal = useMemo(mealNow, []);
  const idOf = (s) => s.slug || String(s._id);
  const reduce = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);
  const playRef = useRef(true), speedRef = useRef('normal');
  const tourRef = useRef(false);
  const zoomRef = useRef(null);
  playRef.current = playing; speedRef.current = speed; tourRef.current = tour; zoomRef.current = zoom;

  const base = useMemo(() => spots.slice(0, 24), [spots]);
  const kinds = useMemo(() => {
    const m = new Map();
    base.forEach((s) => { const k = typeLabel(s); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()];
  }, [base]);
  const shown = useMemo(() => {
    let l = base.filter((s) => (!kind || typeLabel(s) === kind)
      && (!tierF || priceTier(s) === tierF)
      && (!top || (s.averageRating || 0) >= 4)
      && (!now || meal[1].includes(String(s.entryType || '').toLowerCase())));
    if (sort === 'rating') l = [...l].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));
    else if (sort === 'shuffle') { l = [...l]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } }
    return l;
  }, [base, kind, sort, seed, tierF, top, now, meal]);
  // Short lists are repeated so one copy of the row is always wider than the screen.
  const list = useMemo(() => (shown.length && shown.length < 8 ? Array.from({ length: Math.ceil(8 / shown.length) }, () => shown).flat() : shown), [shown]);
  const key = list.map((s) => s._id).join('|');

  useEffect(() => { setAt(0); }, [key]);
  useEffect(() => { setShared(false); setPhoto(0); }, [at]);
  // The looped second copy of the row is for looks only: keep its links and buttons out of the tab order (it stays tappable).
  useEffect(() => {
    band.current?.querySelectorAll('.fm-row[aria-hidden="true"] a, .fm-row[aria-hidden="true"] button').forEach((el) => { el.tabIndex = -1; });
  });

  useEffect(() => {
    const el = track.current, b = band.current, r = root.current;
    ctl.current.fly = null; ctl.current.step = null; ctl.current.to = null;
    if (!el || !b || !r || !list.length || typeof IntersectionObserver === 'undefined' || reduce) return undefined;
    const cards = [...el.querySelectorAll('[data-fm]')];
    const n = list.length;
    let centers = [];
    const measure = () => { centers = cards.map((c) => c.offsetLeft + c.offsetWidth / 2); };
    measure();
    document.fonts?.ready?.then(measure);
    window.addEventListener('resize', measure);

    let x = 0, last = window.scrollY, v = 0, dir = -1, skew = 0, lit = -1, raf = 0, visible = true;
    let paused = false, goto = null, fling = 0, drag = null, suppress = false;
    const loop = () => {
      raf = 0;
      const d = window.scrollY - last; last = window.scrollY;
      v += (Math.abs(d) - v) * 0.1;
      if (d !== 0) dir = d > 0 ? -1 : 1;
      if (goto !== null) { x += (goto - x) * 0.09; if (Math.abs(goto - x) < 0.5) goto = null; }
      else if (!drag?.cap) {
        if (!paused && playRef.current && !tourRef.current && !zoomRef.current) x += dir * (0.5 + v * 0.45) * SPEEDS[speedRef.current];
        x += fling; fling *= 0.94; if (Math.abs(fling) < 0.05) fling = 0;
      }
      const half = el.scrollWidth / 2;
      if (x <= -half) { x += half; if (goto !== null) goto += half; } else if (x > 0) { x -= half; if (goto !== null) goto -= half; }
      skew += (-dir * clamp(v * 0.4 + Math.abs(fling) * 0.3, 0, 5) - skew) * 0.12;
      el.style.transform = `translate3d(${x}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      const mid = b.clientWidth / 2 - x;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < centers.length; i++) { const dd = Math.abs(centers[i] - mid); if (dd < bestD) { bestD = dd; best = i; } }
      if (best !== lit) { cards[lit]?.classList.remove('is-lit'); cards[best].classList.add('is-lit'); lit = best; setAt(best % n); }
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); });
    io.observe(b);

    // Fly the band so card `idx` ends up in the middle, taking the shorter way round the loop.
    const flyTo = (idx) => {
      const half = el.scrollWidth / 2, t0 = b.clientWidth / 2 - centers[idx];
      let best = t0, bd = Infinity;
      for (let k = -2; k <= 2; k++) { const t = t0 + k * half, dd = Math.abs(t - x); if (dd < bd) { bd = dd; best = t; } }
      goto = best; fling = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const cur = () => Math.max(lit, 0) % n;
    ctl.current.fly = () => { if (n > 1) flyTo((cur() + 1 + Math.floor(Math.random() * (n - 1))) % n); };
    ctl.current.step = (dd) => flyTo((cur() + dd + n) % n);
    ctl.current.to = (i) => flyTo(i % n);

    // Hold still while the pointer or keyboard focus is anywhere in the ribbon.
    const hold = () => { paused = true; }, free = () => { paused = false; };
    r.addEventListener('pointerenter', hold); r.addEventListener('pointerleave', free);
    r.addEventListener('focusin', hold); r.addEventListener('focusout', free);

    // Drag and fling. Only counts as a drag after 6px, so a plain tap still reaches the card's link.
    const down = (e) => { if (e.button > 0) return; drag = { lx: e.clientX, moved: 0, cap: false }; goto = null; fling = 0; setTour(false); };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.lx; drag.lx = e.clientX; drag.moved += Math.abs(dx);
      if (!drag.cap && drag.moved > 6) { drag.cap = true; b.setPointerCapture?.(e.pointerId); b.classList.add('is-drag'); setZoom(null); }
      if (drag.cap) { x += dx; fling = dx; if (dx) dir = dx > 0 ? 1 : -1; }
    };
    const up = () => { if (drag?.cap) { suppress = true; setTimeout(() => { suppress = false; }, 0); } drag = null; b.classList.remove('is-drag'); };
    const click = (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); } };
    // A sideways trackpad swipe (or shift + wheel) nudges the band; plain vertical scrolling is left alone.
    const wheel = (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault(); setTour(false); setZoom(null); goto = null; fling = clamp(fling - dx * 0.08, -40, 40);
      dir = dx > 0 ? -1 : 1;
    };
    b.addEventListener('pointerdown', down); b.addEventListener('pointermove', move);
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('click', click, true);
    b.addEventListener('wheel', wheel, { passive: false });

    // Tilt + glint toward the pointer.
    const tilt = (e) => {
      const c = e.target.closest?.('[data-fm]');
      if (!c || drag?.cap) return;
      const box = c.getBoundingClientRect(), px = (e.clientX - box.left) / box.width, py = (e.clientY - box.top) / box.height;
      c.style.setProperty('--ry', `${((px - 0.5) * 12).toFixed(1)}deg`); c.style.setProperty('--rx', `${((0.5 - py) * 12).toFixed(1)}deg`);
      c.style.setProperty('--gx', `${(px * 100).toFixed(0)}%`); c.style.setProperty('--gy', `${(py * 100).toFixed(0)}%`);
    };
    const untilt = (e) => {
      const c = e.target.closest?.('[data-fm]');
      if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    };
    el.addEventListener('pointermove', tilt); el.addEventListener('pointerout', untilt);

    raf = requestAnimationFrame(loop);
    return () => {
      ctl.current.fly = null; ctl.current.step = null; ctl.current.to = null;
      io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', measure);
      r.removeEventListener('pointerenter', hold); r.removeEventListener('pointerleave', free);
      r.removeEventListener('focusin', hold); r.removeEventListener('focusout', free);
      b.removeEventListener('pointerdown', down); b.removeEventListener('pointermove', move);
      b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up); b.removeEventListener('click', click, true);
      b.removeEventListener('wheel', wheel);
      el.removeEventListener('pointermove', tilt); el.removeEventListener('pointerout', untilt);
    };
  }, [key, reduce]);

  // The zoomed card gets its class straight on the element, like is-lit, so a re-render never wipes either one.
  useEffect(() => { setZoom(null); }, [key]);
  useEffect(() => {
    track.current?.querySelectorAll('[data-fm]').forEach((c) => c.classList.toggle('is-zoom', zoom !== null && c.dataset.id === zoom));
  }, [zoom, key]);
  // Taste tour: the band visits one place after another by itself until you touch it.
  useEffect(() => {
    if (!tour) return undefined;
    setZoom(null);
    ctl.current.step?.(1);
    const t = setInterval(() => ctl.current.step?.(1), 4500);
    return () => clearInterval(t);
  }, [tour]);
  // A place picked from "My food trip" that the filters were hiding: fly to it once they are cleared.
  useEffect(() => {
    if (!pending.current) return undefined;
    const idx = list.findIndex((s) => idOf(s) === pending.current);
    if (idx < 0) return undefined;
    pending.current = null;
    const t = setTimeout(() => (ctl.current.to ? ctl.current.to(idx) : jump(idx)), 120);
    return () => clearTimeout(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = shown.length || 1;
  // Prev / Next / Surprise. With "reduce motion" there is no flying, so scroll the row to the card instead.
  const jump = (idx) => { band.current?.querySelectorAll('[data-fm]')[idx]?.scrollIntoView({ inline: 'center', block: 'nearest' }); setAt(idx); };
  const go = (d) => { setTour(false); setZoom(null); if (ctl.current.step) ctl.current.step(d); else jump((at + d + count) % count); };
  const surprise = () => {
    setTour(false); setZoom(null);
    if (ctl.current.fly) ctl.current.fly();
    else if (count > 1) jump((at + 1 + Math.floor(Math.random() * (count - 1))) % count);
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && zoom) { setZoom(null); return; }
    if (e.target.tagName === 'INPUT' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  const pickSort = (k) => {
    if (k === 'shuffle') setSeed((n) => n + 1);
    setSort(k);
  };
  // On the Food page a card opens the page's quick view instead of navigating (modified clicks still open a new tab).
  const openLink = (s) => (e) => {
    if (!onOpen || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); onOpen(s);
  };
  // Tap a card: it zooms in (and the band glides to centre it). Tap it again: it shrinks back. Modified clicks still open a new tab.
  const tapCard = (s) => (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); setTour(false);
    const id = idOf(s);
    if (zoom === id) { setZoom(null); return; }
    setZoom(id);
    const idx = list.findIndex((x) => idOf(x) === id);
    if (ctl.current.to && idx >= 0) ctl.current.to(idx); else e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  const clear = () => { setKind(''); setSort(''); setTierF(''); setTop(false); setNow(false); setZoom(null); };
  const toggleBook = (s) => {
    const k = idOf(s), next = plan.includes(k) ? plan.filter((x) => x !== k) : [...plan, k];
    writeList(PLAN, next); setPlan(next);
  };
  const focusSpot = (s) => {
    setTour(false); setZoom(null);
    const idx = shown.findIndex((x) => idOf(x) === idOf(s));
    if (idx >= 0) { if (ctl.current.to) ctl.current.to(idx); else jump(idx); } else { pending.current = idOf(s); clear(); }
  };

  const stamp = (s) => {
    const k = idOf(s), has = tried.includes(k), next = has ? tried.filter((x) => x !== k) : [...tried, k];
    writeList(TRIED, next); setTried(next);
    if (!has) setBurst((n) => n + 1);
  };
  const copyPlan = async () => {
    const text = ['My Southern Leyte food trip:', ...planned.map((s, i) => `${i + 1}. ${s.name}, ${s.municipality}`)].join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* blocked: nothing to do */ }
  };
  const share = async (s) => {
    const url = `${window.location.origin}/food?place=${encodeURIComponent(s.slug)}`;
    try {
      if (navigator.share) await navigator.share({ title: s.name, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2200); }
    } catch { /* cancelled or blocked: nothing to do */ }
  };

  if (!base.length) return null;
  const spot = list[Math.min(at, list.length - 1)] || shown[0];
  const blurb = spot ? visitorBlurb(spot) : '';
  const here = spot ? tried.includes(idOf(spot)) : false;
  const rank = rankFor(tried.length);
  const mood = spot ? foodMood(spot) : '';
  const tier = spot ? priceTier(spot) : '';
  const planned = plan.map((id) => base.find((s) => idOf(s) === id)).filter(Boolean);
  const planSum = planned.reduce((a, s) => a + (Number(s.estimatedBudget) || 0), 0);
  const inPlan = spot ? plan.includes(idOf(spot)) : false;
  const tiers = TIERS.filter(([name]) => base.some((s) => priceTier(s) === name));

  const row = (hidden) => list.map((s, i) => (
    <article
      key={`${s._id}-${i}`}
      data-fm
      className="fcard fm-card"
      data-id={idOf(s)}
    >
      <Link
        to={`/food?place=${encodeURIComponent(s.slug)}`}
        draggable={false}
        onClick={tapCard(s)}
        tabIndex={hidden ? -1 : undefined}
        aria-expanded={hidden ? undefined : zoom === idOf(s)}
        aria-label={hidden ? undefined : `${s.name}, ${s.municipality}. ${zoom === idOf(s) ? 'Zoomed in. Tap to shrink' : 'Tap to zoom in'}`}
        className="fcard-open"
      >
        <SpotImage src={s.images?.[0]} fallbacks={s.images?.slice(1)} slug={s.slug} alt="" className="fcard-photo" />
        <span aria-hidden="true" className="fcard-shade" />
        <span aria-hidden="true" className="fm-glare" />
        <span className="fcard-text" aria-hidden="true">
          <span className="fcard-name">{s.name}</span>
          <span className="fcard-meta">
            <span>{s.municipality}{s.distanceKm != null && <b> · {formatKm(s.distanceKm)}</b>}</span>
            {s.reviewCount > 0 && <b className="fm-star">★ {Number(s.averageRating).toFixed(1)}</b>}
          </span>
        </span>
      </Link>
      {zoom === idOf(s) && (
        <div className="fm-more">
          <p className="fm-more-name">{s.name}</p>
          <p className="fm-more-sub">{s.municipality}{s.distanceKm != null && ` · ${formatKm(s.distanceKm)}`}{s.reviewCount > 0 && ` · ★ ${Number(s.averageRating).toFixed(1)}`}</p>
          {(foodMood(s) || priceTier(s)) && <ul className="fm-more-tags">{foodMood(s) && <li>{foodMood(s)}</li>}{priceTier(s) && <li>{priceTier(s)}</li>}</ul>}
          {visitorBlurb(s) && <p className="fm-more-blurb">{visitorBlurb(s)}</p>}
          <div className="fm-more-acts">
            <Link to={`/food?place=${encodeURIComponent(s.slug)}`} onClick={openLink(s)} className="btn btn-primary btn-sm">Full details</Link>
            <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Directions <span aria-hidden="true">↗</span></a>
            <button type="button" className="btn btn-outline btn-sm" aria-pressed={plan.includes(idOf(s))} onClick={() => toggleBook(s)}>{plan.includes(idOf(s)) ? 'In my trip ✓' : 'Add to trip'}</button>
          </div>
        </div>
      )}
      {typeLabel(s) && <span className="fcard-type" aria-hidden="true">{typeLabel(s)}</span>}
      <span className="fm-num" aria-hidden="true">{String((i % count) + 1).padStart(2, '0')}</span>
      {tried.includes(idOf(s)) && <span className="fm-ate" aria-hidden="true"><b>ATE</b><b>HERE</b></span>}
      <SaveHeart spot={s} fav={fav} className="fcard-save" />
    </article>
  ));

  return (
    <section ref={root} onKeyDown={onKey} aria-labelledby="fm-title" className="surface-dark fm-root relative bg-night text-[#ffffff]">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="fm-eyebrow">Taste of Southern Leyte</p>
            <h2 id="fm-title" className="fm-title">Hungry? Keep scrolling.</h2>
          </div>
          <p className="fm-total" aria-live="polite">{shown.length} {shown.length === 1 ? 'place' : 'places'}</p>
        </div>
        <div className="fm-tools">
          {kinds.length > 1 && (
            <div className="fm-chips" role="group" aria-label="Kind of place">
              <button type="button" className="fm-chip" aria-pressed={!kind} onClick={() => setKind('')}>All <small>{base.length}</small></button>
              {kinds.map(([k, c]) => (
                <button key={k} type="button" className="fm-chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? '' : k)}>{k} <small>{c}</small></button>
              ))}
            </div>
          )}
          {tiers.length > 1 && (
            <div className="fm-chips" role="group" aria-label="Price">
              {tiers.map(([name, sym]) => (
                <button key={name} type="button" className="fm-chip is-sort" aria-pressed={tierF === name} onClick={() => setTierF(tierF === name ? '' : name)}>{sym} {name}</button>
              ))}
            </div>
          )}
          <div className="fm-chips" role="group" aria-label="More filters">
            <button type="button" className="fm-chip is-sort" aria-pressed={top} onClick={() => setTop((v) => !v)}>★ 4 &amp; up</button>
            <button type="button" className="fm-chip is-sort" aria-pressed={now} title="A guess from the kind of place and the time in Manila, not opening hours" onClick={() => setNow((v) => !v)}>Right now · {meal[0]}</button>
          </div>
          <div className="fm-chips" role="group" aria-label="Sort">
            {SORTS.map(([k, label]) => (
              <button key={k || 'default'} type="button" className="fm-chip is-sort" aria-pressed={sort === k} onClick={() => pickSort(k)}>
                {label}{k === 'shuffle' && ' ⟳'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="fm-empty mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6">
          <p>No place matches those filters. Try a different kind or price.</p>
          <button type="button" className="btn btn-outline mt-4" onClick={clear}>Show everything</button>
        </div>
      ) : (
        <>
          <div ref={band} className="mq-band fm-band relative mt-7 overflow-hidden py-12 sm:py-14">
            <div className="marquee-glow pointer-events-none absolute inset-0" />
            <span className="marquee-rule absolute inset-x-0 top-0 h-px" />
            <span className="marquee-rule absolute inset-x-0 bottom-0 h-px" />
            <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-night to-transparent sm:w-32" />
            <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-night to-transparent sm:w-32" />
            <div ref={track} className="fm-track relative flex w-max will-change-transform">
              <div className="fm-row flex">{row(false)}</div>
              <div className="fm-row flex" aria-hidden="true">{row(true)}</div>
            </div>
            <span className="mq-sweep" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="fm-bar">
              <div className="fm-ctrl" role="group" aria-label="Move the ribbon">
                <button type="button" className="fm-btn" aria-label="Previous place" onClick={() => go(-1)}>←</button>
                {!reduce && <button type="button" className="fm-btn" aria-pressed={!playing} aria-label={playing ? 'Pause the ribbon' : 'Play the ribbon'} onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚' : '▶'}</button>}
                <button type="button" className="fm-btn" aria-label="Next place" onClick={() => go(1)}>→</button>
                {!reduce && <button type="button" className="fm-btn is-wide" aria-pressed={tour} onClick={() => setTour((t) => !t)}>{tour ? 'Stop tour' : 'Taste tour'}</button>}
              </div>
              {!reduce && (
                <div className="fm-chips" role="group" aria-label="Speed">
                  {Object.keys(SPEEDS).map((k) => <button key={k} type="button" className="fm-chip is-sort" aria-pressed={speed === k} onClick={() => setSpeed(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
                </div>
              )}
              <p className="fm-hint">Tap a card to zoom it · drag or swipe · ← → keys</p>
            </div>
            <div className="fm-prog" aria-hidden="true"><i style={{ width: `${(((at % count) + 1) / count) * 100}%` }} /></div>
          </div>

          {spot && (
            <div className="fm-panel mx-auto grid max-w-7xl gap-x-12 gap-y-8 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div key={spot._id} className="fm-info min-w-0">
                <p className="fm-count"><b>{String((at % count) + 1).padStart(2, '0')}</b> / {String(count).padStart(2, '0')}{typeLabel(spot) && <> · {typeLabel(spot)}</>}</p>
                <p className="fm-name" aria-label={spot.name}>
                  {[...spot.name].map((ch, k) => <span key={k} aria-hidden="true" className="mq-ch" style={{ '--k': k }}>{ch === ' ' ? '\u00a0' : ch}</span>)}
                </p>
                <p className="fm-sub">
                  <span>{spot.municipality}{spot.distanceKm != null && <b> · {formatKm(spot.distanceKm)}</b>}</span>
                  {spot.reviewCount > 0 && <span className="fcard-rate"><Rating value={spot.averageRating} count={spot.reviewCount} /></span>}
                </p>
                {(mood || tier) && (
                  <ul className="fm-tags" aria-label="Good for">
                    {mood && <li><span aria-hidden="true">🍽️</span>{mood}</li>}
                    {tier && <li><span aria-hidden="true">₱</span>{tier}</li>}
                  </ul>
                )}
                {blurb && <p className="fm-blurb">{blurb}</p>}
                <div className="fm-actions">
                  <Link to={`/food?place=${encodeURIComponent(spot.slug)}`} onClick={openLink(spot)} className="btn btn-primary">Open</Link>
                  <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Directions <span aria-hidden="true">↗</span></a>
                  <SaveHeart spot={spot} fav={fav} withLabel className="fm-save" />
                  <button type="button" className="btn btn-outline" onClick={() => share(spot)}>{shared ? 'Link copied ✓' : 'Share'}</button>
                  <button type="button" className="btn btn-outline" aria-pressed={inPlan} onClick={() => toggleBook(spot)}>{inPlan ? 'In my trip ✓' : 'Add to my trip'}</button>
                  {count > 1 && <button type="button" className="btn btn-outline" onClick={surprise}>Surprise me <span aria-hidden="true">✦</span></button>}
                </div>
              </div>

              <div className="fm-side grid content-start gap-5">
                {spot.images?.length > 0 && (
                  <div className="fm-gallery">
                    <SpotImage key={`${spot._id}-${photo}`} src={spot.images[photo]} fallbacks={spot.images.filter((_, i) => i !== photo)} slug={spot.slug} alt={`${spot.name}, photo ${photo + 1}`} className="fm-gal-main" />
                    {spot.images.length > 1 && (
                      <div className="fm-thumbs" role="group" aria-label="Photos">
                        {spot.images.slice(0, 5).map((src, i) => (
                          <button key={`${src}-${i}`} type="button" className="fm-thumb" aria-label={`Show photo ${i + 1}`} aria-pressed={photo === i} onClick={() => setPhoto(i)}>
                            <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className={`ff-stamp ${here ? 'is-on' : ''}`}>
                  <button type="button" className="ff-stamp-btn" aria-pressed={here} onClick={() => stamp(spot)}>
                    <span className="ff-seal" aria-hidden="true"><b>ATE</b><b>HERE</b></span>
                    <span className="ff-stamp-text">{here ? 'Stamped. You ate here' : 'I ate here'}<small>{here ? 'Tap again to undo' : 'Stamp it in your food log'}</small></span>
                  </button>
                  <p className="ff-rank" aria-live="polite">
                    <b>{tried.length}</b> {tried.length === 1 ? 'place' : 'places'} tried · <span>{rank.name}</span>
                    {rank.next && <small> {rank.next.left} more to become “{rank.next.name}”</small>}
                  </p>
                  <span className="fm-rankbar" aria-hidden="true"><i style={{ width: `${rank.next ? Math.min(100, (tried.length / rank.next.at) * 100) : 100}%` }} /></span>
                  <Burst go={burst} />
                </div>
                <CostSplitter perPerson={spot.estimatedBudget} title="Eating as a group?" />
              </div>
            </div>
          )}

          {planned.length > 0 && (
            <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
              <section className="fm-plan" aria-label="My food trip">
                <div className="fm-plan-head">
                  <h3>My food trip <small>{planned.length} {planned.length === 1 ? 'stop' : 'stops'}</small></h3>
                  {planSum > 0 && <p>About ₱{Math.round(planSum).toLocaleString('en-PH')} per person if you eat at each <small>(estimates)</small></p>}
                  <div className="fm-plan-acts">
                    <a href={routeUrl(planned)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Route in Maps <span aria-hidden="true">↗</span></a>
                    <button type="button" className="btn btn-outline" onClick={copyPlan}>{copied ? 'List copied ✓' : 'Copy list'}</button>
                    <button type="button" className="btn btn-outline" onClick={() => { writeList(PLAN, []); setPlan([]); }}>Clear</button>
                  </div>
                </div>
                <ol className="fm-plan-list">
                  {planned.map((s, i) => (
                    <li key={idOf(s)}>
                      <button type="button" className="fm-plan-chip" onClick={() => focusSpot(s)}><b>{i + 1}</b><span>{s.name}<small>{s.municipality}</small></span></button>
                      <button type="button" className="fm-plan-x" aria-label={`Remove ${s.name} from my food trip`} onClick={() => toggleBook(s)}>✕</button>
                    </li>
                  ))}
                </ol>
                {planned.length > 10 && <p className="fm-note">Maps takes the first 10 stops.</p>}
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
