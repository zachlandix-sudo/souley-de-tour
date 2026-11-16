const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeSpots, CHECK_KEYS, PLACEHOLDER, SHARED_PIN_AT } = require('../src/services/contentHealthService');

const LONG = 'A quiet white-sand cove on the Sogod Bay side with calm water for swimming, a few small huts for shade and fresh fish grilled at the shore.';
let n = 0;
// a spot that passes every check, unless `over` says otherwise
const spot = (over = {}) => {
  n += 1;
  return {
    _id: `id${n}`, name: `Spot ${n}`, slug: `spot-${n}`, municipality: 'Sogod', status: 'published', description: LONG,
    categoryIds: ['c1'], location: { type: 'Point', coordinates: [125 + n / 1000, 10 + n / 1000] }, images: ['/a.jpg', '/b.jpg'],
    contactPhone: '0917 000 0000', estimatedBudget: 300, updatedAt: '2026-11-10T00:00:00Z', ...over,
  };
};
const check = (r, key) => r.checks.find((c) => c.key === key);

test('health: a complete spot is clean and scores 100', () => {
  const r = analyzeSpots([spot()]);
  assert.equal(r.score, 100);
  assert.deepEqual(r.checks.map((c) => c.count), CHECK_KEYS.map(() => 0));
  assert.equal(r.totals.published, 1);
});

test('health: no pin, 0,0 and half a pin all count as "no map pin"', () => {
  const r = analyzeSpots([
    spot({ location: undefined }),
    spot({ location: { type: 'Point', coordinates: [0, 0] } }),
    spot({ location: { type: 'Point', coordinates: [125.1] } }),
    spot({ location: { type: 'Point', coordinates: ['125.1', '10.1'] } }),
    spot(),
  ]);
  assert.equal(check(r, 'noPin').count, 4);
});

test('health: short text and the food import placeholders are not real descriptions', () => {
  for (const d of ['Named restaurant/eatery listing; confirm current operation, menu, and exact address.', 'Named café, coffee, tea, or beverage stop; menu and current hours need checking.', 'Named food stall/shop or prepared-food seller; confirm exact location.', 'Nice place.', '', undefined]) {
    assert.equal(analyzeSpots([spot({ description: d })]).checks.find((c) => c.key === 'thinText').count, 1, String(d));
  }
  assert.equal(check(analyzeSpots([spot()]), 'thinText').count, 0);
  assert.ok(PLACEHOLDER.test('Named restaurant/eatery listing; confirm current operation'));
  assert.ok(!PLACEHOLDER.test(LONG));
});

test('health: duplicates ignore case, accents and punctuation but not the town', () => {
  const r = analyzeSpots([
    spot({ name: 'Café del Mar', municipality: 'Maasin City' }), spot({ name: 'CAFE DEL MAR!', municipality: 'maasin city' }),
    spot({ name: 'Café del Mar', municipality: 'Sogod' }), spot({ name: 'Unique' }),
  ]);
  assert.equal(check(r, 'duplicate').count, 2);
});

test('health: five spots on one exact pin are flagged as a town-centre guess, four are not', () => {
  const pin = { type: 'Point', coordinates: [124.846, 10.1335] };
  assert.equal(SHARED_PIN_AT, 5);
  assert.equal(check(analyzeSpots(Array.from({ length: 4 }, () => spot({ location: pin }))), 'sharedPin').count, 0);
  assert.equal(check(analyzeSpots(Array.from({ length: 5 }, () => spot({ location: pin }))), 'sharedPin').count, 5);
});

test('health: category, photos, contact and visit info', () => {
  const r = analyzeSpots([
    spot({ categoryIds: [] }), spot({ images: ['/a.jpg'] }), spot({ images: ['', '  '] }),
    spot({ contactPhone: '', contactEmail: '' }), spot({ estimatedBudget: undefined, recommendedDuration: '', bestTimeToVisit: ' ' }),
  ]);
  assert.equal(check(r, 'noCategory').count, 1);
  assert.equal(check(r, 'onePhoto').count, 2);
  assert.equal(check(r, 'noContact').count, 1);
  assert.equal(check(r, 'noVisitInfo').count, 1);
});

test('health: the score is the average over published spots, weighted by how serious each gap is', () => {
  // weights: high 3, medium 2, low 1 -> total 3+3+2+2+1+1+1+1 = 14. A spot with no pin loses 3/14.
  const r = analyzeSpots([spot(), spot({ location: undefined })]);
  assert.equal(r.score, Math.round(((1 + (1 - 3 / 14)) / 2) * 100));
  assert.equal(r.scored, 2);
});

test('health: drafts and archived spots do not move the score, archived ones are not checked at all', () => {
  const r = analyzeSpots([spot(), spot({ status: 'draft', location: undefined }), spot({ status: 'archived', location: undefined })]);
  assert.equal(r.score, 100);
  assert.equal(check(r, 'noPin').count, 1);
  assert.deepEqual(r.totals, { all: 3, published: 1, draft: 1, archived: 1 });
});

test('health: no published spot means no score (not a fake 100)', () => {
  assert.equal(analyzeSpots([]).score, null);
  assert.equal(analyzeSpots([spot({ status: 'draft' })]).score, null);
});

test('health: drafts that only miss "nice to have" things are ready to publish', () => {
  const ready = spot({ status: 'draft', images: ['/a.jpg'], contactPhone: '' });
  const blocked = spot({ status: 'draft', location: undefined });
  const r = analyzeSpots([ready, blocked, spot()]);
  assert.deepEqual(r.opportunities.readyDrafts.items.map((i) => i._id), [ready._id]);
});

test('health: drafts untouched for 30 days are listed as forgotten', () => {
  const now = Date.parse('2026-11-14T00:00:00Z');
  const old = spot({ status: 'draft', updatedAt: '2026-09-01T00:00:00Z' });
  const fresh = spot({ status: 'draft', updatedAt: '2026-11-10T00:00:00Z' });
  const r = analyzeSpots([old, fresh], { now });
  assert.deepEqual(r.opportunities.staleDrafts.items.map((i) => i._id), [old._id]);
  assert.equal(r.opportunities.staleDrafts.days, 30);
});

test('health: the list per check is cut at the limit (count stays true) and "only" returns one check', () => {
  const r = analyzeSpots(Array.from({ length: 12 }, () => spot({ categoryIds: [] })), { limit: 5, only: 'noCategory' });
  assert.equal(r.checks.length, 1);
  assert.equal(r.checks[0].count, 12);
  assert.equal(r.checks[0].items.length, 5);
  assert.deepEqual(Object.keys(r.checks[0].items[0]).sort(), ['_id', 'municipality', 'name', 'slug', 'status']);
  assert.equal(analyzeSpots([spot()], { only: 'nonsense' }).checks.length, CHECK_KEYS.length);
});

test('health: ready drafts are listed up to 100 even when each check only lists a few', () => {
  const drafts = Array.from({ length: 130 }, () => spot({ status: 'draft' }));
  const r = analyzeSpots(drafts, { limit: 8 });
  assert.equal(r.opportunities.readyDrafts.count, 130);
  assert.equal(r.opportunities.readyDrafts.items.length, 100);
  assert.equal(analyzeSpots(drafts, { opportunityLimit: 3 }).opportunities.readyDrafts.items.length, 3);
});
