const test = require('node:test');
const assert = require('node:assert');
const { parseOrigins } = require('../src/utils/origins');

test('parseOrigins drops trailing slashes and spaces and keeps several sites', () => {
  assert.deepStrictEqual(parseOrigins('https://a.vercel.app/ , https://b.com'), ['https://a.vercel.app', 'https://b.com']);
});
test('parseOrigins falls back to the local dev site', () => {
  assert.deepStrictEqual(parseOrigins(''), ['http://localhost:5173']);
  assert.deepStrictEqual(parseOrigins(undefined), ['http://localhost:5173']);
});
