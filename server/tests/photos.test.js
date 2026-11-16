require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const { searchPhoto, clear } = require('../src/services/photoService');

const realFetch = global.fetch;
const realError = console.error;
const guard = (fn) => async () => {
  clear();
  console.error = () => {};
  try { await fn(); } finally { global.fetch = realFetch; console.error = realError; clear(); }
};
const json = (body) => ({ ok: true, status: 200, json: async () => body });
const fail = (status) => ({ ok: false, status, json: async () => ({}) });
const script = (route) => {
  const urls = [];
  global.fetch = async (url, opts) => { urls.push(url); return route(url, opts); };
  return urls;
};

const COMMONS = { query: { pages: {
  2: { index: 2, imageinfo: [{ mime: 'image/jpeg', width: 4000, thumburl: 'https://upload.wikimedia.org/b.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:B.jpg', extmetadata: { Artist: { value: '<a href="x">Ana Reyes</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] },
  1: { index: 1, imageinfo: [{ mime: 'image/png', width: 4000, thumburl: 'https://upload.wikimedia.org/a.png' }] },
} } };

test('Unsplash first when its key is set: sends the key and returns the photo with its credit', guard(async () => {
  const urls = script(async (url, opts) => {
    if (url.includes('/search/photos')) {
      assert.equal(opts.headers.Authorization, 'Client-ID k1');
      return json({ results: [{ urls: { regular: 'https://images.unsplash.com/p' }, user: { name: 'Mia', links: { html: 'https://unsplash.com/@mia' } }, links: { download_location: 'https://api.unsplash.com/photos/p/download' } }] });
    }
    return json({});
  });
  const p = await searchPhoto('Waterfall Philippines', { UNSPLASH_ACCESS_KEY: 'k1' });
  assert.equal(p.url, 'https://images.unsplash.com/p');
  assert.equal(p.credit, 'Mia');
  assert.match(p.creditUrl, /^https:\/\/unsplash\.com\/@mia\?utm_source=/);
  assert.equal(p.source, 'Unsplash');
  assert.match(urls[0], /query=waterfall%20philippines/);
}));

test('no keys: Wikimedia Commons is used, only a real JPEG photo is taken, credit text has no HTML', guard(async () => {
  script(async () => json(COMMONS));
  const p = await searchPhoto('beach Philippines', {});
  assert.equal(p.url, 'https://upload.wikimedia.org/b.jpg');
  assert.equal(p.credit, 'Ana Reyes, CC BY-SA 4.0');
  assert.equal(p.source, 'Wikimedia Commons');
}));

test('a failing provider passes the turn on; the key is never logged', guard(async () => {
  const logged = [];
  console.error = (...a) => logged.push(a.join(' '));
  script(async (url) => (url.includes('unsplash') ? fail(403) : json(COMMONS)));
  const p = await searchPhoto('cave Philippines', { UNSPLASH_ACCESS_KEY: 'topsecret' });
  assert.equal(p.source, 'Wikimedia Commons');
  assert.ok(logged.length === 1 && !logged[0].includes('topsecret'));
}));

test('answers are cached: the same words ask the provider once', guard(async () => {
  const urls = script(async () => json(COMMONS));
  await searchPhoto('street food', {});
  await searchPhoto('  Street   FOOD ', {});
  assert.equal(urls.length, 1);
}));

test('nothing found (or everything down) is null, not an error, and is cached briefly', guard(async () => {
  const urls = script(async () => { throw new Error('offline'); });
  assert.equal(await searchPhoto('asdfgh', {}), null);
  assert.equal(await searchPhoto('asdfgh', {}), null);
  assert.equal(urls.length, 1);
}));

test('text that is too short is null without calling anyone', guard(async () => {
  const urls = script(async () => json({}));
  assert.equal(await searchPhoto('a', {}), null);
  assert.equal(urls.length, 0);
}));
