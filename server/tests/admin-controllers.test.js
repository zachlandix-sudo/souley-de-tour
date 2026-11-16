// The admin controllers run for real here; only the database models are replaced by small fakes
// (so this file needs neither MongoDB nor mongoose, and every call the controllers make to the database is recorded).
require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');

const SRC = path.join(__dirname, '..', 'src');
const fake = (rel, exports) => {
  const file = require.resolve(path.join(SRC, rel));
  const m = new Module(file);
  m.filename = file; m.exports = exports; m.loaded = true;
  require.cache[file] = m;
  return exports;
};
// a query that can be chained (.select().populate().sort()...) and awaited, like a mongoose query
const query = (list) => {
  const q = { select: () => q, populate: () => q, sort: () => q, skip: () => q, limit: () => q, lean: async () => list, then: (ok, bad) => Promise.resolve(list).then(ok, bad) };
  return q;
};

const calls = [];
const audit = [];
const state = { spots: [], reviews: [], users: [], trips: [] };
const inIds = (f) => (f && f._id && f._id.$in) || null;

const TouristSpot = fake('models/TouristSpot.js', {
  find(f) { calls.push(['spot.find', f]); const ids = inIds(f); return query(ids ? state.spots.filter((s) => ids.includes(s._id)) : state.spots.filter((s) => !f || !f.status || s.status === f.status)); },
  updateMany: async (f, u) => { calls.push(['spot.updateMany', f, u]); },
  deleteMany: async (f) => { calls.push(['spot.deleteMany', f]); },
});
const Review = fake('models/Review.js', {
  find(f) { calls.push(['review.find', f]); const ids = inIds(f); return query(ids ? state.reviews.filter((r) => ids.includes(r._id)) : state.reviews.filter((r) => String(r.userId) === String(f && f.userId) || !(f && f.userId))); },
  updateMany: async (f, u) => { calls.push(['review.updateMany', f, u]); },
  deleteMany: async (f) => { calls.push(['review.deleteMany', f]); },
  countDocuments: async (f) => state.reviews.filter((r) => String(r.userId) === String(f.userId) && (!f.status || r.status === f.status)).length,
});
const User = fake('models/User.js', {
  findById: async (id) => state.users.find((u) => u._id === id) || null,
  find: (f) => query(state.users),
  updateOne: async (f, u) => { calls.push(['user.updateOne', f, u]); },
  countDocuments: async () => state.users.length,
});
const Itinerary = fake('models/Itinerary.js', { countDocuments: async () => state.trips.length, find: () => query(state.trips) });
const AuditLog = fake('models/AuditLog.js', {
  create: async (d) => { audit.push(d); },
  find: (f) => { calls.push(['audit.find', f]); return query([{ _id: 'a1', action: 'spot.published', actorName: 'Ad', createdAt: new Date('2026-11-14T08:00:00Z'), targetLabel: 'Alpha' }]); },
  countDocuments: async () => 41,
});
const recalced = [];
fake('controllers/reviewController.js', { recalcSpotRating: async (id) => { recalced.push(String(id)); } });

const admin = require('../src/controllers/adminController');
const users = require('../src/controllers/userController');

const ID = (n) => String(n).padStart(24, '0'); // a valid 24-char id
const ADMIN = { _id: ID(900), fullName: 'Ad Min', role: 'admin' };
const EDITOR = { _id: ID(901), fullName: 'Ed Itor', role: 'editor' };

const run = async (handler, req) => {
  const out = { status: 200, headers: {}, body: undefined, sent: undefined, err: undefined };
  const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; }, send(b) { out.sent = b; return res; }, setHeader(k, v) { out.headers[k] = v; } };
  await handler({ query: {}, params: {}, body: {}, ...req }, res, (e) => { out.err = e; });
  return out;
};

