require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/utils/statistics');
const { buildStatistics } = require('../src/services/statisticsService');

// 2026-11-12 10:00 in Manila (UTC+8) = 02:00 UTC
const NOW = new Date('2026-11-12T02:00:00Z');

test('parseRange: default, known keys, rejects anything else', () => {
  assert.equal(S.parseRange(undefined), '30d');
  assert.equal(S.parseRange(''), '30d');
  assert.equal(S.parseRange('7d'), '7d');
  assert.equal(S.parseRange('12m'), '12m');
  assert.equal(S.parseRange('1y'), null);
  assert.equal(S.parseRange(['7d', '30d']), null);
  assert.equal(S.parseRange('__proto__'), null);
});

test('resolveTimeZone falls back to Asia/Manila for a bad name', () => {
  assert.equal(S.resolveTimeZone('Europe/Paris'), 'Europe/Paris');
  assert.equal(S.resolveTimeZone('Not/AZone'), 'Asia/Manila');
  assert.equal(S.resolveTimeZone(''), 'Asia/Manila');
  assert.equal(S.resolveTimeZone(undefined), 'Asia/Manila');
});

test('dayKey reads the calendar in the given zone (late UTC evening is already tomorrow in Manila)', () => {
  assert.equal(S.dayKey(new Date('2026-11-11T20:00:00Z'), 'Asia/Manila'), '2026-11-12');
  assert.equal(S.dayKey(new Date('2026-11-11T20:00:00Z'), 'UTC'), '2026-11-11');
});

test('day buckets end today, run oldest first and cross month and year ends', () => {
  const b = S.buildBuckets('7d', NOW, 'Asia/Manila');
  assert.equal(b.buckets.length, 7);
  assert.deepEqual(b.buckets.map((x) => x.key), ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']);
  assert.equal(b.buckets[6].label, 'Nov 12');
  assert.equal(b.format, '%Y-%m-%d');
  assert.equal(b.unit, 'day');
  const ny = S.buildBuckets('7d', new Date('2027-01-03T04:00:00Z'), 'Asia/Manila');
  assert.deepEqual(ny.buckets.map((x) => x.key).slice(0, 3), ['2026-12-28', '2026-12-29', '2026-12-30']);
  assert.equal(S.buildBuckets('30d', NOW, 'UTC').buckets.length, 30);
  assert.equal(S.buildBuckets('90d', NOW, 'UTC').buckets.length, 90);
});

test('month buckets: 12 of them, ending with the current month', () => {
  const b = S.buildBuckets('12m', NOW, 'Asia/Manila');
  assert.equal(b.buckets.length, 12);
  assert.equal(b.buckets[0].key, '2025-12');
  assert.equal(b.buckets[11].key, '2026-11');
  assert.equal(b.buckets[11].label, 'Nov 2026');
  assert.equal(b.format, '%Y-%m');
});

test('the query lower bound is before the first bucket', () => {
  for (const r of ['7d', '30d', '90d', '12m']) {
    const b = S.buildBuckets(r, NOW, 'Asia/Manila');
    const first = new Date(`${b.buckets[0].key}${r === '12m' ? '-01' : ''}T00:00:00Z`);
    assert.ok(b.since < first, `${r}: since ${b.since.toISOString()} should be before ${first.toISOString()}`);
  }
});

test('an unknown range is treated as the default one', () => {
  assert.equal(S.buildBuckets('nope', NOW, 'UTC').buckets.length, 30);
});

test('fillSeries puts zeros where nothing happened and ignores rows outside the buckets', () => {
  const { buckets } = S.buildBuckets('7d', NOW, 'Asia/Manila');
  const out = S.fillSeries(buckets, [{ _id: '2026-11-12', n: 3 }, { _id: '2026-11-08', n: 1 }, { _id: '2020-01-01', n: 99 }]);
  assert.deepEqual(out, [0, 0, 1, 0, 0, 0, 3]);
  assert.deepEqual(S.fillSeries(buckets), [0, 0, 0, 0, 0, 0, 0]);
});

test('enumSlices keeps a fixed order, keeps zeros, appends unknown keys and merges repeats', () => {
  const out = S.enumSlices([{ _id: 'draft', n: 2 }, { _id: 'published', n: 5 }, { _id: 'weird', n: 1 }, { _id: null, n: 4 }, { _id: 'draft', n: 1 }], ['published', 'draft', 'archived'], { published: 'Published', draft: 'Draft' });
  assert.deepEqual(out.map((i) => [i.key, i.label, i.value]), [
    ['published', 'Published', 5], ['draft', 'Draft', 3], ['archived', 'archived', 0], ['weird', 'weird', 1], ['null', 'Not set', 4],
  ]);
});

test('topWithOther: at most `limit` slices, the rest is one "Other", zeros dropped', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, label: `L${i}`, value: 10 - i }));
  const out = S.topWithOther([...items, { key: 'z', label: 'Zero', value: 0 }], 4);
  assert.equal(out.length, 4);
  assert.deepEqual(out.slice(0, 3).map((i) => i.value), [10, 9, 8]);
  assert.deepEqual(out[3], { key: '__other', label: 'Other', value: 7 + 6 + 5 + 4 + 3 + 2 + 1 });
  assert.equal(S.topWithOther(items.slice(0, 3), 4).length, 3);
  assert.equal(S.sumValues(out), S.sumValues(items));
});

