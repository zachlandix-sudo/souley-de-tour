require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');

const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
let current; // user returned by the stubbed User.findById
User.findById = async () => current;
const asUser = (over = {}) => {
  current = { _id: ID, role: 'visitor', status: 'active', tokenVersion: 0, ...over };
  return `Bearer ${signToken(current)}`;
};

test('health check and 404 shape', async () => {
  const ok = await request(app).get('/api/health');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.success, true);
  const nf = await request(app).get('/api/nope');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.success, false);
  assert.match(nf.body.message, /Route not found/);
});

test('register validation returns 422 with field errors (no DB hit)', async () => {
  const r = await request(app).post('/api/auth/register').send({ fullName: 'A', email: 'bad', password: 'short', confirmPassword: 'other' });
  assert.equal(r.status, 422);
  const fields = r.body.errors.map((e) => e.field);
  for (const f of ['fullName', 'email', 'password', 'confirmPassword']) assert.ok(fields.includes(f), f);
});

test('login validation requires email and password', async () => {
  const r = await request(app).post('/api/auth/login').send({ email: 'nope' });
  assert.equal(r.status, 422);
  assert.ok(r.body.errors.some((e) => e.field === 'password'));
});

test('AI query validation: too short / bad numbers', async () => {
  const short = await request(app).post('/api/ai/recommendations').send({ question: 'hi' });
  assert.equal(short.status, 422);
  const days = await request(app).post('/api/ai/itinerary').send({ question: 'Plan a trip', durationDays: 51 }); // the planner allows up to 50
  assert.equal(days.status, 422);
  assert.ok(days.body.errors.some((e) => e.field === 'durationDays'));
  const pace = await request(app).post('/api/ai/itinerary').send({ question: 'Plan a trip', pace: 'sprint', startDate: 'tomorrow-ish' });
  assert.equal(pace.status, 422);
  assert.ok(pace.body.errors.some((e) => e.field === 'pace'));
  assert.ok(pace.body.errors.some((e) => e.field === 'startDate'));
});

test('protected routes reject missing, garbage and stale tokens', async () => {
  const none = await request(app).get('/api/auth/me');
  assert.equal(none.status, 401);
  const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage');
  assert.equal(bad.status, 401);
  const stale = signToken({ _id: ID, role: 'visitor', tokenVersion: 0 });
  current = { _id: ID, role: 'visitor', status: 'active', tokenVersion: 1 }; // password changed / logout-all
  const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${stale}`);
  assert.equal(r.status, 401);
});

test('deleted and suspended accounts are blocked', async () => {
  const header = asUser();
  current = null;
  assert.equal((await request(app).get('/api/itineraries').set('Authorization', header)).status, 401);
  current = { _id: ID, role: 'visitor', status: 'suspended', tokenVersion: 0 };
  assert.equal((await request(app).get('/api/itineraries').set('Authorization', header)).status, 403);
});

test('token is also accepted from the httpOnly cookie', async () => {
  const header = asUser();
  const r = await request(app).get('/api/itineraries/not-an-id').set('Cookie', `token=${header.slice(7)}`);
  assert.equal(r.status, 400); // got past auth, stopped by ObjectId check
});

test('invalid ObjectId params give 400', async () => {
  const header = asUser();
  const r = await request(app).get('/api/itineraries/123').set('Authorization', header);
  assert.equal(r.status, 400);
  assert.match(r.body.message, /Invalid id/);
});

test('itinerary body validation', async () => {
  const header = asUser();
  const r = await request(app).post('/api/itineraries').set('Authorization', header).send({ title: '  ', days: 'x' });
  assert.equal(r.status, 422);
  assert.ok(r.body.errors.some((e) => e.field === 'title'));
});

test('role checks: visitor cannot list all reviews or open admin', async () => {
  const header = asUser({ role: 'visitor' });
  assert.equal((await request(app).get('/api/reviews').set('Authorization', header)).status, 403);
  assert.equal((await request(app).get('/api/admin/dashboard').set('Authorization', header)).status, 403);
});

test('review photo rules (max 3, image data URLs only, size cap)', async () => {
  const header = asUser();
  const img = 'data:image/jpeg;base64,/9j/4AAQ';
  const put = (body) => request(app).put(`/api/reviews/${ID}`).set('Authorization', header).send({ rating: 5, comment: 'Nice', ...body });
  const tooMany = await put({ photos: [img, img, img, img] });
  assert.equal(tooMany.status, 422);
  const notImg = await put({ photos: ['data:text/html;base64,PHNjcmlwdD4='] });
  assert.equal(notImg.status, 422);
  const huge = await put({ photos: [`data:image/png;base64,${'A'.repeat(300001)}`] });
  assert.equal(huge.status, 422);
  const badRating = await put({ rating: 9 });
  assert.equal(badRating.status, 422);
});

test('JSON body over 2mb is rejected', async () => {
  const r = await request(app).post('/api/ai/recommendations').send({ question: 'x'.repeat(2.5 * 1024 * 1024) });
  assert.equal(r.status, 413);
});