test.beforeEach(() => {
  calls.length = 0; audit.length = 0; recalced.length = 0;
  state.spots = [
    { _id: ID(1), name: 'Alpha Falls', status: 'draft', municipality: 'Sogod', slug: 'alpha-falls', location: { coordinates: [125.01, 10.38] }, categoryIds: [{ name: 'Waterfalls' }, { name: 'Nature' }], viewCount: 4, createdAt: new Date('2026-10-01') },
    { _id: ID(2), name: '=SUM(1+1) Cove', status: 'published', municipality: 'Maasin City', slug: 'cove' },
    { _id: ID(3), name: 'Gamma Cave', status: 'published', municipality: 'Liloan', slug: 'gamma' },
    { _id: ID(4), name: 'Delta Beach', status: 'archived', municipality: 'Sogod', slug: 'delta' },
  ];
  state.reviews = [
    { _id: ID(11), touristSpotId: ID(1), userId: ID(50), rating: 5, status: 'pending', title: 'Great', comment: 'Loved it, "really"', createdAt: new Date('2026-11-01') },
    { _id: ID(12), touristSpotId: ID(1), userId: ID(51), rating: 4, status: 'pending' },
    { _id: ID(13), touristSpotId: ID(2), userId: ID(50), rating: 3, status: 'approved' },
  ];
  state.users = [
    { _id: ID(50), fullName: 'Visi Tor', email: 'v@x.ph', role: 'visitor', status: 'active', favoriteTouristSpots: [1, 2, 3], lockUntil: new Date(Date.now() + 600000), toJSON() { return { _id: this._id, fullName: this.fullName, email: this.email, role: this.role, status: this.status, favoriteTouristSpots: this.favoriteTouristSpots }; } },
    { _id: ADMIN._id, fullName: 'Ad Min', email: 'a@x.ph', role: 'admin', status: 'active', favoriteTouristSpots: [], toJSON() { return { _id: this._id, fullName: this.fullName }; } },
  ];
  state.trips = [{ _id: 't1', title: 'Weekend', generatedByAI: true, createdAt: new Date(), days: [{}, {}] }];
});

// ---------------------------------------------------------------- bulk spots
test('bulk spots: the action must be a known one (inherited names like "constructor" are not)', async () => {
  for (const action of [undefined, 'explode', 'constructor', '__proto__', 7, ['publish']]) {
    const r = await run(admin.bulkSpots, { user: ADMIN, body: { ids: [ID(1)], action } });
    assert.equal(r.err.statusCode, 422, String(action));
  }
  assert.equal(calls.length, 0);
});

test('bulk spots: ids must be 1 to 100 distinct valid ids', async () => {
  for (const ids of [undefined, [], 'abc', [ID(1), 'nope'], [ID(1), 5], Array.from({ length: 101 }, (_, i) => ID(i + 1))]) {
    const r = await run(admin.bulkSpots, { user: ADMIN, body: { ids, action: 'publish' } });
    assert.equal(r.err.statusCode, 422, JSON.stringify(ids)?.slice(0, 30));
  }
  assert.equal(calls.length, 0);
});

test('bulk spots: only an admin may delete', async () => {
  const r = await run(admin.bulkSpots, { user: EDITOR, body: { ids: [ID(1)], action: 'delete' } });
  assert.equal(r.err.statusCode, 403);
  assert.equal(calls.length, 0);
});

test('bulk spots: publish changes only the spots that exist, once, and writes one activity line', async () => {
  const r = await run(admin.bulkSpots, { user: EDITOR, body: { ids: [ID(1), ID(1), ID(2), ID(99)], action: 'publish' } });
  assert.equal(r.err, undefined);
  assert.deepEqual(r.body.data, { action: 'publish', requested: 3, matched: 2 });
  const up = calls.find((c) => c[0] === 'spot.updateMany');
  assert.deepEqual(up[1], { _id: { $in: [ID(1), ID(2)] } });
  assert.deepEqual(up[2], { $set: { status: 'published' } });
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, 'spot.bulk_published');
  assert.equal(audit[0].actorName, 'Ed Itor');
  assert.equal(audit[0].detail, '2 spots');
  assert.equal(audit[0].targetLabel, 'Alpha Falls, =SUM(1+1) Cove');
});

test('bulk spots: one spot gets the single-spot activity name and its id', async () => {
  await run(admin.bulkSpots, { user: ADMIN, body: { ids: [ID(3)], action: 'feature' } });
  assert.deepEqual(calls.find((c) => c[0] === 'spot.updateMany')[2], { $set: { isFeatured: true } });
  assert.equal(audit[0].action, 'spot.featured');
  assert.equal(audit[0].targetId, ID(3));
  assert.equal(audit[0].detail, undefined);
});

test('bulk spots: delete takes the spots reviews with it, and a long label is shortened', async () => {
  state.spots = Array.from({ length: 6 }, (_, i) => ({ _id: ID(i + 1), name: `Spot ${i + 1}` }));
  const r = await run(admin.bulkSpots, { user: ADMIN, body: { ids: state.spots.map((s) => s._id), action: 'delete' } });
  assert.equal(r.body.data.matched, 6);
  assert.deepEqual(calls.filter((c) => c[0].endsWith('deleteMany')).map((c) => c[0]), ['review.deleteMany', 'spot.deleteMany']);
  assert.equal(audit[0].targetLabel, 'Spot 1, Spot 2, Spot 3 +3 more');
  assert.equal(audit[0].action, 'spot.bulk_deleted');
});

