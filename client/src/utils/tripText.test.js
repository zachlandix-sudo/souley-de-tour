import { tripFromAi, tripToText } from './tripText';

describe('tripToText', () => {
  const trip = {
    title: '2-day nature trip',
    notes: 'Bring water.',
    days: [
      { dayNumber: 1, items: [
        { visitOrder: 2, touristSpotId: { name: 'Second', slug: 'second' } },
        { visitOrder: 1, touristSpotId: { name: 'First', slug: 'first', municipality: 'Maasin City' }, notes: 'Go early' },
      ] },
      { dayNumber: 2, items: [{ visitOrder: 1, touristSpotId: 'rawid' }] },
    ],
  };
  it('lists days and stops in visit order with links', () => {
    const t = tripToText(trip, 'https://x.test');
    expect(t.split('\n').slice(0, 7)).toEqual([
      '2-day nature trip', 'Planned with SOULEY de Tour', '', 'Day 1',
      '1. First (Maasin City) - Go early', '   https://x.test/spots/first', '2. Second',
    ]);
    expect(t).toContain('Day 2\n1. Stop');
    expect(t.endsWith('Bring water.')).toBe(true);
  });
  it('skips links without an origin', () => expect(tripToText(trip)).not.toContain('/spots/'));
});

describe('tripFromAi', () => {
  it('maps AI days and trims the title to 150 characters', () => {
    const out = tripFromAi(`  ${'a'.repeat(200)}  `, [{ dayNumber: 1, items: [{ touristSpotId: 'id1', visitOrder: 1, notes: 'n', extra: 'x' }] }]);
    expect(out.title).toHaveLength(150);
    expect(out.generatedByAI).toBe(true);
    expect(out.days).toEqual([{ dayNumber: 1, items: [{ touristSpotId: 'id1', visitOrder: 1, notes: 'n' }] }]);
  });
  it('falls back to a default title', () => expect(tripFromAi('', []).title).toBe('My Southern Leyte trip'));
});
