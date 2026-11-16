const TouristSpot = require('../models/TouristSpot');
const Category = require('../models/Category');
const escapeRegex = require('../utils/escapeRegex');
const { chatJSON } = require('./llmClient');
const { normalizeMonths, isOpenOn, inSeason, tripMonths, daysLabel, monthsLabel } = require('../utils/schedule');
const { understand, ACTIVITIES } = require('./intent');
const W = require('./answerWriter');

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'with', 'me', 'my', 'is', 'are', 'what', 'which', 'best', 'good', 'place', 'places', 'near', 'recommend', 'create', 'trip', 'day', 'days', 'two', 'itinerary', 'suitable', 'attractions']);

// Trip planner limits. PACE = sights per day (a meal stop is added on top when food places exist).
const MAX_DAYS = 50;
const PACE = { relaxed: 2, balanced: 3, packed: 4 };
const OFF_SEASON = 6; // an out-of-season place slips back this many ranks (or km, when choosing the next stop)
const LLM_DAYS = 7; // longer trips are laid out by the planner below (the model would run out of room); the model still writes the text
const isFood = (catNames = []) => catNames.some((c) => /food|restaurant|eatery|cafe/i.test(c));

const normalizeSet = (v) => normalizeMonths(v).length > 0;

const keywords = (text = '') =>
  [...new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))];

/**
 * STEP 1 - RETRIEVE from MongoDB. Only published spots. Score by prefs + keywords.
 */
