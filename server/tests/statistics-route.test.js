require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const TouristSpot = require('../src/models/TouristSpot');
const Review = require('../src/models/Review');
const Itinerary = require('../src/models/Itinerary');
const AiConversation = require('../src/models/AiConversation');
const Category = require('../src/models/Category');
const { signToken } = require('../src/utils/token');

// No database: every aggregation answers with nothing, which must still give a full, zero-filled payload.
let current;
User.findById = async () => current;
const seen = [];
for (const M of [TouristSpot, Review, User, Itinerary, AiConversation]) M.aggregate = async (p) => { seen.push(p); return []; };
AiConversation.countDocuments = async () => 0;
Category.find = () => ({ lean: async () => [] });

const as = (role) => {
  current = { _id: '64b7f0f0f0f0f0f0f0f0f0f0', role, status: 'active', tokenVersion: 0 };
  return `Bearer ${signToken(current)}`;
};

test('statistics need a login and an admin or editor role', async () => {
  assert.equal((await request(app).get('/api/admin/statistics')).status, 401);
  assert.equal((await request(app).get('/api/admin/statistics').set('Authorization', as('visitor'))).status, 403);
  assert.equal((await request(app).get('/api/admin/statistics').set('Authorization', as('editor'))).status, 200);
  assert.equal((await request(app).get('/api/admin/statistics').set('Authorization', as('admin'))).status, 200);
});

test('statistics: default range, payload shape and the range switch', async () => {
  const r = await request(app).get('/api/admin/statistics').set('Authorization', as('admin'));
  assert.equal(r.body.success, true);
  assert.equal(r.body.data.range, '30d');
  assert.equal(r.body.data.timeline.keys.length, 30);
  for (const k of ['users', 'spots', 'reviews', 'trips', 'aiChats']) assert.equal(r.body.data.timeline.series[k].length, 30, k);
  for (const k of ['spotStatus', 'spotCategory', 'spotDifficulty', 'reviewStatus', 'userRole', 'tripOrigin']) assert.ok(Array.isArray(r.body.data.pies[k]), k);
  assert.equal(r.body.data.bars.ratings.length, 5);
  const m = await request(app).get('/api/admin/statistics?range=12m').set('Authorization', as('admin'));
  assert.equal(m.body.data.timeline.keys.length, 12);
  assert.equal(m.body.data.unit, 'month');
});

test('statistics: an unknown range is a 400, not a guess', async () => {
  const header = as('admin');
  assert.equal((await request(app).get('/api/admin/statistics?range=forever').set('Authorization', header)).status, 400);
  assert.equal((await request(app).get('/api/admin/statistics?range=7d&range=30d').set('Authorization', header)).status, 400);
});