test('bulk spots: ids that match nothing are a 404 and change nothing', async () => {
  const r = await run(admin.bulkSpots, { user: ADMIN, body: { ids: [ID(77)], action: 'archive' } });
  assert.equal(r.err.statusCode, 404);
  assert.ok(!calls.some((c) => c[0] === 'spot.updateMany'));
  assert.equal(audit.length, 0);
});

// ---------------------------------------------------------------- bulk reviews
test('bulk reviews: approve sets the status, recounts each spot once, and is logged', async () => {
  const r = await run(admin.bulkReviews, { user: ADMIN, body: { ids: [ID(11), ID(12), ID(13)], action: 'approve' } });
  assert.deepEqual(r.body.data, { action: 'approve', requested: 3, matched: 3 });
  assert.deepEqual(calls.find((c) => c[0] === 'review.updateMany')[2], { $set: { status: 'approved' } });
  assert.deepEqual(recalced.sort(), [ID(1), ID(2)]);
  assert.equal(audit[0].action, 'review.bulk_approved');
  assert.equal(audit[0].detail, 'on 2 spots');
  assert.equal(audit[0].targetLabel, '3 reviews');
});

test('bulk reviews: delete removes them and still recounts the stars', async () => {
  await run(admin.bulkReviews, { user: ADMIN, body: { ids: [ID(13)], action: 'delete' } });
  assert.ok(calls.some((c) => c[0] === 'review.deleteMany'));
  assert.deepEqual(recalced, [ID(2)]);
  assert.equal(audit[0].detail, 'on 1 spot');
  assert.equal(audit[0].targetLabel, '1 review');
});

test('bulk reviews: bad action or ids are a 422', async () => {
  assert.equal((await run(admin.bulkReviews, { user: ADMIN, body: { ids: [ID(11)], action: 'toString' } })).err.statusCode, 422);
  assert.equal((await run(admin.bulkReviews, { user: ADMIN, body: { ids: [], action: 'approve' } })).err.statusCode, 422);
});

// ---------------------------------------------------------------- activity
test('activity: returns the page with the pagination numbers', async () => {
  const r = await run(admin.activity, { user: ADMIN, query: { page: '2', limit: '20' } });
  assert.equal(r.body.data.length, 1);
  assert.deepEqual(r.body.pagination, { page: 2, limit: 20, total: 41, pages: 3 });
});

test('activity: type must be known and a single value; the search text is escaped', async () => {
  assert.equal((await run(admin.activity, { user: ADMIN, query: { type: 'nonsense' } })).err.statusCode, 400);
  assert.equal((await run(admin.activity, { user: ADMIN, query: { type: ['spot', 'user'] } })).err.statusCode, 400);
  assert.equal((await run(admin.activity, { user: ADMIN, query: { q: { $ne: 'x' } } })).err.statusCode, 400);
  await run(admin.activity, { user: ADMIN, query: { type: 'spot', q: 'a.b(c' } });
  const f = calls.filter((c) => c[0] === 'audit.find').pop()[1];
  assert.equal(f.targetType, 'spot');
  assert.equal(f.$or[0].actorName.source, 'a\\.b\\(c');
});

// ---------------------------------------------------------------- health
test('health: a score and every check; an unknown check is a 400; the limit is bounded', async () => {
  const r = await run(admin.health, { user: EDITOR });
  assert.equal(r.body.success, true);
  assert.ok(Number.isInteger(r.body.data.score));
  assert.equal(r.body.data.totals.all, 4);
  assert.ok(r.body.data.checks.length >= 8);
  assert.ok(r.body.data.generatedAt);
  assert.equal((await run(admin.health, { user: EDITOR, query: { check: 'nope' } })).err.statusCode, 400);
  const one = await run(admin.health, { user: EDITOR, query: { check: 'noPin', limit: '99999' } });
  assert.equal(one.body.data.checks.length, 1);
  assert.equal(one.body.data.checks[0].key, 'noPin');
});

// ---------------------------------------------------------------- export
test('export: unknown list is a 404; an editor may export spots only', async () => {
  assert.equal((await run(admin.exportCsv, { user: ADMIN, params: { kind: 'passwords' } })).err.statusCode, 404);
  assert.equal((await run(admin.exportCsv, { user: ADMIN, params: { kind: 'constructor' } })).err.statusCode, 404);
  for (const kind of ['users', 'reviews', 'activity']) assert.equal((await run(admin.exportCsv, { user: EDITOR, params: { kind } })).err.statusCode, 403, kind);
  assert.equal((await run(admin.exportCsv, { user: EDITOR, params: { kind: 'spots' } })).err, undefined);
});