async function retrieveSpots(prefs = {}, limit = 8) {
  const { question = '', municipality, activity, budget, accessibility, travelStyle } = prefs;
  const filter = { status: 'published' };
  if (municipality) filter.municipality = new RegExp(`^${escapeRegex(municipality)}$`, 'i');
  if (budget) filter.$or = [{ estimatedBudget: { $lte: Number(budget) } }, { estimatedBudget: null }, { estimatedBudget: { $exists: false } }];

  const cats = await Category.find({ isActive: true }).lean();
  const catById = new Map(cats.map((c) => [String(c._id), c.name]));
  const spots = await TouristSpot.find(filter).lean();

  const months = tripMonths(prefs.startDate, Math.min(Number(prefs.durationDays) || 1, MAX_DAYS)); // null without a usable start date
  const words = keywords([question, activity, travelStyle].filter(Boolean).join(' '));
  const accWords = keywords(accessibility || '');

  const scored = spots.map((s) => {
    const catNames = (s.categoryIds || []).map((id) => catById.get(String(id))).filter(Boolean);
    const hay = [s.name, s.shortDescription, s.description, s.municipality, s.barangay, ...(s.activities || []), ...catNames].join(' ').toLowerCase();
    let score = 0;
    words.forEach((w) => { if (hay.includes(w)) score += 2; });
    if (activity && hay.includes(activity.toLowerCase())) score += 3;
    if (municipality) score += 1;
    if (accWords.length && accWords.some((w) => (s.accessibility || '').toLowerCase().includes(w))) score += 2;
    if (s.isFeatured) score += 1;
    // in season for the trip dates ranks higher, out of season a little lower (places with no best months are neutral)
    if (months && normalizeSet(s.bestMonths)) score += [...months].some((m) => inSeason(s, m)) ? 1.5 : -1;
    score += (s.averageRating || 0) * 0.4;
    return { spot: s, score, catNames };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// compact record the LLM is allowed to see. nothing else.
const toContext = ({ spot, catNames }) => ({
  id: String(spot._id),
  name: spot.name,
  municipality: spot.municipality,
  categories: catNames,
  shortDescription: spot.shortDescription,
  activities: spot.activities || [],
  entranceFee: spot.entranceFee ?? null,
  estimatedBudget: spot.estimatedBudget ?? null,
  recommendedDuration: spot.recommendedDuration ?? null,
  bestTimeToVisit: spot.bestTimeToVisit ?? null,
  openDays: daysLabel(spot) || 'every day',
  bestMonths: monthsLabel(spot) || 'all year',
  accessibility: spot.accessibility ?? null,
  difficulty: spot.difficulty ?? null,
  rating: spot.averageRating || null,
  coordinates: spot.location?.coordinates ?? null,
  kind: isFood(catNames) ? 'food' : 'spot',
});

const SYSTEM = `You are SOULEY AI, a travel assistant for Southern Leyte, Philippines.
RULES:
- Use ONLY the tourist spot records in CONTEXT. Never invent facts, places, prices, or hours.
- If info is missing in a record, say "not available" for that item.
- Recommend only spot ids that appear in CONTEXT.
- Reply with ONE valid JSON object and nothing else.`;

const callLLM = (messages) => chatJSON(messages);

const prefsText = (p) =>
  `Question: ${p.question}
Dates: ${p.startDate || 'n/a'} to ${p.endDate || 'n/a'} | Travelers: ${p.travelers || 'n/a'} | Budget: ${p.budget || 'n/a'} | Duration(days): ${p.durationDays || 'n/a'} | Pace: ${p.pace || 'balanced'}
Activity: ${p.activity || 'any'} | Municipality: ${p.municipality || 'any'} | Style: ${p.travelStyle || 'any'} | Accessibility: ${p.accessibility || 'none'}`;

// drop anything the model made up
const sanitize = (out, allowed) => {
  const recs = (out.recommendations || [])
    .filter((r) => allowed.has(String(r.spotId)))
    .map((r) => ({ spotId: String(r.spotId), reason: String(r.reason || '').slice(0, 500) }));
  const days = (out.days || []).map((d, i) => ({
    dayNumber: d.dayNumber || i + 1,
    items: (d.items || [])
      .filter((it) => allowed.has(String(it.spotId)))
      .map((it, j) => ({ touristSpotId: String(it.spotId), visitOrder: j + 1, notes: String(it.notes || '').slice(0, 300) })),
  }));
  return { answer: String(out.answer || '').slice(0, 2000), recommendations: recs, days };
};

// distance in km between two [lng, lat] points, or null when one is missing
const km = (a, b) => {
  if (!a || !b || a.length < 2 || b.length < 2) return null;
  const r = Math.PI / 180;
  const h = Math.sin(((b[1] - a[1]) * r) / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(((b[0] - a[0]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const coord = (c) => c.spot.location?.coordinates;
// "how far" for ordering: real km when both have coordinates, otherwise same town (near) vs other town (far)
const near = (from, c) => km(coord(from), coord(c)) ?? (from.spot.municipality === c.spot.municipality ? 5 : 40);

const addDays = (iso, n) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const spotNote = (s, food, month) => {
  const open = daysLabel(s);
  const best = monthsLabel(s);
  const season = month && best ? (inSeason(s, month) ? 'In season.' : `Off season on this date (best ${best}).`) : '';
  if (food) return ['Meal stop.', open ? `Open ${open}.` : 'Confirm opening hours before you go.', season].filter(Boolean).join(' ');
  return [s.recommendedDuration && `Plan about ${s.recommendedDuration}.`, s.bestTimeToVisit && `Best time: ${s.bestTimeToVisit}.`, open && `Open ${open}.`, season].filter(Boolean).join(' ');
};

/**
 * Lays out any number of days (up to 50) from ranked records, no model needed:
 * each day starts at the best remaining place and follows the nearest next one (so a day stays in one area), with one meal stop
 * from the nearest unused food place. It never repeats a place: when the database runs out, the trip is shorter than asked
 * and the reply says so (plan.shortfall).
 */
function planDays(sights, foods, { days, perDay, startDate }) {
  const pool = [...sights];
  const meals = [...foods];
  const out = [];
  for (let d = 0; d < days && pool.length; d += 1) {
    // with a start date each day knows its weekday and month: closed places are skipped, out-of-season ones slip back in the ranking
    const date = startDate ? addDays(startDate, d) : null;
    const when = date ? new Date(date) : null;
    const weekday = when ? when.getUTCDay() : null;
    const month = when ? when.getUTCMonth() + 1 : null;
    const open = (c) => weekday === null || isOpenOn(c.spot, weekday);
    const off = (c) => (month === null || inSeason(c.spot, month) ? 0 : OFF_SEASON);

    let first = -1;
    let firstV = Infinity;
    pool.forEach((c, i) => { if (open(c) && i + off(c) < firstV) { firstV = i + off(c); first = i; } });
    if (first < 0) { out.push({ dayNumber: d + 1, items: [] }); continue; } // everything left is closed today: a rest day, never a closed place
    const stops = [pool.splice(first, 1)[0]];
    while (stops.length < perDay && pool.length) {
      const last = stops[stops.length - 1];
      let best = -1;
      let bestD = Infinity;
      pool.forEach((c, i) => { if (!open(c)) return; const v = near(last, c) + i * 0.3 + off(c); if (v < bestD) { bestD = v; best = i; } });
      if (best < 0) break;
      stops.push(pool.splice(best, 1)[0]);
    }
    const items = stops.map((c) => ({ c, food: false }));
    let meal = -1;
    let mealD = Infinity;
    meals.forEach((c, i) => { if (!open(c)) return; const v = near(stops[0], c) + i * 0.3; if (v < mealD) { mealD = v; meal = i; } });
    if (meal >= 0) items.splice(Math.ceil(items.length / 2), 0, { c: meals.splice(meal, 1)[0], food: true });
    out.push({
      dayNumber: d + 1,
      items: items.map(({ c, food }, j) => ({ touristSpotId: String(c.spot._id), visitOrder: j + 1, notes: spotNote(c.spot, food, month) })),
    });
  }
  // trailing rest days add nothing: the trip ends with the last day that has a stop
  while (out.length && !out[out.length - 1].items.length) out.pop();
  return out;
}

// no key / AI down => still useful, DB-only answer
function fallback(retrieved, prefs, wantItinerary, itin) {
  const top = retrieved.slice(0, 5);
  const recommendations = top.map(({ spot }) => ({
    spotId: String(spot._id),
    reason: `Matches your search. ${spot.shortDescription}`,
  }));
  return {
    answer: top.length ? 'Here are published destinations from our database that best match your request.' : 'No matching destinations found in our database yet.',
    recommendations,
    days: wantItinerary && itin ? planDays(itin.sights, itin.foods, itin) : [],
  };
}

// the small record the Ask page draws as a card (needs spot.__food set by the caller)
const cardOf = (s) => ({
  id: String(s._id), name: s.name, slug: s.slug, municipality: s.municipality, image: s.images?.[0], link: `/spots/${s.slug}`,
  lat: s.location?.coordinates?.[1] ?? null, lng: s.location?.coordinates?.[0] ?? null,
  kind: s.__food ? 'food' : 'spot', cost: s.estimatedBudget ?? null, duration: s.recommendedDuration ?? null,
});

const pickCount = (n, perDay) => Math.min(150, n * perDay + 6);

// adds what the board needs to each day: kind, time of day, cost, date, area, and a day total
function decorate(days, byId, startDate) {
  return days.map((d, di) => {
    const rows = d.items.map((it) => ({ it, s: byId.get(String(it.touristSpotId)) }));
    const half = Math.ceil(rows.filter((r) => !r.s?.__food).length / 2);
    let seen = 0;
    const items = rows.map(({ it, s }) => {
      const food = !!s?.__food;
      if (!food) seen += 1;
      return { ...it, kind: food ? 'food' : 'spot', slot: food ? 'meal' : seen <= half ? 'morning' : 'afternoon', cost: s?.estimatedBudget ?? null };
    });
    const towns = [...new Set(rows.map((r) => r.s?.municipality).filter(Boolean))];
    return {
      ...d,
      items,
      title: towns.slice(0, 2).join(' · '),
      date: startDate ? addDays(startDate, di) : null,
      budget: items.reduce((n, it) => n + (it.cost || 0), 0),
    };
  });
}

const uniq = (list, n) => [...new Set(list.map((x) => String(x).trim()).filter(Boolean))].slice(0, n);

// practical lines taken from the records of the places in the answer, nothing invented
function tipsFor(spots) {
  return {
    bestTime: uniq(spots.map((s) => s.bestTimeToVisit || (monthsLabel(s) && `Best in ${monthsLabel(s)}`)), 3),
    bring: uniq(spots.flatMap((s) => s.whatToBring || []), 8),
    safety: uniq(spots.flatMap((s) => s.safetyTips || []), 6),
  };
}

// the model is told which days a place is open, but it is only told: a place that is closed on its day is removed here
function dropClosed(days, startDate, retrieved) {
  const byId = new Map(retrieved.map(({ spot }) => [String(spot._id), spot]));
  return days.map((d, i) => {
    const date = addDays(startDate, (d.dayNumber || i + 1) - 1);
    if (!date) return d;
    const weekday = new Date(date).getUTCDay();
    const items = d.items.filter((it) => isOpenOn(byId.get(String(it.touristSpotId)), weekday)).map((it, j) => ({ ...it, visitOrder: j + 1 }));
    return { ...d, items };
  });
}

// smart (optional) is built by ask(): it swaps in the question-aware search, answer writer and AI prompt. Without it this is the plain flow.
async function runRecommend(prefs, { wantItinerary = false, smart = null } = {}) {
  const days = Math.max(1, Math.min(Number(prefs.durationDays) || 1, MAX_DAYS));
  const pace = PACE[prefs.pace] ? prefs.pace : 'relaxed';
  const perDay = PACE[pace];
  const startDate = prefs.startDate && !Number.isNaN(new Date(prefs.startDate).getTime()) ? String(prefs.startDate).slice(0, 10) : null;

  // a trip needs a big pool (sights for every day plus meals); a plain recommendation stays at the top 8
  const all = smart ? await smart.retrieve(wantItinerary) : await retrieveSpots(prefs, wantItinerary ? 400 : 8);
  const fallbackFn = smart ? smart.fallback : fallback;
  let retrieved = all;
  let itin = null;
  if (wantItinerary) {
    // a food trail uses the food places as the stops themselves; otherwise sights are the stops and food places are the meals
    const sights = (smart?.foodTrail ? all : all.filter((c) => !isFood(c.catNames))).slice(0, pickCount(days, perDay));
    // a few spare meal places: some may be closed on the day they would be used
    const foods = smart?.foodTrail ? [] : all.filter((c) => isFood(c.catNames)).slice(0, Math.min(days * 3 + 4, 150));
    itin = { sights, foods, days, perDay, startDate };
    retrieved = [...sights, ...foods];
  }
  const allowed = new Set(retrieved.map(({ spot }) => String(spot._id)));
  let result;
  let aiUsed = false;

  if (!retrieved.length) {
    result = { answer: smart ? smart.empty : 'No matching destinations found in our database yet.', recommendations: [], days: [] };
  } else if (!process.env.AI_API_KEY) {
    result = fallbackFn(retrieved, prefs, wantItinerary, itin);
  } else {
    try {
      const llmDays = wantItinerary && days <= LLM_DAYS;
      const shape = llmDays
        ? '{"answer":string,"recommendations":[{"spotId":string,"reason":string}],"days":[{"dayNumber":number,"items":[{"spotId":string,"notes":string}]}]}'
        : '{"answer":string,"recommendations":[{"spotId":string,"reason":string}],"days":[]}';
      const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dateLine = llmDays && startDate
        ? `\nTrip dates: ${Array.from({ length: days }, (_, i) => { const dt = addDays(startDate, i); return `Day ${i + 1} = ${dt} (${WD[new Date(dt).getUTCDay()]})`; }).join(', ')}. Only put a place on a day it is open (openDays) and prefer places whose bestMonths include that month.`
        : '';
      // the model sees at most 40 records: the best sights, plus a few meal places
      const ctx = wantItinerary ? [...itin.sights.slice(0, 32), ...itin.foods.slice(0, 8)] : retrieved;
      const out = await callLLM([
        { role: 'system', content: smart ? smart.system : SYSTEM },
        { role: 'user', content: `${prefsText(prefs)}${smart ? smart.promptExtra : ''}\n\nTask: ${wantItinerary ? `Build a day-by-day itinerary (${perDay} places per day${llmDays ? ', plus one record with kind "food" as the meal stop of each day when available' : '; the app lays out the days itself, so return an empty days list and write the answer as a short overview of the trip'})` : 'Recommend destinations'} and explain why.${dateLine}\nJSON shape: ${shape}\n\nCONTEXT:\n${JSON.stringify(ctx.map(toContext))}` },
      ]);
      result = sanitize(out, allowed);
      if (llmDays && startDate) result.days = dropClosed(result.days, startDate, retrieved);
      aiUsed = true;
      if (!result.recommendations.length) result = fallbackFn(retrieved, prefs, wantItinerary, itin);
      else if (wantItinerary && !result.days.some((d) => d.items.length)) result.days = planDays(itin.sights, itin.foods, itin);
    } catch (err) {
      console.error('AI error, using fallback:', err.message);
      result = fallbackFn(retrieved, prefs, wantItinerary, itin);
    }
  }

  const byId = new Map(retrieved.map(({ spot, catNames }) => [String(spot._id), Object.assign(spot, { __food: isFood(catNames) })]));
  const card = (id) => { const s = byId.get(id); return s && cardOf(s); };
  const finalDays = decorate(result.days, byId, startDate);
  const used = [...new Set([...result.recommendations.map((r) => r.spotId), ...finalDays.flatMap((d) => d.items.map((it) => it.touristSpotId))])];
  const out = {
    ...result,
    days: finalDays,
    recommendations: result.recommendations.map((r) => ({ ...r, spot: card(r.spotId) })),
    places: used.map(card).filter(Boolean),
    tips: tipsFor(used.map((id) => byId.get(id)).filter(Boolean)),
    aiUsed,
  };
  if (wantItinerary) {
    const total = finalDays.reduce((n, d) => n + d.budget, 0);
    out.plan = {
      requestedDays: days, plannedDays: finalDays.length, pace, perDay, startDate,
      endDate: startDate && finalDays.length ? addDays(startDate, finalDays.length - 1) : null,
      totalBudget: total, shortfall: finalDays.length < days,
      restDays: finalDays.filter((d) => !d.items.length).length, // days where every remaining place was closed
    };
  }
  return out;
}

// =====================================================================================================================
// ASK: answers a visitor's question by understanding it first (intent.js), then searching, then writing (answerWriter.js).
// Works with no AI key. With a key, the model still writes the recommendation text, but is told what was understood.
// =====================================================================================================================
const HUB = { name: 'Maasin City', coords: [124.846, 10.1335] }; // [lng, lat] of the city proper, the usual starting point
const ACT_WORDS = new Map(ACTIVITIES.map(([key, , words]) => [key, words]));
const sameTown = (a, b) => String(a || '').toLowerCase().replace(/ city$/, '') === String(b || '').toLowerCase().replace(/ city$/, '');
const round1 = (n) => Math.round(n * 10) / 10;

// what the page sends about the chat so far: the last question, the places it showed (so "how much is it?" works), and the trip length
function cleanCtx(c) {
  if (!c || typeof c !== 'object') return { q: '', ids: [], days: null };
  const ids = Array.isArray(c.ids) ? c.ids.map((x) => String(x).slice(0, 64)).filter(Boolean).slice(0, 8) : [];
  const days = Number.isInteger(Number(c.days)) && Number(c.days) >= 1 ? Math.min(MAX_DAYS, Number(c.days)) : null;
  return { q: String(c.q || '').slice(0, 300), ids, days };
}

// "cheaper ones", "what about Silago?", "make it 3 days", "show me more": the new question only changes part of the last one
function isRefinement(u) {
  if (u.named.length || u.smalltalk || u.factAsk || u.compare || u.anaphora || u.ordinals.length) return false;
  if (/^(what about|how about|and|or|also|make it|more|what else|anything else|show me|any|ano naman|unsa pa|paano naman|ano pa)\b/.test(u.plain)) return true;
  if (u.subjectless && u.wordCount <= 8 && (u.cheap || u.budget !== null || u.difficulty || u.pace || u.groups.length || u.month || u.rank || u.count || u.more)) return true;
  return !u.trip ? false : u.wordCount <= 6 && !u.activities.length && !u.towns.length && !u.food;
}
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== false);
function overlay(prev, cur, ctx) {
  const base = { ...prev, trip: prev.trip || ctx.days != null, days: prev.days ?? ctx.days };
  const out = { ...cur, refined: true };
  ['towns', 'municipality', 'areas', 'areaTowns', 'activities', 'groups', 'food', 'foodKind', 'difficulty', 'month', 'trip', 'days', 'pace', 'budget', 'travelers', 'accessibility', 'rank', 'count'].forEach((k) => {
    if (!filled(cur[k])) out[k] = base[k];
  });
  if (cur.towns.length) out.municipality = cur.towns.length === 1 ? cur.towns[0] : null;
  out.cheap = cur.cheap || (!cur.budget && base.cheap);
  out.words = [...new Set(out.activities.flatMap((a) => ACT_WORDS.get(a) || []))];
  out.subjectless = false;
  return out;
}

// the facts about a place that the writer may use. Nothing here is invented: every field is from the record or missing.
function factsOf(r, extra = {}) {
  const sp = r.spot;
  const c = sp.location?.coordinates;
  const h = sp.openingHours instanceof Map ? Object.fromEntries(sp.openingHours) : sp.openingHours;
  return {
    id: String(sp._id), name: sp.name, town: sp.municipality, barangay: sp.barangay || '', address: sp.address || '',
    short: sp.shortDescription || sp.description || '', description: sp.description || '', kind: r.food ? 'food' : 'spot', entryType: sp.entryType || '',
    activities: sp.activities || [], fee: sp.entranceFee || null, budget: sp.estimatedBudget ?? null,
    duration: sp.recommendedDuration || null, bestTime: sp.bestTimeToVisit || null, openDays: daysLabel(sp), bestMonths: monthsLabel(sp),
    hours: h && Object.keys(h).length ? Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('; ') : '',
    difficulty: r.food ? null : sp.difficulty || null, accessibility: sp.accessibility || null,
    bring: sp.whatToBring || [], safety: sp.safetyTips || [],
    contact: { name: sp.contactName, phone: sp.contactPhone, email: sp.contactEmail },
    lat: c?.[1] ?? null, lng: c?.[0] ?? null, rating: sp.averageRating || null, hits: [], km: null, kmFrom: null, ...extra,
  };
}

const keyWords = (text) => keywords(text).filter((w) => !/^\d+$/.test(w) && !['under', 'below', 'budget', 'days', 'with', 'around', 'much', 'how', 'where', 'can', 'there', 'from', 'about', 'will', 'would', 'need', 'want', 'find', 'show', 'tell'].includes(w));

/**
 * Scores every published place against what was understood. Returns [{ spot, catNames, food, score, hits }], best first.
 *   kind: 'sight' (not food), 'food', or 'any'
 */
function rankSmart(records, p) {
  const { u, budget, months, exclude, kind } = p;
  const words = keyWords(u.plain).filter((w) => !u.towns.some((t) => t.toLowerCase().includes(w)));
  const wantEasy = u.difficulty === 'easy' || u.groups.some((g) => ['family', 'senior', 'pwd'].includes(g)) || u.accessibility;
  const list = records
    .filter((r) => (kind === 'any' || (kind === 'food') === r.food) && !(exclude && exclude.has(String(r.spot._id))))
    .filter((r) => budget == null || r.spot.estimatedBudget == null || r.spot.estimatedBudget <= budget)
    .map((r) => {
      const sp = r.spot;
      const hay = [sp.name, sp.shortDescription, sp.description, sp.municipality, sp.barangay, sp.address, sp.entryType, ...(sp.activities || []), ...r.catNames].join(' ').toLowerCase();
      const hits = u.activities.filter((a) => (ACT_WORDS.get(a) || []).some((w) => hay.includes(w)));
      let score = hits.length * 6;
      words.forEach((w) => { if (hay.includes(w)) score += 1; });
      if (u.food && u.foodKind && (sp.entryType || '').includes(u.foodKind)) score += 4;
      if (u.areaTowns.some((t) => sameTown(t, sp.municipality))) score += 2;
      if (wantEasy) { if (sp.difficulty === 'easy') score += 2; else if (sp.difficulty === 'hard') score -= 3; if (sp.accessibility) score += 1; }
      if (u.difficulty && u.difficulty !== 'easy' && sp.difficulty === u.difficulty) score += 3;
      if (u.groups.includes('family') && /picnic|swim|family|beach/.test(hay)) score += 1;
      if (u.groups.includes('couple') && /sunset|relax|quiet|romantic|view/.test(hay)) score += 1;
      if (months && normalizeSet(sp.bestMonths)) score += [...months].some((m) => inSeason(sp, m)) ? 1.5 : -1;
      if (u.cheap || u.rank === 'cheap') score += sp.estimatedBudget == null ? 1 : 3 - Math.min(3, sp.estimatedBudget / 500);
      if (u.rank === 'best') score += (sp.isFeatured ? 2 : 0) + (sp.averageRating || 0);
      if (u.rank === 'hidden') score += sp.isFeatured ? -1 : 1;
      if (sp.isFeatured) score += 1;
      score += (sp.averageRating || 0) * 0.4;
      return { spot: sp, catNames: r.catNames, food: r.food, score, hits };
    });
  return list.sort((a, b) => b.score - a.score);
}

// town rules: stay in the town asked for; if it has nothing for the activity, say so and look elsewhere
function applyTown(list, u) {
  if (!u.towns.length) return { list, relaxed: {} };
  const inTown = list.filter((r) => u.towns.some((t) => sameTown(t, r.spot.municipality)));
  if (!inTown.length) return { list, relaxed: { town: u.towns[0] } };
  if (u.activities.length && !inTown.some((r) => r.hits.length) && list.some((r) => r.hits.length)) return { list, relaxed: { act: true, town: u.towns[0] } };
  return { list: inTown, relaxed: {} };
}

const unique = (arr) => [...new Set(arr)];

async function ask(prefs, { forceTrip = false } = {}) {
  const question = String(prefs.question || '').trim();
  const [cats, spots] = await Promise.all([Category.find({ isActive: true }).lean(), TouristSpot.find({ status: 'published' }).lean()]);
  const catById = new Map(cats.map((c) => [String(c._id), c.name]));
  const records = spots.map((spot) => {
    const catNames = (spot.categoryIds || []).map((id) => catById.get(String(id))).filter(Boolean);
    return { spot, catNames, food: isFood(catNames) };
  });
  const byId = new Map(records.map((r) => [String(r.spot._id), r]));
  // some records only say "Southern Leyte" (the province): that is not a town a visitor can ask for
  const towns = unique(records.map((r) => r.spot.municipality).filter((m) => m && !/^southern leyte$/i.test(m)));
  const names = records.map((r) => ({ id: String(r.spot._id), name: r.spot.name }));
  // Data-quality guards. (1) Many places share one pin (the town centre), so a distance or a "directions" pin from it would mislead.
  // (2) The spot model fills in "Free" and "easy" for every place nobody edited; when nearly all places say that, it is a default, not a fact.
  const pinCount = new Map();
  const pin = (r) => { const c = r.spot.location?.coordinates; return c && c.length === 2 ? `${Number(c[0]).toFixed(4)},${Number(c[1]).toFixed(4)}` : null; };
  records.forEach((r) => { const k = pin(r); if (k) pinCount.set(k, (pinCount.get(k) || 0) + 1); });
  const approx = (r) => { const k = pin(r); return !k || pinCount.get(k) >= 3; };
  const sights = records.filter((r) => !r.food);
  const share = (fn) => (sights.length >= 10 ? sights.filter(fn).length / sights.length : 0);
  const defaultFee = share((r) => r.spot.entranceFee === 'Free' && r.spot.estimatedBudget == null) >= 0.9;
  const defaultDiff = share((r) => (r.spot.difficulty || 'easy') === 'easy') >= 0.9;
  // the AI must not be handed a default as a fact either
  records.forEach(({ spot }) => {
    if (defaultFee && spot.entranceFee === 'Free' && spot.estimatedBudget == null) delete spot.entranceFee;
    if (defaultDiff && (spot.difficulty || 'easy') === 'easy') delete spot.difficulty;
  });
  const facts = (r, extra = {}) => {
    const f = factsOf(r, { approx: approx(r), ...extra });
    if (defaultFee && f.fee === 'Free' && f.budget == null) f.fee = null;
    if (defaultDiff && f.difficulty === 'easy') f.difficulty = null;
    return f;
  };
  const ctx = cleanCtx(prefs.ctx);
  const ctxRecords = ctx.ids.map((id) => byId.get(id)).filter(Boolean);
  const hasContext = ctxRecords.length > 0 || !!ctx.q;

  let u = understand(question, { towns, names, hasContext });
  if (hasContext && ctx.q && isRefinement(u)) u = overlay(understand(ctx.q, { towns, names, hasContext: false }), u, ctx);
  const lang = u.lang;

  // a finished answer that did not need the trip/list machinery
  const early = (intent, answer, picks, extra = {}) => {
    const recs = picks.map((f) => ({ spotId: f.id, reason: f.reason || '', spot: cardOf(Object.assign(byId.get(f.id).spot, { __food: byId.get(f.id).food })) }));
    const used = picks.map((f) => byId.get(f.id).spot);
    return {
      answer: String(answer).slice(0, 2000), recommendations: recs, days: [], places: recs.map((r) => r.spot), tips: tipsFor(used), aiUsed: false,
      engine: 'smart', intent, lang, chips: extra.chips || [], suggestions: extra.suggestions || [],
    };
  };
  const withReason = (r, reasonFn) => { const f = facts(r); f.reason = reasonFn ? reasonFn(f) : ''; return f; };

  // 1. chat: greetings, thanks, "who are you", things outside Southern Leyte
  if (u.smalltalk) return early('chat', W.chat(u.smalltalk, lang), [], { suggestions: u.smalltalk === 'bye' ? [] : W.samples(lang) });
  if (u.unclear) {
    const favourites = records.filter((r) => !r.food).sort((a, b) => (b.spot.isFeatured ? 1 : 0) - (a.spot.isFeatured ? 1 : 0) || (b.spot.averageRating || 0) - (a.spot.averageRating || 0)).slice(0, 3);
    return early('chat', W.chat('unclear', lang), favourites.map((r) => withReason(r, (f) => W.firstSentence(f.short, 150))), { suggestions: W.samples(lang) });
  }

  // 2. where to stay: there are no hotel records, so say that and offer what the records do mention
  if (u.asks.includes('stay') && !u.named.length) {
    const stay = records.filter((r) => !r.food && /overnight|camp|resort|cottage|lodg|homestay|stay/i.test([r.spot.name, r.spot.description, ...(r.spot.activities || [])].join(' '))).slice(0, 4);
    const picks = stay.map((r) => withReason(r, (f) => W.firstSentence(f.short, 150)));
    return early('facts', W.stayAnswer({ lang, picks }), picks, { chips: W.chips(u, lang), suggestions: W.samples(lang).slice(0, 3) });
  }

  // 3. a question about particular places: "how much is Tinago Falls?", "how much is it?" (after an answer), "compare them"
  let focus = u.named.map((n) => byId.get(n.id)).filter(Boolean);
  const pointsBack = u.anaphora || (hasContext && u.subjectless && (u.factAsk || u.compare || u.asks.includes('nearby')));
  if (!focus.length && pointsBack && ctxRecords.length) {
    focus = u.ordinals.length ? unique(u.ordinals.map((i) => ctxRecords.at(i)).filter(Boolean)) : ctxRecords.slice(0, u.compare ? 2 : 4);
  }
  const planner = forceTrip && !u.factAsk && !u.compare;
  if (focus.length && !planner && !u.trip) {
    const nearby = u.asks.includes('nearby') && u.asks.every((a) => a === 'nearby' || a === 'about');
    const originRecs = u.origin ? records.filter((r) => sameTown(r.spot.municipality, u.origin) && r.spot.location?.coordinates?.length === 2) : [];
    const origin = originRecs.length
      ? { name: u.origin, coords: [originRecs.reduce((n, r) => n + r.spot.location.coordinates[0], 0) / originRecs.length, originRecs.reduce((n, r) => n + r.spot.location.coordinates[1], 0) / originRecs.length] }
      : HUB;
    const dist = (r) => { const d = km(origin.coords, r.spot.location?.coordinates); return d == null ? null : round1(d); };
    if (u.compare && focus.length >= 2) {
      const picks = focus.slice(0, 2).map((r) => withReason(r));
      return early('compare', W.compareAnswer({ lang, spots: picks }), picks, { chips: W.chips(u, lang), suggestions: W.suggestions({ lang, kind: 'facts', spots: picks, u }) });
    }
    if (nearby) {
      const base = focus[0];
      const bc = base.spot.location?.coordinates;
      const precise = !approx(base);
      let near;
      if (precise) {
        near = records.filter((r) => r !== base && r.food === u.food && !approx(r))
          .map((r) => ({ r, d: km(bc, r.spot.location.coordinates) })).sort((a, b) => a.d - b.d).slice(0, 5);
      } else {
        // the stored pin is only the town centre: say so, and offer the other places of the same town
        near = records.filter((r) => r !== base && r.food === u.food && sameTown(r.spot.municipality, base.spot.municipality))
          .sort((a, b) => (b.spot.isFeatured ? 1 : 0) - (a.spot.isFeatured ? 1 : 0)).slice(0, 5).map((r) => ({ r, d: null }));
      }
      const picks = near.map(({ r, d }) => Object.assign(withReason(r, (f) => W.firstSentence(f.short, 140)), { km: d == null ? null : round1(d) }));
      return early('nearby', W.nearbyAnswer({ lang, base: { name: base.spot.name, town: base.spot.municipality }, picks, townOnly: !precise }), picks, { chips: W.chips({ ...u, towns: [], municipality: null }, lang), suggestions: W.suggestions({ lang, kind: 'places', spots: picks, u }) });
    }
    const asks = u.asks.filter((a) => a !== 'nearby');
    const picks = focus.slice(0, 4).map((r) => { const f = facts(r); f.km = f.approx ? null : dist(r); f.kmFrom = origin.name; return f; });
    const text = W.factsAnswer({ lang, spots: picks, asks: asks.length ? asks : ['about'] });
    picks.forEach((f) => { f.reason = W.reasonFor(f, { ...u, asks: asks.length ? asks : ['about'] }, lang); });
    return early('facts', text, picks, { chips: W.chips(u.named.length ? { ...u, towns: [], municipality: null } : u, lang, { facts: asks.length ? asks : ['about'] }), suggestions: W.suggestions({ lang, kind: 'facts', spots: picks, u, town: u.municipality }) });
  }

  // 4. everything else: a list of places, or a day-by-day trip
  const trip = !!(forceTrip || u.trip);
  const num = (v) => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const days = Math.max(1, Math.min(num(prefs.durationDays) ?? u.days ?? 2, MAX_DAYS));
  const pace = PACE[prefs.pace] ? prefs.pace : (u.pace || 'relaxed');
  const budget = num(prefs.budget) ?? u.budget;
  const given = prefs.startDate || u.startDate;
  const startDate = given && !Number.isNaN(new Date(given).getTime()) ? String(given).slice(0, 10) : null;
  const months = startDate ? tripMonths(startDate, days) : (u.month ? new Set([u.month]) : null);
  const exclude = u.more && ctxRecords.length ? new Set(ctx.ids) : null;
  const state = { relaxed: {} };
  const count = u.count || 5;

  const retrieve = (wantTrip) => {
    const base = { u, budget, months, exclude };
    let list;
    if (wantTrip) list = rankSmart(records, { ...base, kind: u.food ? 'food' : 'any' }); // a food trail is made of food places
    else {
      list = rankSmart(records, { ...base, kind: u.food ? 'food' : 'sight' });
      if (!list.length) list = rankSmart(records, { ...base, kind: 'any' });
    }
    const t = applyTown(list, u);
    state.relaxed = t.relaxed;
    return t.list.slice(0, wantTrip ? 400 : Math.max(8, count));
  };

  const picksOf = (rows) => rows.map((r) => facts(r, { hits: r.hits }));
  const fallbackSmart = (retrieved, _prefs, wantItinerary, itin) => {
    if (wantItinerary && itin) {
      const planned = planDays(itin.sights, itin.foods, itin);
      const stops = (d) => d.items.map((it) => { const r = byId.get(String(it.touristSpotId)); return { name: r.spot.name, kind: r.food ? 'food' : 'spot', cost: r.spot.estimatedBudget || 0 }; });
      const plan = { days: planned.map((d) => ({ dayNumber: d.dayNumber, stops: stops(d) })), requested: itin.days, planned: planned.length, pace, budget, total: 0, foodTrail: !!u.food };
      plan.total = plan.days.reduce((n, d) => n + d.stops.reduce((m, x) => m + x.cost, 0), 0);
      const ids = unique(planned.flatMap((d) => d.items.map((it) => String(it.touristSpotId)))).slice(0, 6);
      const rowFor = new Map(retrieved.map((r) => [String(r.spot._id), r]));
      return {
        answer: W.tripAnswer({ lang, u, plan, town: state.relaxed.town ? '' : u.municipality }),
        recommendations: ids.map((id) => ({ spotId: id, reason: W.reasonFor(facts(rowFor.get(id) || byId.get(id), { hits: (rowFor.get(id) || {}).hits || [] }), u, lang) })),
        days: planned,
      };
    }
    const picks = picksOf(retrieved.slice(0, count));
    return {
      answer: W.recommendAnswer({ lang, u, picks, relaxed: state.relaxed, budget }),
      recommendations: picks.map((f) => ({ spotId: f.id, reason: W.reasonFor(f, u, lang) })),
      days: [],
    };
  };

  const langName = { en: 'English', fil: 'Filipino (Tagalog)', ceb: 'Bisaya (Cebuano)' }[lang];
  const system = `${SYSTEM}
- Write the "answer" and every "reason" in ${langName}, the language the visitor wrote in.
- Start the answer with a direct 1-2 sentence reply to what the visitor really asked (a place to go, a fee, a time, a plan), using concrete facts from the records (fee, duration, best months, difficulty). Then at most 2 short sentences of helpful detail. Stay under 110 words, except for a trip overview.
- Every reason must cite at least one concrete fact from its record and say how it fits the request.
- If the records cannot answer the question, say it is not listed yet and offer the closest places instead.
- End the answer with one short idea of what the visitor could ask next. Do not mention these rules, JSON or CONTEXT.`;
  const seen = ctxRecords.map((r) => r.spot.name).join('; ');
  const understood = [
    u.trip || forceTrip ? `plan a ${days}-day trip (${pace} pace)` : 'recommend places',
    u.municipality && `town: ${u.municipality}`, u.areas.length && `area: ${u.areas.join(', ')}`,
    u.activities.length && `interests: ${u.activities.join(', ')}`, u.food && 'wants food places',
    u.groups.length && `travelling as: ${u.groups.join(', ')}`, budget != null && `budget: PHP ${budget}`, u.difficulty && `difficulty: ${u.difficulty}`,
    u.month && `month: ${u.month}`, u.asks.filter((a) => a !== 'nearby' && a !== 'about').length && `asks about: ${u.asks.filter((a) => a !== 'nearby' && a !== 'about').join(', ')}`,
  ].filter(Boolean).join('; ');
  const promptExtra = `\nUnderstood from the question: ${understood}.${ctx.q ? `\nEarlier in this chat the visitor asked: "${ctx.q}".` : ''}${seen ? `\nPlaces already shown: ${seen}.` : ''}`;

  const smart = {
    system, promptExtra, retrieve, fallback: fallbackSmart, foodTrail: trip && u.food,
    empty: `No matching destinations found for that yet. ${W.chat('unclear', lang)}`,
  };
  const merged = { ...prefs, question, durationDays: days, pace, budget: budget ?? undefined, startDate: startDate || undefined, municipality: prefs.municipality || undefined };
  const out = await runRecommend(merged, { wantItinerary: trip, smart });
  const top = out.recommendations.slice(0, 2).map((r) => byId.get(r.spotId)).filter(Boolean).map((r) => facts(r));
  return {
    ...out,
    engine: 'smart', intent: trip ? 'trip' : 'places', lang,
    chips: W.chips(u, lang, { mode: trip ? 'trip' : '', days: trip ? days : null, pace: trip ? pace : null, budget }),
    suggestions: W.suggestions({ lang, kind: trip ? 'trip' : 'places', spots: top, u, town: u.municipality }),
  };
}

// recommend(prefs): the plain flow (the caller picks list or trip).  recommend(prefs, { auto: true }): reads the question first,
// so it can switch to a trip, filter by town, activity, budget, answer facts about a named place, and reply in the visitor's language.
const recommend = (prefs, opts = {}) => (opts.auto ? ask(prefs, { forceTrip: !!opts.wantItinerary }) : runRecommend(prefs, opts));

module.exports = { recommend, ask, planDays, MAX_DAYS };
