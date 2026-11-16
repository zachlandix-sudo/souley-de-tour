require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const TouristSpot = require('../src/models/TouristSpot');
const Category = require('../src/models/Category');
const { recommend } = require('../src/services/aiService');

// recommend(body, { auto: true }) is what POST /api/ai/recommendations and /itinerary call: it reads the question first.
const ask = (q, over = {}, opts = {}) => recommend({ question: q, ...over }, { auto: true, ...opts });

const WF = 'c1';
const BEACH = 'c2';
const FOOD = 'c3';
const spot = (n, over = {}) => ({
  _id: `s${n}`, name: `Spot ${n}`, slug: `spot-${n}`, municipality: 'Maasin City', shortDescription: `Short ${n}.`, description: `Description ${n}.`,
  images: [`/spots/${n}.jpg`], categoryIds: [WF], status: 'published', location: { type: 'Point', coordinates: [124 + n / 10, 10 + n / 10] }, ...over,
});
let spots = [];
Category.find = () => ({ lean: async () => [{ _id: WF, name: 'Waterfalls' }, { _id: BEACH, name: 'Beach' }, { _id: FOOD, name: 'Food' }] });
TouristSpot.find = () => ({ lean: async () => spots });

const realFetch = global.fetch;
const reset = () => { delete process.env.AI_API_KEY; global.fetch = realFetch; };
const llm = (content, seen) => {
  process.env.AI_API_KEY = 'k';
  global.fetch = async (_u, o) => { if (seen) seen.body = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) }; };
};

test('the list endpoint turns into a trip when the question asks for one, with the days taken from the question', async () => {
  reset(); spots = [1, 2, 3, 4, 5, 6].map((n) => spot(n));
  const r = await ask('plan a 3-day trip in Maasin');
  assert.equal(r.intent, 'trip');
  assert.equal(r.days.length, 3);
  assert.equal(r.plan.requestedDays, 3);
  assert.deepEqual(r.chips.slice(0, 2), ['Trip plan', '3 days']);
  const list = await ask('waterfalls please');
  assert.equal(list.intent, 'places');
  assert.deepEqual(list.days, []);
});

test('what the client sends wins over what is guessed from the words', async () => {
  reset(); spots = [1, 2, 3, 4, 5, 6].map((n) => spot(n));
  const r = await ask('weekend trip', { durationDays: 4, pace: 'packed' }, { wantItinerary: true });
  assert.equal(r.plan.requestedDays, 4);
  assert.equal(r.plan.pace, 'packed');
});

