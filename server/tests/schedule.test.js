require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDays, normalizeMonths, isOpenOn, inSeason, tripMonths, daysLabel, monthsLabel } = require('../src/utils/schedule');

test('opening days: ranges, lists, groups, names in full and numbers all parse, in week order', () => {
  assert.deepEqual(normalizeDays('Mon-Sat'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.deepEqual(normalizeDays('Mon to Wed, Sun'), ['Mon', 'Tue', 'Wed', 'Sun']);
  assert.deepEqual(normalizeDays(['monday', 'Friday', 'fri']), ['Mon', 'Fri']);
  assert.deepEqual(normalizeDays('weekends'), ['Sat', 'Sun']);
  assert.deepEqual(normalizeDays('Weekdays'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  assert.deepEqual(normalizeDays('Fri–Mon'), ['Mon', 'Fri', 'Sat', 'Sun']); // runs past the weekend, en dash
  assert.deepEqual(normalizeDays([0, 6]), ['Sat', 'Sun']); // 0 = Sunday
});

test('opening days: "every day", empty and unreadable all mean open every day', () => {
  for (const v of ['daily', 'Every day', 'Mon-Sun', '', null, undefined, 'n/a', [], 'whenever']) assert.deepEqual(normalizeDays(v), [], String(v));
});

test('best months: ranges wrap the year, names, numbers, "all year"', () => {
  assert.deepEqual(normalizeMonths('Nov-Feb'), [1, 2, 11, 12]);
  assert.deepEqual(normalizeMonths('December to March'), [1, 2, 3, 12]);
  assert.deepEqual(normalizeMonths('Mar–May'), [3, 4, 5]);
  assert.deepEqual(normalizeMonths([3, 4, '5', 'jun']), [3, 4, 5, 6]);
  assert.deepEqual(normalizeMonths('all year'), []);
  assert.deepEqual(normalizeMonths('Jan-Dec'), []);
  assert.deepEqual(normalizeMonths([0, 13, 99]), []); // out of range numbers are dropped
});

test('isOpenOn and inSeason treat missing data as always open / good all year', () => {
  const monToSat = { openDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], bestMonths: [3, 4, 5] };
  assert.equal(isOpenOn(monToSat, 0), false); // Sunday
  assert.equal(isOpenOn(monToSat, 1), true);
  assert.equal(isOpenOn({}, 0), true);
  assert.equal(isOpenOn(undefined, 3), true);
  assert.equal(inSeason(monToSat, 4), true);
  assert.equal(inSeason(monToSat, 12), false);
  assert.equal(inSeason({}, 12), true);
});

test('tripMonths lists the months a trip touches and is null without a usable date', () => {
  assert.deepEqual([...tripMonths('2026-12-30', 4)].sort((a, b) => a - b), [1, 12]);
  assert.deepEqual([...tripMonths('2026-06-10', 1)], [6]);
  assert.equal(tripMonths(null, 3), null);
  assert.equal(tripMonths('not a date', 3), null);
});

test('labels read like a person would write them', () => {
  assert.equal(daysLabel({ openDays: 'Mon-Sat' }), 'Mon–Sat');
  assert.equal(daysLabel({ openDays: ['Sat', 'Sun'] }), 'Sat, Sun');
  assert.equal(daysLabel({ openDays: ['Mon', 'Wed', 'Fri'] }), 'Mon, Wed, Fri');
  assert.equal(daysLabel({}), '');
  assert.equal(monthsLabel({ bestMonths: [11, 12, 1, 2] }), 'Nov–Feb');
  assert.equal(monthsLabel({ bestMonths: [3, 4, 5] }), 'Mar–May');
  assert.equal(monthsLabel({ bestMonths: [] }), '');
});

test('the spot model accepts valid days and months and rejects anything else', () => {
  const TouristSpot = require('../src/models/TouristSpot');
  const base = { name: 'A', slug: 'a', shortDescription: 's', description: 'd', municipality: 'M', images: ['/x.jpg'] };
  assert.equal(new TouristSpot({ ...base, openDays: ['Mon', 'Sun'], bestMonths: [1, 12] }).validateSync(), undefined);
  assert.deepEqual([...new TouristSpot(base).openDays], []); // spots saved before these fields existed
  assert.ok(new TouristSpot({ ...base, openDays: ['Funday'] }).validateSync()?.errors['openDays.0']);
  assert.ok(new TouristSpot({ ...base, bestMonths: [13] }).validateSync()?.errors['bestMonths.0']);
  assert.ok(new TouristSpot({ ...base, bestMonths: [0] }).validateSync()?.errors['bestMonths.0']);
});
