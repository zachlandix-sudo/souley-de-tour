// Leyte Passport on the server: the pure helpers (no database), so they can be tested on their own.
const MAX_STAMPS = 500; // far more than the number of spots on the site; stops a runaway client
const PASSPORT_COLORS = ['black', 'navy', 'green', 'burgundy']; // cover colours the visitor can choose
const METHODS = ['gps', 'manual'];
const SKEW_MS = 5 * 60 * 1000; // a phone clock may run a little ahead

const idOf = (v) => String(v && v._id ? v._id : v);

// A date that is valid and not in the future (otherwise `now`).
function safeDate(value, now = new Date()) {
  const d = value ? new Date(value) : now;
  if (Number.isNaN(d.getTime())) return now;
  return d.getTime() > now.getTime() + SKEW_MS ? now : d;
}

// Merge `incoming` ([{ spot, at, method }]) into `existing` (the stamps already on the account).
// - only spots in `validIds` (a Set of id strings, the published ones) can be added
// - a spot already stamped keeps its stamp, but if the incoming date is earlier the earlier visit wins
// - the passport never holds more than `max` stamps
// Returns { stamps, added } and never changes its arguments.
function mergeStamps(existing, incoming, validIds, { now = new Date(), max = MAX_STAMPS } = {}) {
  const out = (existing || []).map((s) => ({ spot: s.spot, at: s.at, method: s.method }));
  const index = new Map(out.map((s, i) => [idOf(s.spot), i]));
  let added = 0;
  for (const item of incoming || []) {
    const id = idOf(item && item.spot);
    if (!validIds.has(id)) continue;
    const at = safeDate(item.at, now);
    const method = METHODS.includes(item.method) ? item.method : 'gps';
    if (index.has(id)) {
      const cur = out[index.get(id)];
      if (at.getTime() < new Date(cur.at).getTime()) { cur.at = at; cur.method = method; }
      continue;
    }
    if (out.length >= max) break;
    index.set(id, out.length);
    out.push({ spot: item.spot, at, method });
    added += 1;
  }
  return { stamps: out, added };
}

// What the client receives: a flat list with the spot's name, town and slug filled in (stamps whose spot was deleted are skipped).
// `stamps` must have `spot` populated.
function toClientStamps(stamps) {
  return (stamps || [])
    .filter((s) => s && s.spot && s.spot._id)
    .map((s) => ({
      spot: String(s.spot._id),
      at: new Date(s.at).toISOString(),
      method: s.method === 'manual' ? 'manual' : 'gps',
      name: s.spot.name,
      municipality: s.spot.municipality || '',
      slug: s.spot.slug || '',
    }));
}

module.exports = { MAX_STAMPS, PASSPORT_COLORS, METHODS, safeDate, mergeStamps, toClientStamps };
