const test = require('node:test');
const assert = require('node:assert/strict');
const { toCsv, cell, BOM } = require('../src/utils/csv');

test('csv: plain values stay plain, commas, quotes and line breaks are quoted', () => {
  assert.equal(cell('Kawasan'), 'Kawasan');
  assert.equal(cell('Maasin, Southern Leyte'), '"Maasin, Southern Leyte"');
  assert.equal(cell('He said "wow"'), '"He said ""wow"""');
  assert.equal(cell('line one\nline two'), '"line one\nline two"');
});

test('csv: empty values, booleans, dates and lists', () => {
  assert.equal(cell(null), '');
  assert.equal(cell(undefined), '');
  assert.equal(cell(true), 'yes');
  assert.equal(cell(false), 'no');
  assert.equal(cell(new Date('2026-11-14T08:30:00Z')), '2026-11-14T08:30:00.000Z');
  assert.equal(cell(new Date('nope')), '');
  assert.equal(cell(['Beach', '', 'Heritage']), 'Beach; Heritage');
  assert.equal(cell(NaN), '');
});

test('csv: text that could run as a spreadsheet formula gets an apostrophe, real numbers do not', () => {
  assert.equal(cell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
  assert.equal(cell('+1 555'), "'+1 555");
  assert.equal(cell('-2+3'), "'-2+3");
  assert.equal(cell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(cell(-5), '-5');
  assert.equal(cell(12.5), '12.5');
});

test('csv: BOM first, CRLF between lines, one header and one line per row', () => {
  const out = toCsv([{ header: 'Name', value: (r) => r.n }, { header: 'Rating', value: (r) => r.r }], [{ n: 'A', r: 5 }, { n: 'B, C', r: null }]);
  assert.ok(out.startsWith(BOM));
  assert.equal(out.slice(1), 'Name,Rating\r\nA,5\r\n"B, C",\r\n');
});

test('csv: no rows still gives the header', () => {
  assert.equal(toCsv([{ header: 'Name', value: () => '' }], []), `${BOM}Name\r\n`);
});
