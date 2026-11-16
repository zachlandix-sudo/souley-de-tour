'use strict';

// Pure helpers for the admin statistics (no database, no framework): time buckets, filling the gaps with zeros and
// grouping small slices. Kept apart from the service so they can be tested without MongoDB.

const RANGES = Object.freeze({
  '7d': { unit: 'day', count: 7 },
  '30d': { unit: 'day', count: 30 },
  '90d': { unit: 'day', count: 90 },
  '12m': { unit: 'month', count: 12 },
});
const DEFAULT_RANGE = '30d';
const DEFAULT_TZ = 'Asia/Manila'; // Southern Leyte; override with STATS_TIMEZONE in server/.env
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

// undefined / '' -> the default; a known key -> itself; anything else (also arrays) -> null
function parseRange(value) {
  if (value === undefined || value === '') return DEFAULT_RANGE;
  return typeof value === 'string' && Object.hasOwn(RANGES, value) ? value : null;
}

function validTimeZone(tz) {
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return true; } catch { return false; }
}
const resolveTimeZone = (tz) => (tz && validTimeZone(tz) ? tz : DEFAULT_TZ);

// 'YYYY-MM-DD' for an instant, as the calendar reads in that time zone
function dayKey(date, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// The buckets of a range, oldest first, ending with the current day / month in tz.
// `since` is a safe lower bound for the database query (rows outside the buckets are ignored by fillSeries).
function buildBuckets(range, now = new Date(), tz = DEFAULT_TZ) {
  const key = Object.hasOwn(RANGES, range) ? range : DEFAULT_RANGE;
  const spec = RANGES[key];
  const [y, m, d] = dayKey(now, tz).split('-').map(Number);
  const buckets = [];
  for (let i = spec.count - 1; i >= 0; i -= 1) {
    if (spec.unit === 'day') {
      const t = new Date(Date.UTC(y, m - 1, d - i));
      buckets.push({ key: t.toISOString().slice(0, 10), label: `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}` });
    } else {
      const t = new Date(Date.UTC(y, m - 1 - i, 1));
      buckets.push({ key: t.toISOString().slice(0, 7), label: `${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}` });
    }
  }
  const days = spec.unit === 'day' ? spec.count + 2 : (spec.count + 1) * 31;
  return { range: key, unit: spec.unit, format: spec.unit === 'day' ? '%Y-%m-%d' : '%Y-%m', buckets, since: new Date(now.getTime() - days * DAY_MS) };
}

// rows: [{ _id: '2026-11-12', n: 3 }] -> one number per bucket (0 where nothing happened)
function fillSeries(buckets, rows = []) {
  const byKey = new Map(rows.map((r) => [String(r._id), Number(r.n) || 0]));
  return buckets.map((b) => byKey.get(b.key) || 0);
}

// rows: [{ _id: 'published', n: 4 }] -> [{ key, label, value }] in a fixed order (zeros kept), unknown keys appended
function enumSlices(rows = [], order = [], labels = {}) {
  const byKey = new Map();
  rows.forEach((r) => byKey.set(String(r._id), (byKey.get(String(r._id)) || 0) + (Number(r.n) || 0)));
  const known = order.map((k) => ({ key: k, label: labels[k] || k, value: byKey.get(k) || 0 }));
  const extra = [...byKey].filter(([k]) => !order.includes(k)).map(([k, v]) => ({ key: k, label: labels[k] || (k === 'null' || k === 'undefined' ? 'Not set' : k), value: v }));
  return [...known, ...extra];
}

// At most `limit` slices: the biggest ones, with the rest added up under one "Other" slice. Zero slices are dropped.
function topWithOther(items = [], limit = 7, otherLabel = 'Other') {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label)));
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit - 1).reduce((s, i) => s + i.value, 0);
  return [...sorted.slice(0, limit - 1), { key: '__other', label: otherLabel, value: rest }];
}

// rows of { _id: 1..5, n } -> the five star levels, zeros kept
function ratingBars(rows = []) {
  const byKey = new Map(rows.map((r) => [Number(r._id), Number(r.n) || 0]));
  return [1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: `${n}★`, value: byKey.get(n) || 0 }));
}

const sumValues = (items = []) => items.reduce((s, i) => s + (Number(i.value) || 0), 0);

// average star rating from ratingBars(), one decimal; null when nobody rated yet
function ratingAverage(bars = []) {
  const n = sumValues(bars);
  if (!n) return null;
  return Math.round((bars.reduce((s, b) => s + Number(b.key) * b.value, 0) / n) * 10) / 10;
}

module.exports = { RANGES, DEFAULT_RANGE, DEFAULT_TZ, parseRange, resolveTimeZone, dayKey, buildBuckets, fillSeries, enumSlices, topWithOther, ratingBars, ratingAverage, sumValues };
