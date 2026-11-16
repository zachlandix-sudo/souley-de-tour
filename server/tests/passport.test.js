require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');
const { MAX_STAMPS, mergeStamps, safeDate, toClientStamps } = require('../src/utils/passport');

const NOW = new Date('2026-11-15T10:00:00.000Z');
const A = '64b7f0f0f0f0f0f0f0f0f0a1';
const B = '64b7f0f0f0f0f0f0f0f0f0b2';
const C = '64b7f0f0f0f0f0f0f0f0f0c3';
const ok = new Set([A, B]);

test('mergeStamps adds only valid spots and ignores unknown ones', () => {
  const r = mergeStamps([], [{ spot: A, at: '2026-11-01T00:00:00Z', method: 'gps' }, { spot: C, at: '2026-11-02T00:00:00Z' }], ok, { now: NOW });
  assert.equal(r.added, 1);
  assert.deepEqual(r.stamps.map((s) => String(s.spot)), [A]);
});

test('mergeStamps keeps an existing stamp, but an earlier visit date wins', () => {
  const existing = [{ spot: A, at: new Date('2026-11-05T00:00:00Z'), method: 'gps' }];
  const same = mergeStamps(existing, [{ spot: A, at: '2026-11-09T00:00:00Z', method: 'manual' }], ok, { now: NOW });
  assert.equal(same.added, 0);
  assert.equal(same.stamps[0].method, 'gps');
  assert.equal(same.stamps[0].at.toISOString(), '2026-11-05T00:00:00.000Z');
  const earlier = mergeStamps(existing, [{ spot: A, at: '2026-10-01T00:00:00Z', method: 'manual' }], ok, { now: NOW });
  assert.equal(earlier.stamps[0].at.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(earlier.stamps[0].method, 'manual');
});

test('mergeStamps does not change what it was given and can be repeated', () => {
  const existing = [{ spot: A, at: new Date('2026-11-05T00:00:00Z'), method: 'gps' }];
  const incoming = [{ spot: B, at: '2026-11-06T00:00:00Z', method: 'manual' }];
  const first = mergeStamps(existing, incoming, ok, { now: NOW });
  assert.equal(existing.length, 1);
  const again = mergeStamps(first.stamps, incoming, ok, { now: NOW });
  assert.equal(again.added, 0);
  assert.equal(again.stamps.length, 2);
});

test('mergeStamps never goes over the maximum and fixes bad dates and methods', () => {
  const ids = Array.from({ length: 8 }, (_, i) => `64b7f0f0f0f0f0f0f0f0f0${(10 + i).toString(16).padStart(2, '0')}`);
  const r = mergeStamps([], ids.map((spot) => ({ spot, at: 'nonsense', method: 'teleport' })), new Set(ids), { now: NOW, max: 5 });
  assert.equal(r.stamps.length, 5);
  assert.equal(r.added, 5);
  assert.ok(r.stamps.every((s) => s.method === 'gps' && s.at.getTime() === NOW.getTime()));
  assert.equal(MAX_STAMPS, 500);
});

test('safeDate refuses a date far in the future', () => {
  assert.equal(safeDate('2099-01-01', NOW).getTime(), NOW.getTime());
  assert.equal(safeDate('2026-11-14T00:00:00Z', NOW).toISOString(), '2026-11-14T00:00:00.000Z');
  assert.equal(safeDate(undefined, NOW).getTime(), NOW.getTime());
});

test('toClientStamps flattens populated stamps and skips deleted spots', () => {
  const list = toClientStamps([
    { spot: { _id: A, name: 'Alpha Falls', slug: 'alpha-falls', municipality: 'Maasin City' }, at: new Date('2026-11-01T00:00:00Z'), method: 'manual' },
    { spot: null, at: new Date(), method: 'gps' },
  ]);
  assert.deepEqual(list, [{ spot: A, at: '2026-11-01T00:00:00.000Z', method: 'manual', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha-falls' }]);
});

test('the user model keeps stamps out of normal reads and validates the passport colour', () => {
  assert.equal(User.schema.path('stamps').options.select, false);
  const bad = new User({ fullName: 'Ana Cruz', email: 'a@b.co', passwordHash: 'x', passport: { color: 'pink' } });
  assert.ok(bad.validateSync().errors['passport.color']);
  const fine = new User({ fullName: 'Ana Cruz', email: 'a@b.co', passwordHash: 'x' });
  assert.equal(fine.validateSync(), undefined);
  assert.equal(fine.passport.color, 'black');
  assert.equal(fine.toJSON().passport.homeTown, '');
});

// ---- routes (validation and login checks only; no database) ----
const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
let current;
User.findById = async () => current;
const authed = () => {
  current = { _id: ID, role: 'visitor', status: 'active', tokenVersion: 0 };
  return `Bearer ${signToken(current)}`;
};

test('passport routes need a login', async () => {
  for (const [method, url] of [['get', '/api/users/me/passport/stamps'], ['put', '/api/users/me/passport/stamps'], ['post', `/api/users/me/passport/stamps/${A}`], ['delete', `/api/users/me/passport/stamps/${A}`], ['patch', '/api/users/me/passport']]) {
    const r = await request(app)[method](url).send({});
    assert.equal(r.status, 401, `${method} ${url}`);
  }
});

test('merging stamps validates the list', async () => {
  const auth = authed();
  const none = await request(app).put('/api/users/me/passport/stamps').set('Authorization', auth).send({});
  assert.equal(none.status, 422);
  const bad = await request(app).put('/api/users/me/passport/stamps').set('Authorization', auth).send({ stamps: [{ spot: 'nope', at: 'yesterday', method: 'teleport' }] });
  assert.equal(bad.status, 422);
  const fields = bad.body.errors.map((e) => e.field);
  for (const f of ['stamps[0].spot', 'stamps[0].at', 'stamps[0].method']) assert.ok(fields.includes(f), f);
  const huge = await request(app).put('/api/users/me/passport/stamps').set('Authorization', auth).send({ stamps: Array.from({ length: MAX_STAMPS + 1 }, () => ({ spot: A })) });
  assert.equal(huge.status, 422);
});

test('adding a stamp checks the spot id and the method', async () => {
  const auth = authed();
  const badId = await request(app).post('/api/users/me/passport/stamps/not-an-id').set('Authorization', auth).send({});
  assert.equal(badId.status, 400);
  const badMethod = await request(app).post(`/api/users/me/passport/stamps/${A}`).set('Authorization', auth).send({ method: 'teleport', at: 'later' });
  assert.equal(badMethod.status, 422);
  assert.ok(badMethod.body.errors.some((e) => e.field === 'method'));
  assert.ok(badMethod.body.errors.some((e) => e.field === 'at'));
});

test('the passport profile only accepts a short home town and a known colour', async () => {
  const auth = authed();
  const r = await request(app).patch('/api/users/me/passport').set('Authorization', auth).send({ homeTown: 'x'.repeat(61), color: 'pink' });
  assert.equal(r.status, 422);
  assert.ok(r.body.errors.some((e) => e.field === 'homeTown'));
  assert.ok(r.body.errors.some((e) => e.field === 'color'));
});
