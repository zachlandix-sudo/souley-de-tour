// GET /api/users/me/overview runs for real here; only the database models are replaced by small fakes
// (no MongoDB or mongoose needed), and every query the controller makes is recorded so we can check it stays on the signed-in person.
require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const SRC = path.join(__dirname, '..', 'src');
const fake = (rel, exports) => {
  const file = path.join(SRC, rel);
  const m = new Module(file);
  m.filename = file; m.exports = exports; m.loaded = true;
  require.cache[require.resolve(file)] = m;
  return exports;
};
const query = (list) => {
  const q = { select: () => q, populate: () => q, sort: () => q, skip: () => q, limit: () => q, lean: async () => list, then: (ok, bad) => Promise.resolve(list).then(ok, bad) };
  return q;
};

const ME = 'me-id';
const seen = [];
const state = { user: null, reviews: [], trips: [], chats: [] };

fake('models/User.js', { findById: (id) => { seen.push(['user', id]); return query(state.user); } });
fake('models/TouristSpot.js', {});
fake('models/AuditLog.js', {});
fake('models/Review.js', {
  countDocuments: async (f) => { seen.push(['review.count', f]); return state.reviews.filter((r) => r.userId === f.userId && (!f.status || r.status === f.status)).length; },
  distinct: async (field, f) => { seen.push(['review.distinct', f]); return state.reviews.filter((r) => r.userId === f.userId && r.touristSpotId).map((r) => r.touristSpotId._id); },
  find: (f) => { seen.push(['review.find', f]); return query(state.reviews.filter((r) => r.userId === f.userId)); },
});
fake('models/Itinerary.js', {
  countDocuments: async (f) => { seen.push(['trip.count', f]); return state.trips.filter((t) => t.userId === f.userId).length; },
  find: (f) => { seen.push(['trip.find', f]); return query(state.trips.filter((t) => t.userId === f.userId)); },
});
fake('models/AiConversation.js', {
  countDocuments: async (f) => { seen.push(['ai.count', f]); return state.chats.filter((c) => c.userId === f.userId).length; },
  find: (f) => { seen.push(['ai.find', f]); return query(state.chats.filter((c) => c.userId === f.userId)); },
});

const { myOverview } = require('../src/controllers/userController');

const run = async () => {
  let body; let failed;
  await myOverview({ user: { _id: ME } }, { json: (b) => { body = b; } }, (e) => { failed = e; });
  assert.equal(failed, undefined);
  return body.data;
};

test('my overview counts and lists only my own activity', async () => {
  seen.length = 0;
  state.user = { createdAt: '2026-01-02T00:00:00Z', favoriteTouristSpots: ['a', 'b', 'c'] };
  state.reviews = [
    { _id: 'r1', userId: ME, rating: 5, title: 'Wow', status: 'approved', createdAt: 'x', touristSpotId: { _id: 's1', name: 'Kawasan', slug: 'kawasan', municipality: 'Maasin City' } },
    { _id: 'r2', userId: ME, rating: 3, status: 'pending', createdAt: 'y', touristSpotId: null },
    { _id: 'r3', userId: 'someone-else', rating: 1, status: 'approved', createdAt: 'z', touristSpotId: null },
  ];
  state.trips = [
    { _id: 't1', userId: ME, title: 'Weekend', generatedByAI: true, updatedAt: 'u', days: [{ items: [{}, {}] }, { items: [{}] }] },
    { _id: 't2', userId: 'someone-else', title: 'Not mine', days: [] },
  ];
  state.chats = [
    { _id: 'c1', userId: ME, updatedAt: 'w', messages: [{ role: 'user', content: 'Where can I swim?' }, { role: 'assistant', content: 'SECRET ANSWER' }] },
    { _id: 'c2', userId: 'someone-else', updatedAt: 'w', messages: [{ role: 'user', content: 'not mine' }] },
  ];
  const d = await run();

  assert.deepEqual(d.counts, { favorites: 3, reviews: 2, pendingReviews: 1, trips: 1, asks: 1 });
  assert.deepEqual(d.reviewedSpotIds, ['s1']); // only my reviews, and a removed spot is skipped
  assert.equal(d.memberSince, '2026-01-02T00:00:00Z');
  assert.deepEqual(d.reviews.map((r) => r._id), ['r1', 'r2']);
  assert.equal(d.reviews[0].spot.slug, 'kawasan');
  assert.equal(d.reviews[1].spot, null); // a removed spot does not break the list
  assert.deepEqual(d.trips.map((t) => [t._id, t.days, t.stops]), [['t1', 2, 3]]);
  assert.deepEqual(d.asks.map((a) => a.question), ['Where can I swim?']);
  assert.ok(!JSON.stringify(d).includes('SECRET ANSWER'), 'the model answer is not sent back');
  assert.ok(!JSON.stringify(d).includes('someone-else'));
});

test('every query is limited to the signed-in person', async () => {
  seen.length = 0;
  await run();
  for (const [what, arg] of seen) {
    if (what === 'user') assert.equal(arg, ME);
    else assert.equal(arg.userId, ME, what);
  }
  assert.equal(seen.length, 9);
});

test('a brand new account gets zeros and empty lists, not an error', async () => {
  state.user = { favoriteTouristSpots: [] };
  state.reviews = []; state.trips = []; state.chats = [];
  const d = await run();
  assert.deepEqual(d.counts, { favorites: 0, reviews: 0, pendingReviews: 0, trips: 0, asks: 0 });
  assert.deepEqual([d.reviews, d.trips, d.asks], [[], [], []]);
});

test('very long questions are cut short', async () => {
  state.user = { favoriteTouristSpots: [] };
  state.chats = [{ _id: 'c', userId: ME, updatedAt: 'w', messages: [{ role: 'user', content: 'x'.repeat(900) }] }];
  assert.equal((await run()).asks[0].question.length, 200);
});
