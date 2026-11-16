require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler, notFound } = require('../src/middleware/error');
const AppError = require('../src/utils/AppError');

const run = (err) => {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  const quiet = console.error; console.error = () => {};
  errorHandler(err, {}, res, () => {});
  console.error = quiet;
  return out;
};

test('AppError keeps status and details', () => {
  const r = run(new AppError('bad', 422, [{ field: 'a' }]));
  assert.equal(r.status, 422);
  assert.deepEqual(r.body.errors, [{ field: 'a' }]);
});
test('mongoose ValidationError -> 422', () => {
  const e = Object.assign(new Error('x'), { name: 'ValidationError', errors: { name: { path: 'name', message: 'Required' } } });
  const r = run(e);
  assert.equal(r.status, 422);
  assert.deepEqual(r.body.errors, [{ field: 'name', message: 'Required' }]);
});
test('duplicate key -> 409 naming the field', () => {
  const r = run(Object.assign(new Error('dup'), { code: 11000, keyPattern: { email: 1 } }));
  assert.equal(r.status, 409);
  assert.match(r.body.message, /email/);
});
test('CastError -> 400', () => {
  const r = run(Object.assign(new Error('c'), { name: 'CastError', path: '_id' }));
  assert.equal(r.status, 400);
  assert.equal(r.body.message, 'Invalid _id.');
});
test('unknown errors: 500, stack in dev, hidden message in production', () => {
  const dev = run(new Error('secret detail'));
  assert.equal(dev.status, 500);
  assert.ok(dev.body.stack);
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const prod = run(new Error('secret detail'));
  process.env.NODE_ENV = prev;
  assert.equal(prod.body.message, 'Server error.');
  assert.equal(prod.body.stack, undefined);
});
test('notFound builds a 404 AppError', () => {
  let got;
  notFound({ method: 'GET', originalUrl: '/x' }, {}, (e) => { got = e; });
  assert.equal(got.statusCode, 404);
});
