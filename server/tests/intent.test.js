const test = require('node:test');
const assert = require('node:assert/strict');
const { understand, findNamed, detectLang } = require('../src/services/intent');

const towns = ['Maasin City', 'Sogod', 'Limasawa', 'Padre Burgos', 'Silago', 'Liloan', 'Hinundayan'];
const names = [{ id: 'a', name: 'Tag-linaw Falls' }, { id: 'b', name: 'Busay Falls' }, { id: 'c', name: 'Maasin Cathedral' }, { id: 'd', name: 'Sogod Bay Marine Sanctuary' }];
const u = (q, o = {}) => understand(q, { towns, names, ...o });

test('a trip is recognised from days, weekends and plan words; a plain list is not', () => {
  assert.equal(u('A relaxed 2-day nature escape').trip, true);
  assert.equal(u('A relaxed 2-day nature escape').days, 2);
  assert.equal(u('A relaxed 2-day nature escape').pace, 'relaxed');
  assert.equal(u('weekend trip').days, 2);
  assert.equal(u('plan my trip to Limasawa').trip, true);
  assert.equal(u('honeymoon 4D3N in Southern Leyte').days, 4);
  assert.equal(u('2 nights 3 days with my kids').days, 3);
  assert.equal(u('Best waterfalls and caves in Southern Leyte').trip, false);
  assert.equal(u('how many days do I need for Limasawa?').trip, false); // a question about days, not a request for a plan
  assert.equal(u('is Busay Falls open on weekends?').trip, false);
});

test('budget, town, activity, group and month are picked out of the sentence', () => {
  const r = u('family trip around Padre Burgos under ₱3,000 in December, snorkeling');
  assert.equal(r.budget, 3000);
  assert.equal(r.municipality, 'Padre Burgos');
  assert.deepEqual(r.activities, ['snorkeling']);
  assert.deepEqual(r.groups, ['family']);
  assert.equal(r.month, 12);
  assert.equal(u('budget 5k for 2 days').budget, 5000);
  assert.equal(u('3 days under 2000').budget, 2000);
  assert.equal(u('2 days in Maasin').budget, null); // "2 days" is not money
  assert.equal(u('cheapest beach in Silago').rank, 'cheap');
  assert.equal(u('top 3 cafes in Sogod').count, 3);
  assert.equal(u('plan 3 days starting 2026-12-20').startDate, '2026-12-20');
});

test('"Sogod Bay" is an area, not the town Sogod; "Southern Leyte" is not a town; a misspelt town still matches', () => {
  const r = u('3 days around Sogod Bay with beaches');
  assert.deepEqual(r.towns, []);
  assert.deepEqual(r.areas, ['Sogod Bay']);
  assert.equal(u('beaches in Southern Leyte').municipality, null);
  assert.equal(u('beaches in Limasaua').municipality, 'Limasawa');
  assert.equal(u('how far is Limasawa from Maasin').origin, 'Maasin City');
  assert.equal(u('how far is Limasawa from Maasin').municipality, 'Limasawa');
});

test('what is asked about a place', () => {
  assert.deepEqual(u('how much is the entrance fee?').asks.filter((a) => a === 'cost'), ['cost']);
  assert.ok(u('what time does it open').asks.includes('hours'));
  assert.ok(u('best time to visit').asks.includes('season'));
  assert.ok(u('what should I bring').asks.includes('bring'));
  assert.ok(u('how do I get to Busay Falls').asks.includes('howto'));
  assert.ok(u('hotels in Maasin').asks.includes('stay'));
  assert.equal(u('compare Busay Falls and Tag-linaw Falls').compare, true);
});

test('a place is named by its name; towns inside a name and activity words do not name anything', () => {
  assert.deepEqual(u('how much is taglinaw falls').named.map((n) => n.id), ['a']);
  assert.deepEqual(u('what time does the maasin cathedral open').named.map((n) => n.id), ['c']);
  assert.deepEqual(u('waterfalls in Sogod').named, []); // Sogod alone is the town
  assert.deepEqual(u('unsa ang nindot nga busay?').named, []); // "busay" = waterfall
  assert.deepEqual(u('how much is Busay Falls').named.map((n) => n.id), ['b']);
  assert.deepEqual(findNamed('compare busay falls and tag-linaw falls', names, towns).map((n) => n.id).sort(), ['a', 'b']);
});

test('chat lines: greeting, thanks, who are you, other places', () => {
  assert.equal(u('Hi!').smalltalk, 'greeting');
  assert.equal(u('thank you').smalltalk, 'thanks');
  assert.equal(u('who are you').smalltalk, 'about');
  assert.equal(u('things to do in Bohol').smalltalk, 'offarea');
  assert.equal(u('what is the capital of France').smalltalk, 'offarea');
  assert.equal(u('write me a python script').smalltalk, 'offtopic');
  assert.equal(u('Hello, where can I swim near Liloan?').smalltalk, null); // a real question after the greeting
  assert.equal(u('how to get to Busay Falls from Cebu').smalltalk, null);
  assert.equal(u('anything').unclear, true);
});

test('language: English, Filipino and Bisaya', () => {
  assert.equal(detectLang('where can i swim'), 'en');
  assert.equal(u('magkano ang entrance sa Busay Falls').lang, 'fil');
  assert.equal(u('asa ko makakaon sa Maasin? mura lang').lang, 'ceb');
  assert.equal(u('mga lugar para sa pamilya, 2 araw').lang, 'fil');
  assert.equal(u('compare Busay Falls and Tag-linaw Falls').lang, 'en'); // "busay" is a place name here, not Bisaya
  assert.deepEqual(u('unsa ang nindot nga busay sa Sogod?').activities, ['waterfall']);
  assert.equal(u('asa ko makakaon sa Maasin? mura lang').food, true);
});

test('follow-ups only point back when there is something to point at', () => {
  assert.equal(u('how much is it?').anaphora, false);
  assert.equal(u('how much is it?', { hasContext: true }).anaphora, true);
  assert.deepEqual(u('what time does the second one open?', { hasContext: true }).ordinals, [1]);
  assert.deepEqual(u('compare the first two', { hasContext: true }).ordinals, [0, 1]);
  assert.equal(u('make it cheaper', { hasContext: true }).anaphora, false); // "make it" is not a place
  assert.equal(u('show me more', { hasContext: true }).more, true);
});