test('export: spots come out as a CSV download with a formula-safe name column, and the export is logged', async () => {
  const r = await run(admin.exportCsv, { user: EDITOR, params: { kind: 'spots' }, query: { status: 'all' } });
  assert.match(r.headers['Content-Type'], /^text\/csv; charset=utf-8/);
  assert.match(r.headers['Content-Disposition'], /^attachment; filename="souley-spots-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.equal(r.headers['Cache-Control'], 'no-store');
  const lines = r.sent.replace(/^\uFEFF/, '').split('\r\n');
  assert.match(lines[0], /^Name,Slug,Status,Featured,Municipality/);
  assert.match(lines[1], /^Alpha Falls,alpha-falls,draft,no,Sogod/);
  assert.ok(lines[1].includes('Waterfalls; Nature'));
  assert.ok(lines[1].includes(',10.38,125.01,'), 'latitude then longitude');
  assert.ok(lines[2].startsWith("'=SUM(1+1) Cove,"), lines[2]);
  assert.equal(audit[0].action, 'export.spots');
  assert.equal(audit[0].detail, '4 rows');
});

test('export: a bad status filter is a 400, a status filter reaches the query', async () => {
  assert.equal((await run(admin.exportCsv, { user: ADMIN, params: { kind: 'spots' }, query: { status: 'weird' } })).err.statusCode, 400);
  await run(admin.exportCsv, { user: ADMIN, params: { kind: 'spots' }, query: { status: 'published' } });
  assert.deepEqual(calls.filter((c) => c[0] === 'spot.find').pop()[1], { status: 'published' });
});

test('export: reviews keep commas and quotes inside one cell', async () => {
  state.reviews[0].userId = { fullName: 'Visi Tor', email: 'v@x.ph' };
  state.reviews[0].touristSpotId = { name: 'Alpha Falls' };
  const r = await run(admin.exportCsv, { user: ADMIN, params: { kind: 'reviews' } });
  assert.ok(r.sent.includes('"Loved it, ""really"""'));
});

// ---------------------------------------------------------------- users
test('users: the details panel counts reviews, trips and favorites and says if the account is locked', async () => {
  const r = await run(users.overview, { user: ADMIN, params: { id: ID(50) } });
  assert.deepEqual(r.body.data.counts, { reviews: 2, approvedReviews: 1, itineraries: 1, favorites: 3 });
  assert.equal(r.body.data.user.locked, true);
  assert.equal(r.body.data.user.passwordHash, undefined);
  assert.deepEqual(r.body.data.recentTrips[0], { _id: 't1', title: 'Weekend', generatedByAI: true, createdAt: state.trips[0].createdAt, days: 2 });
  assert.equal((await run(users.overview, { user: ADMIN, params: { id: ID(77) } })).err.statusCode, 404);
});

test('users: sign out everywhere bumps the session counter, never on yourself, and is logged', async () => {
  const r = await run(users.forceLogout, { user: ADMIN, params: { id: ID(50) } });
  assert.match(r.body.message, /Visi Tor was signed out/);
  assert.deepEqual(calls.find((c) => c[0] === 'user.updateOne')[2], { $inc: { tokenVersion: 1 } });
  assert.equal(audit[0].action, 'user.signed_out');
  calls.length = 0;
  assert.equal((await run(users.forceLogout, { user: ADMIN, params: { id: ADMIN._id } })).err.statusCode, 400);
  assert.equal(calls.length, 0);
  assert.equal((await run(users.forceLogout, { user: ADMIN, params: { id: ID(77) } })).err.statusCode, 404);
});

test('users: unlock clears the failed-login counter and the lock date', async () => {
  await run(users.unlock, { user: ADMIN, params: { id: ID(50) } });
  assert.deepEqual(calls.find((c) => c[0] === 'user.updateOne')[2], { $set: { failedLoginCount: 0 }, $unset: { lockUntil: 1 } });
  assert.equal(audit[0].action, 'user.unlocked');
});

test('users: the list says who is locked out', async () => {
  const r = await run(users.list, { user: ADMIN });
  assert.deepEqual(r.body.data.map((u) => u.locked), [true, false]);
});

test('an activity line that cannot be written never breaks the action', async () => {
  const create = AuditLog.create;
  AuditLog.create = async () => { throw new Error('db down'); };
  const r = await run(admin.bulkSpots, { user: ADMIN, body: { ids: [ID(3)], action: 'archive' } });
  AuditLog.create = create;
  assert.equal(r.err, undefined);
  assert.equal(r.body.success, true);
});
