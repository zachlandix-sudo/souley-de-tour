const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'seed', 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const spots = read('southern-leyte-spots.json');
const food = read('southern-leyte-food.json');

// Minimal CSV reader (handles quoted fields, commas and newlines inside quotes).
function csvRows(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, '');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

test('every spot and food place has a unique slug', () => {
  const slugs = [...spots, ...food].map((x) => x.slug);
  assert.equal(slugs.length, 300);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('every spot and food place has a photo path matching its slug', () => {
  for (const x of [...spots, ...food]) assert.equal(x.photo, `/spots/${x.slug}.jpg`, x.name);
});

test('the CSV files carry the same photo paths and slugs as the JSON files', () => {
  const s = csvRows('southern-leyte-spots.csv'), f = csvRows('southern-leyte-food.csv');
  assert.equal(s.length, spots.length);
  assert.equal(f.length, food.length);
  s.forEach((r, i) => { assert.equal(r.slug, spots[i].slug); assert.equal(r.photo, spots[i].photo); });
  f.forEach((r, i) => { assert.equal(r.slug, food[i].slug); assert.equal(r.image, food[i].photo); });
});

test('the photo checklist lists every file', () => {
  const md = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'PHOTOS.md'), 'utf8');
  for (const x of [...spots, ...food]) assert.ok(md.includes(`\`public${x.photo}\``), x.photo);
});

test('every food place has a known entryType (shown as the badge on the Food page)', () => {
  const known = ['restaurant', 'cafe', 'bakery', 'fast_food', 'food_shop', 'restobar', 'eatery', 'food_stall', 'market'];
  for (const x of food) assert.ok(known.includes(x.entryType), `${x.name}: ${x.entryType}`);
});
