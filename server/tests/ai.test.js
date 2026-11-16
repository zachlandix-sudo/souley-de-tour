require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const TouristSpot = require('../src/models/TouristSpot');
const Category = require('../src/models/Category');
const AiConversation = require('../src/models/AiConversation');
const Itinerary = require('../src/models/Itinerary');
const User = require('../src/models/User');
const { recommend } = require('../src/services/aiService');
const { signToken } = require('../src/utils/token');
const app = require('../src/app');

const CAT = 'c1';
const spot = (n, over = {}) => ({
  _id: `s${n}`, name: `Spot ${n}`, slug: `spot-${n}`, municipality: 'Maasin City', shortDescription: `Short ${n}`,
  description: `Description ${n}`, images: [`/spots/${n}.jpg`], categoryIds: [CAT], status: 'published', ...over,
});
let spots = [];
let lastFilter;
Category.find = () => ({ lean: async () => [{ _id: CAT, name: 'Waterfalls' }] });
TouristSpot.find = (f) => { lastFilter = f; return { lean: async () => spots }; };

const noKey = () => { delete process.env.AI_API_KEY; };
const realFetch = global.fetch;
const llm = (content, ok = true) => { process.env.AI_API_KEY = 'k'; global.fetch = async () => ({ ok, status: ok ? 200 : 500, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) }); };
const restore = () => { noKey(); global.fetch = realFetch; };
const quiet = (fn) => async () => { const e = console.error; console.error = () => {}; try { await fn(); } finally { console.error = e; restore(); } };

test('only published spots are retrieved; municipality filter is escaped and case-insensitive', async () => {
  noKey(); spots = [spot(1)];
  await recommend({ question: 'waterfall', municipality: 'maasin city' });
  assert.equal(lastFilter.status, 'published');
  assert.ok(lastFilter.municipality.test('Maasin City'));
  await recommend({ question: 'x y z', municipality: '.*' });
  assert.ok(!lastFilter.municipality.test('Maasin City'));
});

test('budget filter keeps spots with no budget set', async () => {
  noKey(); spots = [spot(1)];
  await recommend({ question: 'cheap trip', budget: 500 });
  assert.deepEqual(lastFilter.$or[0], { estimatedBudget: { $lte: 500 } });
  assert.equal(lastFilter.$or.length, 3);
});

test('no spots -> friendly empty answer, no LLM call', async () => {
  spots = []; process.env.AI_API_KEY = 'k';
  let called = false; global.fetch = async () => { called = true; };
  const r = await recommend({ question: 'anything' });
  restore();
  assert.equal(called, false);
  assert.match(r.answer, /No matching/);
  assert.deepEqual(r.recommendations, []);
  assert.equal(r.aiUsed, false);
});

test('fallback ranks by keyword match, then featured and rating', async () => {
  noKey();
  spots = [spot(1, { name: 'Quiet Beach', description: 'sand' }), spot(2, { name: 'Tinago Falls', description: 'swimming snorkel' }), spot(3, { name: 'Park', isFeatured: true, averageRating: 5 })];
  const r = await recommend({ question: 'swimming snorkel' });
  assert.equal(r.aiUsed, false);
  assert.equal(r.recommendations[0].spotId, 's2');
  assert.equal(r.recommendations[0].spot.link, '/spots/spot-2');
  assert.equal(r.recommendations[1].spotId, 's3');
});

test('fallback itinerary: 2 spots per day, capped at 7 days, none unless requested', async () => {
  noKey(); spots = [1, 2, 3, 4, 5].map((n) => spot(n));
  const rec = await recommend({ question: 'trip please', durationDays: 3 });
  assert.deepEqual(rec.days, []);
  const it = await recommend({ question: 'trip please', durationDays: 3 }, { wantItinerary: true });
  assert.equal(it.days.length, 3);
  assert.equal(it.days[0].items.length, 2);
  assert.equal(it.days[2].items.length, 1);
  assert.equal(it.days[0].items[1].visitOrder, 2);
  const many = await recommend({ question: 'trip please', durationDays: 30 }, { wantItinerary: true });
  assert.ok(many.days.length <= 7);
});

test('trip planner: pace sets places per day, one meal per day, dates, a 50-day cap and an honest shortfall', async () => {
  noKey();
  const FOOD = 'c2';
  const realCats = Category.find;
  Category.find = () => ({ lean: async () => [{ _id: CAT, name: 'Waterfalls' }, { _id: FOOD, name: 'Food' }] });
  try {
    spots = [...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => spot(n, { estimatedBudget: 100 })), ...[11, 12, 13].map((n) => spot(n, { name: `Eatery ${n}`, categoryIds: [FOOD], estimatedBudget: 200 }))];
    const r = await recommend({ question: 'trip', durationDays: 3, pace: 'balanced', startDate: '2026-12-30' }, { wantItinerary: true });
    assert.deepEqual(r.days.map((d) => d.items.length), [4, 4, 3]); // 3 / 3 / 2 places plus one meal each
    assert.ok(r.days.every((d) => d.items.filter((it) => it.kind === 'food').length === 1));
    assert.deepEqual(r.days.map((d) => d.date), ['2026-12-30', '2026-12-31', '2027-01-01']);
    assert.equal(r.plan.endDate, '2027-01-01');
    assert.equal(r.plan.shortfall, false);
    assert.equal(r.plan.totalBudget, 8 * 100 + 3 * 200);
    assert.equal(new Set(r.days.flatMap((d) => d.items.map((it) => it.touristSpotId))).size, 11); // no place twice
    assert.equal(r.places.length, 11);
    const long = await recommend({ question: 'trip', durationDays: 99 }, { wantItinerary: true });
    assert.equal(long.plan.requestedDays, 50);
    assert.equal(long.plan.shortfall, true); // only 8 places exist: fewer days than asked, never repeats
    assert.equal(long.plan.plannedDays, long.days.length);
    assert.equal(new Set(long.days.flatMap((d) => d.items.map((it) => it.touristSpotId))).size, long.days.flatMap((d) => d.items).length);
  } finally {
    Category.find = realCats;
  }
});

