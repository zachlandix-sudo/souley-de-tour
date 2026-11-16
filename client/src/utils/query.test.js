import { buildSearchParams, parseSpotQuery } from './query';

describe('parseSpotQuery', () => {
  it('clamps junk page values to 1', () => {
    expect(parseSpotQuery('?page=abc').page).toBe(1);
    expect(parseSpotQuery('?page=-3').page).toBe(1);
  });
  it('drops unknown sort and caps limit at 50', () => {
    expect(parseSpotQuery('?sort=evil').sort).toBeUndefined();
    expect(parseSpotQuery('?limit=500').limit).toBe(50);
  });
  it('keeps valid values', () => {
    expect(parseSpotQuery('?page=2&search=beach')).toMatchObject({ page: 2, search: 'beach' });
  });
});

describe('buildSearchParams', () => {
  it('omits defaults and empties', () => {
    expect(buildSearchParams({ page: 1, search: '' }).toString()).toBe('');
  });
  it('round trips', () => {
    const s = buildSearchParams(parseSpotQuery('?category=nature&sort=rating&page=3'));
    expect(parseSpotQuery(s)).toMatchObject({ category: 'nature', sort: 'rating', page: 3 });
  });
});
