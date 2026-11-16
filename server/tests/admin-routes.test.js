require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { signToken } = require('../src/utils/token');

// Who may reach the new admin routes. Every request here is refused or rejected BEFORE the database is touched.
let current;
User.findById = async () => current;
const ID = '64b7f0f0f0f0f0f0f0f0f0f0';
const as = (role) => {
  current = { _id: ID, role, status: 'active', tokenVersion: 0 };
  return `Bearer ${signToken(current)}`;
};
const OTHER = '64b7f0f0f0f0f0f0f0f0f0f1';

test('the new admin routes need a login', async () => {
  for (const [method, url] of [['get', '/api/admin/health'], ['post', '/api/admin/spots/bulk'], ['post', '/api/admin/reviews/bulk'], ['get', '/api/admin/activity'], ['get', '/api/admin/export/spots'], ['get', `/api/users/${OTHER}/overview`], ['post', `/api/users/${OTHER}/force-logout`], ['post', `/api/users/${OTHER}/unlock`]]) {
    assert.equal((await request(app)[method](url)).status, 401, `${method} ${url}`);
  }
});

test('visitors are refused everywhere', async () => {
  const h = as('visitor');
  for (const [method, url] of [['get', '/api/admin/health'], ['post', '/api/admin/spots/bulk'], ['post', '/api/admin/reviews/bulk'], ['get', '/api/admin/activity'], ['get', '/api/admin/export/spots'], ['get', `/api/users/${OTHER}/overview`], ['post', `/api/users/${OTHER}/force-logout`], ['post', `/api/users/${OTHER}/unlock`]]) {
    assert.equal((await request(app)[method](url).set('Authorization', h)).status, 403, `${method} ${url}`);
  }
});

test('editors may not use the admin-only routes', async () => {
  const h = as('editor');
  for (const [method, url] of [['post', '/api/admin/reviews/bulk'], ['get', '/api/admin/activity'], ['get', '/api/admin/export/users'], ['get', '/api/admin/export/reviews'], ['get', '/api/admin/export/activity'], ['post', `/api/users/${OTHER}/force-logout`]]) {
    assert.equal((await request(app)[method](url).set('Authorization', h)).status, 403, `${method} ${url}`);
  }
});

test('bulk spot actions reject a bad request before touching the database', async () => {
  const h = as('editor');
  const post = (body) => request(app).post('/api/admin/spots/bulk').set('Authorization', h).send(body);
  assert.equal((await post({})).status, 422);
  assert.equal((await post({ ids: ['x'], action: 'publish' })).status, 422);
  assert.equal((await post({ ids: [ID], action: 'rm -rf' })).status, 422);
  assert.equal((await post({ ids: [ID], action: 'delete' })).status, 403); // editors cannot delete
});

test('an unknown export is a 404 and a bad activity filter is a 400', async () => {
  assert.equal((await request(app).get('/api/admin/export/secrets').set('Authorization', as('admin'))).status, 404);
  assert.equal((await request(app).get('/api/admin/activity?type=nonsense').set('Authorization', as('admin'))).status, 400);
  assert.equal((await request(app).get('/api/admin/health?check=nonsense').set('Authorization', as('editor'))).status, 400);
});