test('ratingBars gives the five star levels and ratingAverage rounds to one decimal', () => {
  const bars = S.ratingBars([{ _id: 5, n: 2 }, { _id: 4, n: 1 }, { _id: 1, n: 1 }]);
  assert.deepEqual(bars.map((b) => b.value), [1, 0, 0, 1, 2]);
  assert.equal(bars[4].label, '5★');
  assert.equal(S.ratingAverage(bars), 3.8); // (1 + 4 + 5 + 5) / 4 = 3.75
  assert.equal(S.ratingAverage(S.ratingBars([])), null);
});

// ---------- the service, with small fake models ----------
const calls = [];
const model = (name, reply) => ({
  aggregate: async (pipeline) => { calls.push({ name, pipeline }); return typeof reply === 'function' ? reply(pipeline) : reply; },
  countDocuments: async () => 12,
});
const group = (pipeline) => pipeline.find((s) => s.$group)?.$group;
const fakeModels = () => ({
  TouristSpot: model('spot', (p) => {
    const g = group(p);
    if (p.some((s) => s.$unwind)) return [{ _id: 'c1', n: 3, views: 40 }, { _id: 'c2', n: 2, views: 0 }, { _id: 'gone', n: 1, views: 5 }];
    if (g._id === null) return [{ _id: null, views: 45, favorites: 9 }];
    if (g._id === '$status') return [{ _id: 'published', n: 4 }, { _id: 'draft', n: 1 }];
    if (g._id === '$difficulty') return [{ _id: 'easy', n: 3 }, { _id: 'hard', n: 2 }];
    if (g._id === '$municipality') return [{ _id: 'Maasin City', n: 3 }, { _id: 'Sogod', n: 2 }];
    return [{ _id: '2026-11-12', n: 5 }]; // time line
  }),
  Review: model('review', (p) => {
    const g = group(p);
    if (g._id === '$status') return [{ _id: 'approved', n: 3 }, { _id: 'pending', n: 1 }];
    if (g._id === '$rating') return [{ _id: 5, n: 2 }, { _id: 4, n: 1 }];
    return [{ _id: '2026-11-11', n: 2 }];
  }),
  User: model('user', (p) => (group(p)._id === '$role' ? [{ _id: 'admin', n: 1 }, { _id: 'visitor', n: 6 }] : [{ _id: '2026-11-10', n: 1 }])),
  Itinerary: model('trip', (p) => (group(p)._id === '$generatedByAI' ? [{ _id: true, n: 2 }, { _id: false, n: 3 }, { _id: null, n: 1 }] : [{ _id: '2026-11-12', n: 1 }])),
  AiConversation: model('chat', [{ _id: '2026-11-12', n: 4 }]),
  Category: { find: (filter, fields) => { calls.push({ name: 'category', filter, fields }); return { lean: async () => [{ _id: 'c1', name: 'Waterfalls' }, { _id: 'c2', name: 'Beaches' }] }; } },
});

