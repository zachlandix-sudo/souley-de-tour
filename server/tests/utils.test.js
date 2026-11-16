require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const slugify = require('../src/utils/slugify');
const escapeRegex = require('../src/utils/escapeRegex');
const pagination = require('../src/utils/pagination');
const AppError = require('../src/utils/AppError');
const asyncHandler = require('../src/utils/asyncHandler');
const { signToken, cookieOptions } = require('../src/utils/token');
const jwt = require('jsonwebtoken');

test('slugify removes accents, punctuation and edge dashes', () => {
  assert.equal(slugify('  Tinago Falls & Cave! '), 'tinago-falls-cave');
  assert.equal(slugify('Café Niño'), 'cafe-nino');
  assert.equal(slugify(), '');
});

test('escapeRegex neutralises regex characters', () => {
  const re = new RegExp(escapeRegex('a.b*c(d)'));
  assert.ok(re.test('a.b*c(d)'));
  assert.ok(!re.test('aXbbc(d)'));
});

test('pagination clamps page and limit', () => {
  assert.deepEqual(pagination({}), { page: 1, limit: 12, skip: 0 });
  assert.deepEqual(pagination({ page: '3', limit: '10' }), { page: 3, limit: 10, skip: 20 });
  assert.equal(pagination({ page: '-4' }).page, 1);
  assert.equal(pagination({ limit: '999' }).limit, 50);
  assert.equal(pagination({ limit: '999' }, 100).limit, 100);
  assert.equal(pagination({ limit: '0' }).limit, 12); // 0 is falsy -> default
});

test('AppError carries status, details and isOperational', () => {
  const e = new AppError('nope', 404, [{ field: 'x' }]);
  assert.equal(e.statusCode, 404);
  assert.equal(e.isOperational, true);
  assert.deepEqual(e.details, [{ field: 'x' }]);
  assert.equal(new AppError('x').statusCode, 500);
});

test('asyncHandler forwards rejections to next', async () => {
  const err = new Error('boom');
  let got;
  await asyncHandler(async () => { throw err; })({}, {}, (e) => { got = e; });
  assert.equal(got, err);
});

test('signToken embeds id, role and token version', () => {
  const t = signToken({ _id: 'abc', role: 'admin', tokenVersion: 3 });
  const p = jwt.verify(t, process.env.JWT_SECRET);
  assert.equal(p.id, 'abc');
  assert.equal(p.role, 'admin');
  assert.equal(p.tv, 3);
});

test('cookieOptions are httpOnly and secure only in production', () => {
  assert.equal(cookieOptions().httpOnly, true);
  assert.equal(cookieOptions().secure, false);
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  assert.equal(cookieOptions().secure, true);
  assert.equal(cookieOptions().sameSite, 'none');
  process.env.NODE_ENV = prev;
});
