import { distanceKm, isFoodSpot, toLatLng } from './geo';

// Leyte Passport: stamps live in the browser (localStorage). A stamp is earned by being near a spot (GPS) or by saying "I was here".
export const STORAGE_KEY = 'souley-passport';
export const STAMP_RADIUS_KM = 0.3;
export const MIN_SPOTS_FOR_BADGE = 2; // a town needs at least this many spots to award a badge

// Ranks by number of stamps. `key` is a translation key (passport.rank.*).
export const RANKS = [
  { min: 0, key: 'passport.rank.tourist' },
  { min: 1, key: 'passport.rank.newcomer' },
  { min: 5, key: 'passport.rank.wanderer' },
  { min: 15, key: 'passport.rank.trailblazer' },
  { min: 30, key: 'passport.rank.local' },
];

// Account sync: the page keeps stamps as { [spotId]: { at, method, name, municipality, slug } }; the server sends and takes a list.
export function stampsFromList(list) {
  const out = {};
  (list || []).forEach((s) => {
    if (!s || !s.spot) return;
    out[s.spot] = { at: s.at, method: s.method === 'manual' ? 'manual' : 'gps', name: s.name || '', municipality: s.municipality || '', slug: s.slug || '' };
  });
  return out;
}
export const stampsToList = (stamps) => Object.entries(stamps || {}).map(([spot, s]) => ({ spot, at: s.at, method: s.method }));

// The holder page: cover colours the visitor can choose, a passport number made from the account id, and the monogram letters.
export const COVER_COLORS = ['black', 'navy', 'green', 'burgundy'];
export function passportNumber(user) {
  const hex = String(user?._id || user?.id || '').replace(/[^a-f0-9]/gi, '');
  return hex ? `SDT-${hex.slice(-6).toUpperCase()}` : '';
}
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function loadStamps(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function persistStamps(stamps, storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(stamps)); return true; } catch { return false; }
}

export function clearStamps(storage = typeof localStorage === 'undefined' ? null : localStorage) {
  try { storage?.removeItem(STORAGE_KEY); return true; } catch { return false; }
}

// Spots that can carry a stamp: not food places, and they need an id.
export const stampable = (spots) => (spots || []).filter((s) => s && s._id && !isFoodSpot(s));

// Can this spot be stamped from `origin` ([lat, lng])? Returns { ok, distanceKm } (distanceKm is null when unknown).
export function canStamp(spot, origin, radiusKm = STAMP_RADIUS_KM) {
  const p = toLatLng(spot);
  if (!p || !origin) return { ok: false, distanceKm: null };
  const d = distanceKm(origin, p);
  return { ok: d <= radiusKm, distanceKm: d };
}

// Pure: returns a new stamps object with this spot stamped. An existing stamp is kept (first visit wins).
export function addStamp(stamps, spot, method = 'gps', now = new Date()) {
  if (!spot?._id || stamps[spot._id]) return stamps;
  return {
    ...stamps,
    [spot._id]: {
      at: now.toISOString(),
      method: method === 'manual' ? 'manual' : 'gps',
      name: spot.name,
      municipality: spot.municipality || '',
      slug: spot.slug || '',
    },
  };
}

export function removeStamp(stamps, id) {
  if (!stamps[id]) return stamps;
  const { [id]: _gone, ...rest } = stamps;
  return rest;
}

// Groups spots by municipality: [{ town, spots, collected, total, complete, badge }], towns with the most progress first, then A-Z.
export function groupByTown(spots, stamps) {
  const map = new Map();
  stampable(spots).forEach((s) => {
    const town = s.municipality || 'Other';
    if (!map.has(town)) map.set(town, []);
    map.get(town).push(s);
  });
  return [...map.entries()]
    .map(([town, list]) => {
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
      const collected = sorted.filter((s) => stamps[s._id]).length;
      const total = sorted.length;
      const complete = total > 0 && collected === total;
      return { town, spots: sorted, collected, total, complete, badge: complete && total >= MIN_SPOTS_FOR_BADGE };
    })
    .sort((a, b) => (b.collected / b.total) - (a.collected / a.total) || b.collected - a.collected || a.town.localeCompare(b.town));
}

// Stamps that belong to spots currently in the list (a spot may be unpublished later).
export function countStamps(spots, stamps) {
  return stampable(spots).filter((s) => stamps[s._id]).length;
}

export function rankFor(count) {
  return [...RANKS].reverse().find((r) => count >= r.min) || RANKS[0];
}

// Nearest spot with no stamp yet, or null. Returns { spot, distanceKm }.
export function nextStamp(spots, stamps, origin) {
  if (!origin) return null;
  let best = null;
  stampable(spots).forEach((s) => {
    if (stamps[s._id]) return;
    const p = toLatLng(s);
    if (!p) return;
    const d = distanceKm(origin, p);
    if (!best || d < best.distanceKm) best = { spot: s, distanceKm: d };
  });
  return best;
}

// Plain text for the share button: totals, badges and the list of stamps (newest first).
export function passportToText({ count, total, rankLabel, badgeTowns, stamps }, origin = '') {
  const lines = ['My Leyte Passport', 'SOULEY de Tour', '', `${rankLabel}: ${count} of ${total} stamps`];
  if (badgeTowns.length) lines.push(`Town badges: ${badgeTowns.join(', ')}`);
  lines.push('');
  Object.values(stamps)
    .sort((a, b) => b.at.localeCompare(a.at))
    .forEach((s) => lines.push(`- ${s.name}${s.municipality ? ` (${s.municipality})` : ''}, ${s.at.slice(0, 10)}`));
  if (origin) lines.push('', `${origin}/passport`);
  return lines.join('\n');
}

// "250 m" or "3.4 km" (no "away"; the caller's sentence adds that).
export function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

// Small stable angle (-4..4 degrees) per spot so stamps look hand-pressed but do not jump on re-render.
export function stampTilt(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 9) - 4;
}

// How a stamp looks: its outline shape and ink colour. Stable per spot, so a stamp keeps its own look on every visit.
export const STAMP_SHAPES = ['round', 'scallop', 'octagon', 'rect'];
export const STAMP_INKS = ['#b53f08', '#0e6b7a', '#3d3f94', '#2e6b3b']; // ember, sea teal, indigo, jungle green
export function stampLook(id) {
  let h = 7;
  for (const ch of String(id)) h = (h * 33 + ch.charCodeAt(0)) % 100003;
  return { shape: STAMP_SHAPES[h % STAMP_SHAPES.length], ink: STAMP_INKS[Math.floor(h / 4) % STAMP_INKS.length], seed: h % 97 };
}
