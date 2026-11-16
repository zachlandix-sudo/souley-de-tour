// "Content health": looks at every spot that is not archived and says what is still missing, so the team knows what to fix
// next. Pure functions (no database in here): the controller passes the spots in, which keeps it easy to test.
const WEIGHT = { high: 3, medium: 2, low: 1 };
const MIN_DESCRIPTION = 120; // characters; shorter than this reads as a stub
const SHARED_PIN_AT = 5; // this many spots on one exact pin = a town-centre guess, not the real place
const STALE_DAYS = 30;
// The food import ships a one-line note as the description ("Named restaurant/eatery listing; confirm ..."). That is not text for visitors.
const PLACEHOLDER = /^named\b[^.]*\b(listing|stop|seller|shop)\b|confirm (the )?(current|exact)|needs verification|lorem ipsum|to be (added|written)/i;

const text = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const norm = (v) => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
const num = (v) => typeof v === 'number' && Number.isFinite(v);

function pinOf(s) {
  const c = s && s.location && s.location.coordinates;
  if (!Array.isArray(c) || c.length !== 2 || !num(c[0]) || !num(c[1])) return null;
  if (c[0] === 0 && c[1] === 0) return null; // 0,0 is the "nothing typed" value, not a place in Southern Leyte
  return c;
}
const pinKey = (c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
const isThin = (d) => { const t = text(d); return t.length < MIN_DESCRIPTION || PLACEHOLDER.test(t); };

// fails(spot, ctx) is true when the spot has this problem. ctx = { pins: Map(pinKey -> count), names: Map(name|town -> count) }
const CHECKS = [
  { key: 'noPin', label: 'No map pin', severity: 'high', hint: 'It cannot be shown on the map and gets no travel time. Add its latitude and longitude.', fails: (s) => !pinOf(s) },
  { key: 'thinText', label: 'Description is missing or still a placeholder', severity: 'high', hint: 'Write two or three real sentences visitors can use. Imported notes like "confirm current operation" count as a placeholder.', fails: (s) => isThin(s.description) },
  { key: 'noCategory', label: 'No category', severity: 'medium', hint: 'Without a category it never shows up when visitors filter.', fails: (s) => !(s.categoryIds || []).length },
  { key: 'duplicate', label: 'Possible duplicate', severity: 'medium', hint: 'Another spot has the same name in the same town. Keep one and archive or delete the other.', fails: (s, ctx) => (ctx.names.get(`${norm(s.name)}|${norm(s.municipality)}`) || 0) > 1 },
  { key: 'sharedPin', label: 'Pin shared with many other spots', severity: 'low', hint: `${SHARED_PIN_AT} or more spots sit on exactly the same point, so it is probably the town centre and not the real place.`, fails: (s, ctx) => { const c = pinOf(s); return !!c && (ctx.pins.get(pinKey(c)) || 0) >= SHARED_PIN_AT; } },
  { key: 'onePhoto', label: 'Fewer than two photos', severity: 'low', hint: 'A second photo makes the spot page and the gallery feel finished.', fails: (s) => (s.images || []).filter((i) => text(i)).length < 2 },
  { key: 'noContact', label: 'No phone or email', severity: 'low', hint: 'Visitors cannot reach the place. Add whatever contact you have.', fails: (s) => !text(s.contactPhone) && !text(s.contactEmail) },
  { key: 'noVisitInfo', label: 'No budget, duration or best time', severity: 'low', hint: 'The trip planner uses these. Fill at least one.', fails: (s) => !num(s.estimatedBudget) && !text(s.recommendedDuration) && !text(s.bestTimeToVisit) },
];
const CHECK_KEYS = CHECKS.map((c) => c.key);
const TOTAL_WEIGHT = CHECKS.reduce((n, c) => n + WEIGHT[c.severity], 0);

const brief = (s) => ({ _id: String(s._id), name: s.name, slug: s.slug, municipality: s.municipality, status: s.status });
const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const pack = (list, limit) => { const sorted = [...list].sort(byName); return { count: sorted.length, items: sorted.slice(0, limit).map(brief) }; };

// spots: plain objects (lean). Options: now (ms), limit (items listed per check), only (one check key),
// opportunityLimit (items listed under "ready to publish" / "forgotten drafts": the admin publishes those in one go, so up to 100).
function analyzeSpots(spots = [], { now = Date.now(), limit = 25, only, opportunityLimit = 100 } = {}) {
  const totals = { all: spots.length, published: 0, draft: 0, archived: 0 };
  const live = [];
  for (const s of spots) {
    const st = ['published', 'draft', 'archived'].includes(s.status) ? s.status : 'draft';
    totals[st] += 1;
    if (st !== 'archived') live.push({ ...s, status: st });
  }

  const ctx = { pins: new Map(), names: new Map() };
  for (const s of live) {
    const c = pinOf(s);
    if (c) ctx.pins.set(pinKey(c), (ctx.pins.get(pinKey(c)) || 0) + 1);
    const nk = `${norm(s.name)}|${norm(s.municipality)}`;
    if (norm(s.name)) ctx.names.set(nk, (ctx.names.get(nk) || 0) + 1);
  }

  const hits = Object.fromEntries(CHECK_KEYS.map((k) => [k, []]));
  let scoreSum = 0;
  let scored = 0;
  const readyDrafts = [];
  const staleDrafts = [];
  const staleBefore = now - STALE_DAYS * 86400000;

  for (const s of live) {
    let lost = 0;
    let blocking = false;
    for (const c of CHECKS) {
      if (!c.fails(s, ctx)) continue;
      hits[c.key].push(s);
      lost += WEIGHT[c.severity];
      if (c.severity !== 'low') blocking = true;
    }
    if (s.status === 'published') { scoreSum += 1 - lost / TOTAL_WEIGHT; scored += 1; }
    if (s.status === 'draft') {
      if (!blocking) readyDrafts.push(s);
      const t = s.updatedAt ? new Date(s.updatedAt).getTime() : NaN;
      if (Number.isFinite(t) && t < staleBefore) staleDrafts.push(s);
    }
  }

  const keys = only && CHECK_KEYS.includes(only) ? [only] : CHECK_KEYS;
  return {
    totals,
    scored,
    score: scored ? Math.round((scoreSum / scored) * 100) : null,
    checks: CHECKS.filter((c) => keys.includes(c.key)).map((c) => ({ key: c.key, label: c.label, severity: c.severity, hint: c.hint, ...pack(hits[c.key], limit) })),
    opportunities: {
      readyDrafts: pack(readyDrafts, opportunityLimit),
      staleDrafts: { ...pack(staleDrafts, opportunityLimit), days: STALE_DAYS },
    },
  };
}

module.exports = { analyzeSpots, CHECK_KEYS, CHECKS, PLACEHOLDER, MIN_DESCRIPTION, SHARED_PIN_AT, STALE_DAYS };
