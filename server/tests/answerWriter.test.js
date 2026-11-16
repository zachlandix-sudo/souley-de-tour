const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/services/answerWriter');
const { understand } = require('../src/services/intent');

const spot = (over = {}) => ({
  id: 's1', name: 'Tag-linaw Falls', town: 'Pintuyan', barangay: '', address: '', short: 'Falls in a forest. Cool water all year.', description: 'Falls in a forest. Entrance fee is collected at the gate.',
  kind: 'spot', activities: ['Swimming'], fee: null, budget: null, duration: null, bestTime: null, openDays: '', bestMonths: '', hours: '',
  difficulty: null, accessibility: null, bring: [], safety: [], contact: {}, lat: 10.1, lng: 125, approx: false, hits: [], km: null, ...over,
});
const u = (q) => understand(q, { towns: ['Pintuyan'], names: [] });

test('facts: missing data says "not listed yet" and never invents a value', () => {
  const t = W.factsAnswer({ lang: 'en', spots: [spot()], asks: ['cost', 'duration'] });
  assert.match(t, /Entrance: not listed yet/);
  assert.match(t, /Time needed: not listed yet/);
  assert.match(t, /Entrance fee is collected at the gate/); // quoted from the place's own description
  assert.match(t, /confirm with the local tourism office/);
});

test('facts: listed values are shown, in the visitor\'s language', () => {
  const f = spot({ fee: '₱50', budget: 150, duration: '2 hours' });
  assert.match(W.factsAnswer({ lang: 'en', spots: [f], asks: ['cost'] }), /₱50 .*\n• Estimated budget: ₱150/);
  assert.match(W.factsAnswer({ lang: 'fil', spots: [f], asks: ['cost'] }), /Bayad sa pagpasok: ₱50/);
  assert.match(W.factsAnswer({ lang: 'ceb', spots: [f], asks: ['duration'] }), /Oras nga kinahanglan: 2 hours/);
});

test('facts: a pin that is only the town centre gives a search link, not directions or a distance', () => {
  const rough = W.factsAnswer({ lang: 'en', spots: [spot({ approx: true, km: 3 })], asks: ['howto'] });
  assert.ok(!/destination=/.test(rough) && !/straight line/.test(rough));
  assert.match(rough, /maps\/search\/\?api=1&query=Tag-linaw/);
  const exact = W.factsAnswer({ lang: 'en', spots: [spot({ km: 3, kmFrom: 'Maasin City' })], asks: ['howto'] });
  assert.match(exact, /destination=10\.1,125/);
  assert.match(exact, /roughly 3 km/);
});

test('compare names the cheaper and the easier place only when both values exist', () => {
  const a = spot({ id: 'a', name: 'A', budget: 100, difficulty: 'easy' });
  const b = spot({ id: 'b', name: 'B', budget: 300, difficulty: 'hard' });
  const t = W.compareAnswer({ lang: 'en', spots: [a, b] });
  assert.match(t, /Cheaper: A \(₱100 vs ₱300\)/);
  assert.match(t, /Easier: A/);
  assert.match(W.compareAnswer({ lang: 'en', spots: [spot({ id: 'a', name: 'A' }), spot({ id: 'b', name: 'B' })] }), /very close/);
});

test('recommendation text says what could not be matched instead of pretending', () => {
  const q = u('waterfalls in Pintuyan');
  const picks = [spot()];
  assert.match(W.recommendAnswer({ lang: 'en', u: q, picks, relaxed: { act: true, town: 'Pintuyan' } }), /couldn't find waterfalls listed in Pintuyan/);
  assert.match(W.recommendAnswer({ lang: 'en', u: q, picks, relaxed: { town: 'Pintuyan' } }), /don't have places listed in Pintuyan/);
  assert.match(W.recommendAnswer({ lang: 'en', u: u('beaches under 500 pesos'), picks, budget: 500 }), /no listed price are included/);
  assert.match(W.recommendAnswer({ lang: 'ceb', u: q, picks }), /Ania ang 1 ka lugar para sa busay/);
});

test('trip text: a short list of days, an honest total, and a note when days could not be filled', () => {
  const plan = { days: [{ dayNumber: 1, stops: [{ name: 'A', kind: 'spot', cost: 100 }, { name: 'B', kind: 'food', cost: 200 }] }], requested: 3, planned: 1, pace: 'relaxed', budget: 250, total: 300 };
  const t = W.tripAnswer({ lang: 'en', u: u('3 day trip'), plan, town: 'Pintuyan' });
  assert.match(t, /relaxed 1-day plan in Pintuyan/);
  assert.match(t, /Day 1: A and B \(meal stop\)/);
  assert.match(t, /about ₱300, a little over your ₱250/);
  assert.match(t, /only fill 1 of 3 days/);
  assert.match(W.tripAnswer({ lang: 'en', u: u('3 day trip'), plan: { ...plan, total: 0, budget: 1000 } }), /can't check them against your ₱1,000/);
});

test('chips and chat lines are localised; suggestions name real places', () => {
  const q = u('3 day family trip under 5k');
  assert.deepEqual(W.chips(q, 'en', { mode: 'trip', days: 3, pace: 'relaxed', budget: 5000 }).slice(0, 3), ['Trip plan', '3 days', 'Relaxed']);
  assert.ok(W.chips(q, 'fil', { mode: 'trip', days: 3, budget: 5000 }).includes('3 araw'));
  assert.match(W.chat('greeting', 'ceb'), /^Kumusta!/);
  assert.match(W.chat('about', 'en'), /^I'm SOULEY/);
  const s = W.suggestions({ lang: 'en', kind: 'places', spots: [spot(), spot({ id: 's2', name: 'Busay Falls' })], u: u('waterfalls') });
  assert.ok(s.includes('How much is Tag-linaw Falls?') && s.length <= 4);
});