test('LLM answer is used but invented spot ids are dropped', async () => {
  spots = [spot(1), spot(2)];
  llm({ answer: 'Go here', recommendations: [{ spotId: 's1', reason: 'nice' }, { spotId: 'FAKE', reason: 'made up' }], days: [{ items: [{ spotId: 's2' }, { spotId: 'FAKE' }] }] });
  const r = await recommend({ question: 'plan something' }, { wantItinerary: true });
  restore();
  assert.equal(r.aiUsed, true);
  assert.deepEqual(r.recommendations.map((x) => x.spotId), ['s1']);
  assert.equal(r.days[0].dayNumber, 1);
  assert.deepEqual(r.days[0].items.map((x) => x.touristSpotId), ['s2']);
});

test('LLM with only invented ids falls back to database answer', async () => {
  spots = [spot(1)];
  llm({ answer: 'x', recommendations: [{ spotId: 'FAKE', reason: 'r' }], days: [] });
  const r = await recommend({ question: 'plan something' });
  restore();
  assert.equal(r.recommendations[0].spotId, 's1');
});

test('LLM provider error falls back instead of failing', quiet(async () => {
  spots = [spot(1)]; llm({}, false);
  const r = await recommend({ question: 'plan something' });
  assert.equal(r.aiUsed, false);
  assert.equal(r.recommendations.length, 1);
}));

test('LLM text is length-limited', async () => {
  spots = [spot(1)];
  llm({ answer: 'a'.repeat(5000), recommendations: [{ spotId: 's1', reason: 'r'.repeat(900) }] });
  const r = await recommend({ question: 'plan something' });
  restore();
  assert.equal(r.answer.length, 2000);
  assert.equal(r.recommendations[0].reason.length, 500);
});

test('LLM context only contains the allowed spot fields', async () => {
  spots = [spot(1, { secretNote: 'internal only', location: { coordinates: [125, 10] } })];
  let body;
  process.env.AI_API_KEY = 'k';
  global.fetch = async (_u, o) => { body = JSON.parse(o.body); return { ok: true, json: async () => ({ choices: [{ message: { content: '{"answer":"ok","recommendations":[{"spotId":"s1","reason":"r"}]}' } }] }) }; };
  await recommend({ question: 'plan something' });
  restore();
  const text = body.messages[1].content;
  assert.ok(!text.includes('internal only'));
  assert.ok(text.includes('Waterfalls'));
  assert.equal(body.response_format.type, 'json_object');
});

// ---- HTTP layer (models stubbed) ----
const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const login = () => { const u = { _id: ID, role: 'visitor', status: 'active', tokenVersion: 0 }; User.findById = async () => u; return `Bearer ${signToken(u)}`; };

test('POST /api/ai/recommendations works for guests and does not store a conversation', async () => {
  noKey(); spots = [spot(1)];
  let stored = 0; AiConversation.create = async () => { stored += 1; };
  const r = await request(app).post('/api/ai/recommendations').send({ question: 'waterfalls please' });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.equal(r.body.data.recommendations.length, 1);
  assert.equal(stored, 0);
});

test('logged-in users get their conversation stored', async () => {
  noKey(); spots = [spot(1)];
  let saved; AiConversation.create = async (d) => { saved = d; };
  const r = await request(app).post('/api/ai/recommendations').set('Authorization', login()).send({ question: 'waterfalls please' });
  assert.equal(r.status, 200);
  assert.equal(saved.userId, ID);
  assert.equal(saved.messages[0].content, 'waterfalls please');
  assert.deepEqual(saved.messages[1].spotIds, ['s1']);
});

test('itinerary save=true needs login, and stores a trip when logged in', async () => {
  noKey(); spots = [spot(1), spot(2)];
  AiConversation.create = async () => {};
  const guest = await request(app).post('/api/ai/itinerary').send({ question: 'plan two days', save: true });
  assert.equal(guest.status, 401);
  let trip; Itinerary.create = async (d) => { trip = d; return { _id: 'i1', ...d }; };
  const r = await request(app).post('/api/ai/itinerary').set('Authorization', login()).send({ question: 'plan two days', durationDays: 1, save: true, title: 'My trip' });
  assert.equal(r.status, 200);
  assert.equal(trip.title, 'My trip');
  assert.equal(trip.generatedByAI, true);
  assert.equal(trip.days[0].items[0].touristSpotId, 's1');
  assert.equal(r.body.saved._id, 'i1');
});

test('GET /api/ai/conversations requires login', async () => {
  assert.equal((await request(app).get('/api/ai/conversations')).status, 401);
});
