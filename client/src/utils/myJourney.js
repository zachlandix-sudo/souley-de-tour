// Rules for the visitor's own page (/journey). No React in here, so every rule is easy to test.

export const greetingKey = (hour) => (hour < 12 ? 'journey.hi.morning' : hour < 18 ? 'journey.hi.afternoon' : 'journey.hi.evening');
export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const DAY = 86400000;
// A calendar day as a number. A trip date arrives as UTC midnight ("2026-12-01"), so read its UTC parts; "today" is the visitor's local day.
const dayOfDate = (d) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
const dayOfNow = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime());

// Where a trip is on the calendar: { state: 'open' } (no date), { state: 'soon', days }, { state: 'now' } or { state: 'past' }.
export function tripWhen(trip, now = new Date()) {
  const start = trip?.startDate ? new Date(trip.startDate) : null;
  if (!valid(start)) return { state: 'open' };
  const endRaw = trip.endDate ? new Date(trip.endDate) : null;
  const s = dayOfDate(start);
  const e = valid(endRaw) ? Math.max(s, dayOfDate(endRaw)) : s;
  const today = dayOfNow(now);
  if (today < s) return { state: 'soon', days: s - today };
  if (today <= e) return { state: 'now' };
  return { state: 'past' };
}

// The trip to show first: one happening now, else the one starting soonest. null when nothing is coming up.
export function upcomingTrip(trips, now = new Date()) {
  let best = null;
  (trips || []).forEach((trip) => {
    const w = tripWhen(trip, now);
    if (w.state === 'past' || w.state === 'open') return;
    const rank = w.state === 'now' ? -1 : w.days;
    if (!best || rank < best.rank) best = { trip, when: w, rank };
  });
  return best ? { trip: best.trip, when: best.when } : null;
}

// How long ago, as a translation key and a number: today, yesterday or "n days ago" (then a plain date, which the page formats).
export function ago(iso, now = new Date()) {
  const d = iso ? new Date(iso) : null;
  if (!valid(d)) return null;
  const n = dayOfNow(now) - dayOfNow(d);
  if (n <= 0) return { key: 'journey.when.today', n: 0 };
  if (n === 1) return { key: 'journey.when.yesterday', n: 1 };
  if (n < 14) return { key: 'journey.when.daysAgo', n };
  return { key: null, n };
}

// Newest stamps first: [{ id, name, municipality, slug, at }]. `stamps` is the passport map { [spotId]: { at, name, municipality, slug } }.
export function recentStamps(stamps, limit = 4) {
  return Object.entries(stamps || {})
    .map(([id, s]) => ({ id, name: s.name, municipality: s.municipality || '', slug: s.slug || '', at: s.at || '' }))
    .filter((s) => s.name)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

// The newest stamped spot the visitor has not reviewed yet (a spot has to have a page to link to), or null.
export function unreviewedStamp(stamps, reviewedIds = []) {
  const done = new Set((reviewedIds || []).map(String));
  return recentStamps(stamps, Infinity).find((s) => s.slug && !done.has(String(s.id))) || null;
}

// Towns with the most progress, from groupByTown(): [{ town, collected, total, pct, badge }]. Towns without a stamp are left out.
export function townProgress(groups, limit = 5) {
  return (groups || [])
    .filter((g) => g.collected > 0)
    .slice(0, limit)
    .map((g) => ({ town: g.town, collected: g.collected, total: g.total, pct: g.total ? Math.round((g.collected / g.total) * 100) : 0, badge: !!g.badge }));
}

// The one thing worth doing next, as { id, to, vars }. The page turns `id` into words (journey.next.<id>.*).
// Order: a trip about to start, then the cheapest way into the site for someone new, then the next small step.
export function nextStep({ stamps = 0, saved = 0, trips = 0, asks = 0, food = 0, soon = null, unreviewed = null } = {}) {
  if (soon?.when?.state === 'now') return { id: 'tripNow', to: '/trips', vars: { name: soon.trip.title } };
  if (soon?.when?.state === 'soon' && soon.when.days <= 7) return { id: 'tripSoon', to: '/trips', vars: { name: soon.trip.title, n: soon.when.days } };
  if (trips === 0 && asks === 0) return { id: 'ask', to: '/ask', vars: {} };
  if (stamps === 0) return { id: 'stamp', to: '/passport', vars: {} };
  if (unreviewed) return { id: 'review', to: `/spots/${unreviewed.slug}`, vars: { name: unreviewed.name } };
  if (saved === 0) return { id: 'save', to: '/spots', vars: {} };
  if (trips === 0) return { id: 'plan', to: '/ask', vars: {} };
  if (food === 0) return { id: 'food', to: '/food', vars: {} };
  return { id: 'explore', to: '/experience', vars: {} };
}

// "Review.status" -> the colour family of its small tag.
export const REVIEW_TONE = { approved: 'ok', pending: 'warn', rejected: 'bad' };
