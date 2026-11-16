require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const TouristSpot = require('../src/models/TouristSpot');
const Category = require('../src/models/Category');
const { recommend } = require('../src/services/aiService');

// 2026-12-07 is a Monday, 2026-12-08 a Tuesday
const MON = '2026-12-07';
const CAT = 'c1';
const FOOD = 'c2';
const spot = (n, over = {}) => ({
  _id: `s${n}`, name: `Spot ${n}`, slug: `spot-${n}`, municipality: 'Maasin City', shortDescription: `Short ${n}`,
  description: `Description ${n}`, images: [`/spots/${n}.jpg`], categoryIds: [CAT], status: 'published', ...over,
});
const eatery = (n, over = {}) => spot(n, { name: `Eatery ${n}`, categoryIds: [FOOD], ...over });
let spots = [];
Category.find = () => ({ lean: async () => [{ _id: CAT, name: 'Waterfalls' }, { _id: FOOD, name: 'Food' }] });
TouristSpot.find = () => ({ lean: async () => spots });

const realFetch = global.fetch;
const reset = () => { delete process.env.AI_API_KEY; global.fetch = realFetch; };
const trip = (extra) => recommend({ question: 'trip', pace: 'relaxed', startDate: MON, ...extra }, { wantItinerary: true });
const ids = (day) => day.items.map((it) => it.touristSpotId);

test('a place is not scheduled on a day it is closed', async () => {
  reset();
  spots = [spot(1, { openDays: ['Tue', 'Wed'] }), spot(2), spot(3), spot(4)];
  const r = await trip({ durationDays: 2 });
  assert.ok(!ids(r.days[0]).includes('s1'), 'closed on Monday');
  assert.ok(ids(r.days[1]).includes('s1'), 'open on Tuesday, so it goes there');
  assert.match(r.days[1].items.find((it) => it.touristSpotId === 's1').notes, /Open Tue–Wed|Open Tue, Wed/);
});

test('an out-of-season place slips back, an in-season one is not penalised', async () => {
  reset();
  spots = [spot(1, { bestMonths: [6, 7] }), spot(2), spot(3), spot(4)];
  let r = await trip({ durationDays: 1 });
  assert.deepEqual(ids(r.days[0]), ['s2', 's3']); // spot 1 is a June-July place and the trip is in December
  spots = [spot(1, { bestMonths: [12] }), spot(2), spot(3), spot(4)];
  r = await trip({ durationDays: 1 });
  assert.equal(ids(r.days[0])[0], 's1');
  assert.match(r.days[0].items[0].notes, /In season\./);
});

test('an out-of-season place can still be used, and the note says so', async () => {
  reset();
  spots = [spot(1, { bestMonths: [6, 7] }), spot(2), spot(3)];
  const r = await trip({ durationDays: 1, pace: 'packed' });
  const note = r.days[0].items.find((it) => it.touristSpotId === 's1').notes;
  assert.match(note, /Off season on this date \(best Jun, Jul\)/);
});

test('when every place left is closed, that day is a rest day, never a closed place', async () => {
  reset();
  spots = [spot(1, { openDays: ['Tue'] }), spot(2, { openDays: ['Tue'] }), spot(3, { openDays: ['Tue'] })];
  const r = await trip({ durationDays: 2 });
  assert.equal(r.days[0].items.length, 0);
  assert.equal(r.days[1].items.length, 2);
  assert.equal(r.plan.restDays, 1);
});

test('rest days at the end of a trip are dropped', async () => {
  reset();
  spots = [1, 2, 3, 4].map((n) => spot(n, { openDays: ['Mon'] }));
  const r = await trip({ durationDays: 3 });
  assert.equal(r.days.length, 1); // Monday has 2 places, Tuesday and Wednesday have nothing open
  assert.equal(r.plan.shortfall, true);
  assert.equal(r.plan.restDays, 0);
});

test('a meal stop is a food place that is open that day', async () => {
  reset();
  spots = [spot(1), spot(2), eatery(11, { openDays: ['Tue'] }), eatery(12)];
  const r = await trip({ durationDays: 1 });
  const meal = r.days[0].items.find((it) => it.kind === 'food');
  assert.equal(meal.touristSpotId, 's12');
  assert.match(meal.notes, /^Meal stop\./);
});

test('no start date: nothing can be checked, so nothing is filtered', async () => {
  reset();
  spots = [spot(1, { openDays: ['Tue'], bestMonths: [6] }), spot(2)];
  const r = await recommend({ question: 'trip', pace: 'relaxed', durationDays: 1 }, { wantItinerary: true });
  assert.deepEqual(ids(r.days[0]), ['s1', 's2']);
  assert.ok(!/Off season|In season/.test(r.days[0].items[0].notes));
});

test('trip dates rank in-season places first in a plain recommendation', async () => {
  reset();
  spots = [spot(1, { bestMonths: [6] }), spot(2), spot(3, { bestMonths: [12] })];
  const r = await recommend({ question: '', startDate: MON, durationDays: 1 });
  assert.deepEqual(r.recommendations.map((x) => x.spotId), ['s3', 's2', 's1']);
});

test('best months show up in the tips when a place has no best-time text', async () => {
  reset();
  spots = [spot(1, { bestMonths: [11, 12, 1, 2] }), spot(2, { bestTimeToVisit: 'Early morning' })];
  const r = await trip({ durationDays: 1 });
  assert.deepEqual(r.tips.bestTime.sort(), ['Best in Nov–Feb', 'Early morning']);
});

test('the model is told the dates and weekdays, and a closed place it still picks is removed', async () => {
  reset();
  spots = [spot(1, { openDays: ['Tue'] }), spot(2), spot(3)];
  let prompt = '';
  process.env.AI_API_KEY = 'k';
  global.fetch = async (url, opts) => {
    prompt = JSON.parse(opts.body).messages[1].content;
    const content = { answer: 'ok', recommendations: [{ spotId: 's2', reason: 'x' }], days: [{ dayNumber: 1, items: [{ spotId: 's1' }, { spotId: 's2' }] }] };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };
  try {
    const r = await trip({ durationDays: 1 });
    assert.match(prompt, /Day 1 = 2026-12-07 \(Monday\)/);
    assert.match(prompt, /"openDays":"Tue"/);
    assert.deepEqual(ids(r.days[0]), ['s2']); // spot 1 is closed on Monday
    assert.equal(r.days[0].items[0].visitOrder, 1);
  } finally {
    reset();
  }
});

test('if the model only picks closed places, the planner lays out the days instead', async () => {
  reset();
  spots = [spot(1, { openDays: ['Tue'] }), spot(2), spot(3)];
  process.env.AI_API_KEY = 'k';
  global.fetch = async () => {
    const content = { answer: 'ok', recommendations: [{ spotId: 's1', reason: 'x' }], days: [{ dayNumber: 1, items: [{ spotId: 's1' }] }] };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) };
  };
  try {
    const r = await trip({ durationDays: 1 });
    assert.ok(r.days[0].items.length > 0);
    assert.ok(!ids(r.days[0]).includes('s1'));
  } finally {
    reset();
  }
});
