// Small helpers for the Food page (cards and the quick-view panel). No React in here so they are easy to test.

const TYPE_LABELS = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  bakery: 'Bakery',
  fast_food: 'Fast food',
  food_shop: 'Food shop',
  restobar: 'Restobar',
  eatery: 'Eatery',
  food_stall: 'Food stall',
  market: 'Market',
};

// "bakery" -> "Bakery". Unknown or missing types give '' so the card simply shows no badge.
export function typeLabel(spot) {
  const key = String(spot?.entryType || '').toLowerCase();
  if (!key) return '';
  return TYPE_LABELS[key] || key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// Every imported food place carries the same "Named restaurant/eatery listing; confirm ..." sentence.
// It is a note for the admin, not copy for visitors, so the cards and the panel leave it out.
const PLACEHOLDER = /listing; confirm|needs verification|verify (the )?(exact|current)/i;
export function visitorBlurb(spot) {
  const text = String(spot?.shortDescription || '').trim();
  return text && !PLACEHOLDER.test(text) ? text : '';
}

// A Google Maps search by name + address. The data's coordinates are town-centre approximations,
// so we do not send a pin: Maps finds the real storefront from the name.
export function directionsUrl(spot) {
  const place = [spot?.name, spot?.address || spot?.municipality, 'Southern Leyte, Philippines'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

// The page opens a place with ?place=<slug>. These keep the other query params untouched.
export function withPlace(params, slug) {
  const next = new URLSearchParams(params);
  if (slug) next.set('place', slug); else next.delete('place');
  return next;
}

// Picks the featured place: the best-rated one, first in the list on a tie. Returns null for an empty list.
export function pickFeatured(list) {
  if (!list.length) return null;
  return list.reduce((best, s) => ((s.averageRating || 0) > (best.averageRating || 0) ? s : best), list[0]);
}

// ---------------------------------------------------------------------------------------------------------------------
// Filters, sorting, meal picks, roulette and food-trip helpers (update 60). All plain functions, no React.
// ---------------------------------------------------------------------------------------------------------------------

export const FOOD_TYPES = ['restaurant', 'cafe', 'bakery', 'fast_food', 'food_shop', 'restobar', 'eatery', 'food_stall', 'market'];

// "I feel like ..." shortcuts. Picking one just selects those place types, so the type chips and the address stay in step.
export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', icon: '🍳', types: ['bakery', 'cafe', 'eatery'] },
  { id: 'coffee', label: 'Coffee', icon: '☕', types: ['cafe'] },
  { id: 'lunch', label: 'Lunch', icon: '🍛', types: ['restaurant', 'eatery', 'fast_food'] },
  { id: 'merienda', label: 'Merienda', icon: '🥐', types: ['bakery', 'food_stall', 'market', 'cafe'] },
  { id: 'dinner', label: 'Dinner', icon: '🍽️', types: ['restaurant', 'restobar', 'eatery'] },
  { id: 'drinks', label: 'Drinks', icon: '🍻', types: ['restobar'] },
];

// Which meal fits the time of day (minutes since midnight, Manila time). Late night and the small hours point to drinks.
export function mealForMinutes(min) {
  const m = Number(min);
  const meal = (id) => MEALS.find((x) => x.id === id);
  if (!Number.isFinite(m)) return meal('lunch');
  if (m >= 300 && m < 600) return meal('breakfast');
  if (m >= 600 && m < 840) return meal('lunch');
  if (m >= 840 && m < 1020) return meal('merienda');
  if (m >= 1020 && m < 1260) return meal('dinner');
  return meal('drinks');
}

// 760 -> "12:40 pm"
export function clockText(min) {
  const m = ((Math.floor(Number(min) || 0) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

export const sameSet = (a = [], b = []) => a.length === b.length && a.every((x) => b.includes(x));

// The key the "I ate here" log uses for a place (the same one FoodFun has always used).
export const triedKey = (spot) => spot?.slug || String(spot?._id ?? '');

// Lower-case and without accents, so "cafe" finds "Café".
const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ---- the filters, kept in the address so a filtered view can be shared and Back/Forward behave ----
export const SORTS = ['top', 'az', 'town', 'near'];
export const DEFAULT_FILTERS = { q: '', town: '', types: [], sort: '', minRating: 0, saved: false, tried: '' };

export function readFilters(params) {
  const get = (k) => params.get(k) || '';
  const types = get('type').split(',').map((x) => x.trim().toLowerCase()).filter((x) => FOOD_TYPES.includes(x));
  const rating = Number(get('rating'));
  return {
    q: get('q').trim(),
    town: get('town'),
    types: [...new Set(types)],
    sort: SORTS.includes(get('sort')) ? get('sort') : '',
    minRating: rating === 3 || rating === 4 ? rating : 0,
    saved: get('saved') === '1',
    tried: ['tried', 'new'].includes(get('tried')) ? get('tried') : '',
  };
}

// Returns new params: the filters replaced, every other param (like ?place=) left alone. Empty filters leave no trace.
export function writeFilters(params, f) {
  const next = new URLSearchParams(params);
  ['q', 'town', 'type', 'sort', 'rating', 'saved', 'tried'].forEach((k) => next.delete(k));
  if (f.q) next.set('q', f.q);
  if (f.town) next.set('town', f.town);
  if (f.types?.length) next.set('type', f.types.join(','));
  if (f.sort) next.set('sort', f.sort);
  if (f.minRating) next.set('rating', String(f.minRating));
  if (f.saved) next.set('saved', '1');
  if (f.tried) next.set('tried', f.tried);
  return next;
}

// How many filters are switched on (sorting does not count: it only reorders).
export function activeCount(f) {
  return (f.q ? 1 : 0) + (f.town ? 1 : 0) + (f.types?.length || 0) + (f.minRating ? 1 : 0) + (f.saved ? 1 : 0) + (f.tried ? 1 : 0);
}

// ctx.isSaved(id) says whether a place is in the visitor's favourites; ctx.tried is a Set of triedKey()s.
export function filterFoods(spots, f, ctx = {}) {
  const tokens = fold(f.q).split(/\s+/).filter(Boolean);
  return spots.filter((s) => {
    if (f.town && s.municipality !== f.town) return false;
    if (f.types?.length && !f.types.includes(String(s.entryType || '').toLowerCase())) return false;
    if (f.minRating && !((s.averageRating || 0) >= f.minRating && s.reviewCount > 0)) return false;
    if (f.saved && !(ctx.isSaved && ctx.isSaved(s._id))) return false;
    if (f.tried) {
      const has = !!ctx.tried?.has(triedKey(s));
      if (f.tried === 'tried' ? !has : has) return false;
    }
    if (tokens.length) {
      const hay = fold([s.name, s.municipality, s.barangay, s.address, typeLabel(s), (s.activities || []).join(' ')].join(' '));
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

// A new array, ordered. 'top' = best rated first (more reviews wins a tie, then A to Z); 'near' needs distanceKm on the spots.
export function sortFoods(spots, sort) {
  const byName = (a, b) => String(a.name).localeCompare(String(b.name));
  const list = [...spots];
  if (sort === 'az') return list.sort(byName);
  if (sort === 'town') return list.sort((a, b) => String(a.municipality).localeCompare(String(b.municipality)) || byName(a, b));
  if (sort === 'near') return list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byName(a, b));
  return list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0) || byName(a, b));
}

// { cafe: 41, restaurant: 76, ... } for the type chips.
export function typeCounts(spots) {
  const out = {};
  spots.forEach((s) => { const k = String(s.entryType || '').toLowerCase(); if (k) out[k] = (out[k] || 0) + 1; });
  return out;
}

// ---- roulette ----
// A random place that is not the one just shown (unless it is the only one). `rnd` is injectable so tests are exact.
export function pickRandom(list, avoidSlug, rnd = Math.random) {
  if (!list.length) return null;
  const pool = list.length > 1 ? list.filter((s) => s.slug !== avoidSlug) : list;
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

// ---- food trip (a short list of stops, opened as one Google Maps route) ----
export const TRIP_MAX = 8; // Google Maps takes up to 9 stops in a link: 8 plus the destination is safe

const stopLabel = (s) => [s?.name, s?.address || s?.municipality, 'Southern Leyte, Philippines'].filter(Boolean).join(', ');

// One Google Maps route through the stops in order, searched by name (the stored pins are only town centres). '' for no stops.
export function tripUrl(places) {
  const list = (places || []).filter(Boolean);
  if (!list.length) return '';
  const p = new URLSearchParams({ api: '1', destination: stopLabel(list[list.length - 1]), travelmode: 'driving' });
  if (list.length > 1) p.set('waypoints', list.slice(0, -1).map(stopLabel).join('|'));
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

// A plain numbered list to paste into a chat.
export function tripText(places) {
  return (places || []).filter(Boolean).map((s, i) => `${i + 1}. ${s.name} (${s.municipality || 'Southern Leyte'})`).join('\n');
}