test('buildStatistics assembles totals, timeline, pies and bars', async () => {
  calls.length = 0;
  const r = await buildStatistics(fakeModels(), { range: '7d', now: NOW, tz: 'Asia/Manila' });
  assert.equal(r.range, '7d');
  assert.equal(r.timezone, 'Asia/Manila');
  assert.deepEqual(r.totals, { spots: 5, views: 45, favorites: 9, reviews: 4, users: 7, trips: 6, aiChats: 12, averageRating: 4.7 });
  assert.equal(r.timeline.keys.length, 7);
  assert.equal(r.timeline.labels[6], 'Nov 12');
  assert.deepEqual(r.timeline.series.spots, [0, 0, 0, 0, 0, 0, 5]);
  assert.deepEqual(r.timeline.series.reviews, [0, 0, 0, 0, 0, 2, 0]);
  assert.deepEqual(r.timeline.series.users, [0, 0, 0, 0, 1, 0, 0]);
  assert.deepEqual(r.timeline.series.aiChats, [0, 0, 0, 0, 0, 0, 4]);
  for (const s of Object.values(r.timeline.series)) assert.equal(s.length, 7);
  assert.deepEqual(r.pies.spotStatus.map((i) => [i.label, i.value]), [['Published', 4], ['Draft', 1], ['Archived', 0]]);
  assert.deepEqual(r.pies.reviewStatus.map((i) => i.value), [3, 1, 0]);
  assert.deepEqual(r.pies.userRole.map((i) => [i.label, i.value]), [['Visitors', 6], ['Editors', 0], ['Admins', 1]]);
  assert.deepEqual(r.pies.tripOrigin.map((i) => [i.label, i.value]), [['Planned by Ask SOULEY', 2], ['Built by hand', 4]]);
  assert.deepEqual(r.pies.spotCategory.map((i) => [i.label, i.value]), [['Waterfalls', 3], ['Beaches', 2], ['Uncategorised', 1]]);
  assert.deepEqual(r.bars.towns, { items: [{ key: 'Maasin City', label: 'Maasin City', value: 3 }, { key: 'Sogod', label: 'Sogod', value: 2 }], total: 2 });
  assert.deepEqual(r.bars.categoryViews.map((i) => [i.label, i.value]), [['Waterfalls', 40], ['Uncategorised', 5]]);
  assert.deepEqual(r.bars.ratings.map((i) => i.value), [0, 0, 0, 1, 2]);
});

test('time line queries use the zone, the format and only approved reviews feed the star bars', async () => {
  calls.length = 0;
  await buildStatistics(fakeModels(), { range: '12m', now: NOW, tz: 'Asia/Manila' });
  const line = calls.find((c) => c.name === 'user' && c.pipeline.some((s) => s.$match?.createdAt));
  const g = line.pipeline.find((s) => s.$group).$group._id.$dateToString;
  assert.deepEqual([g.format, g.timezone, g.date], ['%Y-%m', 'Asia/Manila', '$createdAt']);
  assert.ok(line.pipeline[0].$match.createdAt.$gte < new Date('2025-12-01T00:00:00Z'));
  const stars = calls.find((c) => c.name === 'review' && group(c.pipeline)._id === '$rating');
  assert.deepEqual(stars.pipeline[0], { $match: { status: 'approved' } });
});

test('an empty database gives zeros everywhere, not errors', async () => {
  const empty = (name) => ({ aggregate: async () => [], countDocuments: async () => 0, find: () => ({ lean: async () => [] }), name });
  const r = await buildStatistics({ TouristSpot: empty('s'), Review: empty('r'), User: empty('u'), Itinerary: empty('i'), AiConversation: empty('a'), Category: empty('c') }, { now: NOW });
  assert.equal(r.range, '30d');
  assert.deepEqual(r.totals, { spots: 0, views: 0, favorites: 0, reviews: 0, users: 0, trips: 0, aiChats: 0, averageRating: null });
  assert.equal(r.timeline.series.users.length, 30);
  assert.ok(r.timeline.series.users.every((n) => n === 0));
  assert.deepEqual(r.bars.towns, { items: [], total: 0 });
  assert.deepEqual(r.bars.categoryViews, []);
  assert.deepEqual(r.pies.spotCategory, []);
  assert.deepEqual(r.bars.ratings.map((i) => i.value), [0, 0, 0, 0, 0]);
});

test('towns are capped at ten bars but the total says how many there are', async () => {
  const m = fakeModels();
  m.TouristSpot = model('spot', (p) => (group(p)._id === '$municipality' ? Array.from({ length: 14 }, (_, i) => ({ _id: `Town ${i}`, n: i + 1 })) : []));
  const r = await buildStatistics(m, { now: NOW });
  assert.equal(r.bars.towns.items.length, 10);
  assert.equal(r.bars.towns.total, 14);
  assert.equal(r.bars.towns.items[0].value, 14);
});