test('the town in the question is a filter; with nothing for the activity there, it says so and looks elsewhere', async () => {
  reset();
  spots = [spot(1, { municipality: 'Sogod', name: 'Sogod Falls', activities: ['Swimming'] }), spot(2, { municipality: 'Silago', name: 'Silago Cove', categoryIds: [BEACH] }), spot(3, { municipality: 'Silago', name: 'Silago Rock', categoryIds: [BEACH] })];
  const inTown = await ask('beaches in Silago');
  assert.deepEqual(inTown.recommendations.map((x) => x.spot.municipality), ['Silago', 'Silago']);
  const none = await ask('waterfalls in Silago');
  assert.match(none.answer, /couldn't find waterfalls listed in Silago/);
  assert.equal(none.recommendations[0].spotId, 's1');
});

test('a budget in the question removes places that cost more and keeps places with no price', async () => {
  reset();
  spots = [spot(1, { estimatedBudget: 2000 }), spot(2, { estimatedBudget: 300 }), spot(3)];
  const r = await ask('waterfalls under ₱500');
  assert.deepEqual(r.recommendations.map((x) => x.spotId).sort(), ['s2', 's3']);
  assert.match(r.answer, /no listed price are included/);
});

test('"where can I eat" lists food places only, and a sight question does not list restaurants', async () => {
  reset();
  spots = [spot(1), spot(2, { name: 'Casa Cafe', categoryIds: [FOOD], entryType: 'cafe' })];
  const eat = await ask('where can I eat in Maasin?');
  assert.deepEqual(eat.recommendations.map((x) => x.spotId), ['s2']);
  const see = await ask('waterfalls in Maasin');
  assert.deepEqual(see.recommendations.map((x) => x.spotId), ['s1']);
});

test('a fact about a named place is answered from the record, with no AI call even when a key is set', async () => {
  reset();
  spots = [spot(1, { name: 'Tag-linaw Falls', entranceFee: '₱50', estimatedBudget: 150 }), spot(2)];
  let called = false;
  process.env.AI_API_KEY = 'k'; global.fetch = async () => { called = true; };
  const r = await ask('How much is the entrance fee of Tag-linaw falls?');
  reset();
  assert.equal(called, false);
  assert.equal(r.intent, 'facts');
  assert.match(r.answer, /Entrance: ₱50/);
  assert.match(r.answer, /Estimated budget: ₱150/);
  assert.deepEqual(r.recommendations.map((x) => x.spotId), ['s1']);
  assert.equal(r.aiUsed, false);
});

test('"how much is it?" after an answer is about the places that answer showed; "the second one" picks one', async () => {
  reset();
  spots = [spot(1, { entranceFee: '₱20' }), spot(2, { entranceFee: '₱80' }), spot(3)];
  const ctx = { q: 'waterfalls', ids: ['s1', 's2', 's3'] };
  const all = await ask('how much is it?', { ctx });
  assert.equal(all.intent, 'facts');
  assert.match(all.answer, /Spot 1[\s\S]*₱20[\s\S]*Spot 2[\s\S]*₱80/);
  const second = await ask('how much is the second one?', { ctx });
  assert.deepEqual(second.recommendations.map((x) => x.spotId), ['s2']);
  const cmp = await ask('compare the first two', { ctx });
  assert.equal(cmp.intent, 'compare');
  assert.equal(cmp.recommendations.length, 2);
  const unknown = await ask('how much is it?', { ctx: { q: 'x', ids: ['zzz'] } }); // ids that are not published places are ignored
  assert.notEqual(unknown.intent, 'facts');
});

test('a short follow-up changes part of the last question: cheaper, more, another town', async () => {
  reset();
  spots = [spot(1, { municipality: 'Silago' }), spot(2, { municipality: 'Silago', categoryIds: [BEACH] }), spot(3, { categoryIds: [WF] }), spot(4), spot(5), spot(6), spot(7), spot(8)];
  const first = await ask('waterfalls');
  const ctx = { q: 'waterfalls', ids: first.recommendations.map((x) => x.spotId) };
  const more = await ask('show me more', { ctx });
  assert.ok(more.recommendations.every((x) => !ctx.ids.includes(x.spotId)), 'places already shown are left out');
  const town = await ask('what about Silago?', { ctx });
  assert.ok(town.recommendations.every((x) => x.spot.municipality === 'Silago'));
  assert.ok(town.chips.includes('Silago') && town.chips.includes('Waterfalls'), 'the interest of the first question is kept');
  const trip = await ask('make it a 2-day trip', { ctx });
  assert.equal(trip.intent, 'trip');
  assert.equal(trip.plan.requestedDays, 2);
});

test('chat lines need no search and no AI; they offer questions to try', async () => {
  reset();
  spots = [spot(1)];
  let called = false;
  process.env.AI_API_KEY = 'k'; global.fetch = async () => { called = true; };
  const hi = await ask('Hi!');
  const bohol = await ask('things to do in Bohol');
  reset();
  assert.equal(called, false);
  assert.equal(hi.intent, 'chat');
  assert.deepEqual(hi.recommendations, []);
  assert.ok(hi.suggestions.length >= 3);
  assert.match(bohol.answer, /only cover Southern Leyte/);
  const vague = await ask('anything');
  assert.equal(vague.recommendations.length, 1); // a few favourites instead of a dead end
});

test('the answer is written in the language of the question', async () => {
  reset();
  spots = [spot(1, { name: 'Busay Falls' })];
  const ceb = await ask('unsa ang nindot nga busay?');
  assert.equal(ceb.lang, 'ceb');
  assert.match(ceb.answer, /^Ania ang 1 ka lugar para sa busay/);
  const fil = await ask('magkano ang entrance sa Busay Falls');
  assert.equal(fil.lang, 'fil');
  assert.match(fil.answer, /Bayad sa pagpasok/);
});

test('"Free" and "easy" are not stated as facts when almost every place has them (the model\'s defaults)', async () => {
  reset();
  spots = Array.from({ length: 12 }, (_, i) => spot(i + 1, { entranceFee: 'Free', difficulty: 'easy' }));
  const r = await ask('how much is Spot 3?');
  assert.match(r.answer, /Entrance: not listed yet/);
  spots = Array.from({ length: 12 }, (_, i) => spot(i + 1, { entranceFee: i < 6 ? 'Free' : `₱${i * 10}`, difficulty: 'easy' }));
  const r2 = await ask('how much is Spot 3?');
  assert.match(r2.answer, /Entrance: Free/);
});

test('a pin shared by several places is the town centre: no distance, no coordinates link', async () => {
  reset();
  const same = { type: 'Point', coordinates: [124.8, 10.1] };
  spots = [1, 2, 3, 4].map((n) => spot(n, { location: same }));
  const r = await ask('how do I get to Spot 2?');
  assert.ok(!/destination=/.test(r.answer) && !/straight line/.test(r.answer));
  assert.match(r.answer, /maps\/search/);
  const near = await ask('what is near Spot 2?');
  assert.equal(near.intent, 'nearby');
  assert.match(near.answer, /only have the town centre/);
});

test('with an AI key the model writes the recommendation, is told what was understood and which language to use', async () => {
  reset();
  spots = [spot(1), spot(2)];
  const seen = {};
  llm({ answer: 'Subukan ang Spot 1.', recommendations: [{ spotId: 's1', reason: 'Madali.' }], days: [] }, seen);
  const r = await ask('mga talon sa Maasin para sa pamilya, hanggang ₱500');
  reset();
  assert.equal(r.aiUsed, true);
  assert.equal(r.answer, 'Subukan ang Spot 1.');
  assert.match(seen.body.messages[0].content, /Filipino/);
  assert.match(seen.body.messages[1].content, /Understood from the question: recommend places; town: Maasin City.*budget: PHP 500/);
  assert.ok(r.chips.includes('Pamilya'));
  assert.ok(r.suggestions.length > 0);
});

test('the AI never sees fields outside the allowed record, and invented ids are still dropped', async () => {
  reset();
  spots = [spot(1, { secretNote: 'internal only' })];
  const seen = {};
  llm({ answer: 'ok', recommendations: [{ spotId: 's1', reason: 'r' }, { spotId: 'FAKE', reason: 'made up' }], days: [] }, seen);
  const r = await ask('waterfalls');
  reset();
  assert.ok(!seen.body.messages[1].content.includes('internal only'));
  assert.deepEqual(r.recommendations.map((x) => x.spotId), ['s1']);
});

test('when the AI is down the smart answer still replies, and says what it understood', async () => {
  reset();
  spots = [spot(1)];
  process.env.AI_API_KEY = 'k'; global.fetch = async () => ({ ok: false, status: 500, headers: { get: () => null } });
  const e = console.error; console.error = () => {};
  let r;
  try { r = await ask('waterfalls in Maasin'); } finally { console.error = e; reset(); }
  assert.equal(r.aiUsed, false);
  assert.match(r.answer, /Here is 1 place for waterfalls in Maasin City/);
});
