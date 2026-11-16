import { DEFAULT_FILTERS, MEALS, activeCount, clockText, directionsUrl, filterFoods, mealForMinutes, pickFeatured, pickRandom, readFilters, sameSet, sortFoods, tripText, tripUrl, typeCounts, typeLabel, visitorBlurb, withPlace, writeFilters } from './food';

describe('food helpers', () => {
  it('turns the stored type into a badge label', () => {
    expect(typeLabel({ entryType: 'cafe' })).toBe('Café');
    expect(typeLabel({ entryType: 'fast_food' })).toBe('Fast food');
    expect(typeLabel({ entryType: 'pop_up' })).toBe('Pop up');
    expect(typeLabel({})).toBe('');
  });
  it('hides the admin note that every imported place carries', () => {
    expect(visitorBlurb({ shortDescription: 'Named restaurant/eatery listing; confirm current operation, menu, and exact address.' })).toBe('');
    expect(visitorBlurb({ shortDescription: 'Charcoal-grilled seafood on the bay front.' })).toBe('Charcoal-grilled seafood on the bay front.');
    expect(visitorBlurb({})).toBe('');
  });
  it('builds a Google Maps search by name and address, never by the approximate pin', () => {
    const url = directionsUrl({ name: 'Sa Natad', address: 'Kangleon St, Maasin City', municipality: 'Maasin City' });
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(decodeURIComponent(url)).toContain('Sa Natad, Kangleon St, Maasin City, Southern Leyte, Philippines');
    expect(decodeURIComponent(directionsUrl({ name: 'X', municipality: 'Sogod' }))).toContain('X, Sogod');
  });
  it('sets and clears ?place without touching other params', () => {
    const p = new URLSearchParams('a=1');
    expect(withPlace(p, 'tinago').toString()).toBe('a=1&place=tinago');
    expect(withPlace(new URLSearchParams('a=1&place=x'), null).toString()).toBe('a=1');
    expect(p.toString()).toBe('a=1');
  });
  it('picks the best-rated place, the first one on a tie', () => {
    expect(pickFeatured([])).toBeNull();
    expect(pickFeatured([{ _id: 1, averageRating: 4 }, { _id: 2, averageRating: 4.8 }, { _id: 3, averageRating: 4.8 }])._id).toBe(2);
    expect(pickFeatured([{ _id: 1 }, { _id: 2 }])._id).toBe(1);
  });
});

const SPOTS = [
  { _id: '1', slug: 'a', name: 'Bay Café', municipality: 'Maasin City', entryType: 'cafe', averageRating: 4.5, reviewCount: 3, address: 'Rizal St' },
  { _id: '2', slug: 'b', name: 'Zed Grill', municipality: 'Sogod', entryType: 'restaurant', averageRating: 0, reviewCount: 0 },
  { _id: '3', slug: 'c', name: 'Alpha Bakery', municipality: 'Sogod', entryType: 'bakery', averageRating: 3.2, reviewCount: 2 },
];

describe('food filters', () => {
  it('searches without caring about accents or case, across name, town and type', () => {
    expect(filterFoods(SPOTS, { q: 'cafe' }).map((s) => s.slug)).toEqual(['a']);
    expect(filterFoods(SPOTS, { q: 'sogod bakery' }).map((s) => s.slug)).toEqual(['c']);
    expect(filterFoods(SPOTS, { q: 'nothing like this' })).toEqual([]);
  });
  it('filters by town, several types, and minimum rating (unrated places never pass a rating filter)', () => {
    expect(filterFoods(SPOTS, { town: 'Sogod' })).toHaveLength(2);
    expect(filterFoods(SPOTS, { types: ['bakery', 'cafe'] })).toHaveLength(2);
    expect(filterFoods(SPOTS, { minRating: 4 }).map((s) => s.slug)).toEqual(['a']);
    expect(filterFoods(SPOTS, { minRating: 3 }).map((s) => s.slug)).toEqual(['a', 'c']);
  });
  it('filters by saved places and by the food log', () => {
    expect(filterFoods(SPOTS, { saved: true }, { isSaved: (id) => id === '2' }).map((s) => s.slug)).toEqual(['b']);
    expect(filterFoods(SPOTS, { tried: 'new' }, { tried: new Set(['a']) }).map((s) => s.slug)).toEqual(['b', 'c']);
    expect(filterFoods(SPOTS, { tried: 'tried' }, { tried: new Set(['a']) }).map((s) => s.slug)).toEqual(['a']);
  });
  it('sorts by rating, name, town and distance without changing the input', () => {
    expect(sortFoods(SPOTS, 'top').map((s) => s.slug)).toEqual(['a', 'c', 'b']);
    expect(sortFoods(SPOTS, 'az').map((s) => s.slug)).toEqual(['c', 'a', 'b']);
    expect(sortFoods(SPOTS, 'town').map((s) => s.slug)).toEqual(['a', 'c', 'b']);
    expect(sortFoods([{ ...SPOTS[0], distanceKm: 9 }, { ...SPOTS[1], distanceKm: 2 }, SPOTS[2]], 'near').map((s) => s.slug)).toEqual(['b', 'a', 'c']);
    expect(SPOTS.map((s) => s.slug)).toEqual(['a', 'b', 'c']);
  });
  it('counts places per type', () => {
    expect(typeCounts(SPOTS)).toEqual({ cafe: 1, restaurant: 1, bakery: 1 });
  });
});

describe('food filters in the address', () => {
  const full = { q: 'rice', town: 'Sogod', types: ['cafe', 'bakery'], sort: 'az', minRating: 4, saved: true, tried: 'new' };
  it('round-trips every filter and leaves other params (like ?place=) alone', () => {
    const params = writeFilters(new URLSearchParams('place=x'), full);
    expect(params.get('place')).toBe('x');
    expect(readFilters(params)).toEqual(full);
  });
  it('leaves no trace when everything is off', () => {
    expect(writeFilters(new URLSearchParams('place=x&q=old&type=cafe'), DEFAULT_FILTERS).toString()).toBe('place=x');
  });
  it('ignores values it does not know', () => {
    expect(readFilters(new URLSearchParams('type=nope,cafe&rating=9&sort=zzz&tried=x'))).toEqual({ ...DEFAULT_FILTERS, types: ['cafe'] });
  });
  it('counts switched-on filters (sorting does not count)', () => {
    expect(activeCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeCount({ ...full })).toBe(7);
    expect(activeCount({ ...DEFAULT_FILTERS, sort: 'az' })).toBe(0);
  });
});

describe('meals, clock and roulette', () => {
  it('suggests a meal for the time of day', () => {
    expect(mealForMinutes(8 * 60).id).toBe('breakfast');
    expect(mealForMinutes(12 * 60 + 40).id).toBe('lunch');
    expect(mealForMinutes(15 * 60).id).toBe('merienda');
    expect(mealForMinutes(19 * 60).id).toBe('dinner');
    expect(mealForMinutes(2 * 60).id).toBe('drinks');
    expect(mealForMinutes(NaN).id).toBe('lunch');
  });
  it('only uses types that exist', () => {
    MEALS.forEach((m) => expect(m.types.length).toBeGreaterThan(0));
    expect(sameSet(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(sameSet(['a'], ['a', 'b'])).toBe(false);
  });
  it('formats the clock', () => {
    expect(clockText(760)).toBe('12:40 pm');
    expect(clockText(0)).toBe('12:00 am');
    expect(clockText(605)).toBe('10:05 am');
  });
  it('never repeats the last pick unless it is the only place', () => {
    expect(pickRandom(SPOTS, 'a', () => 0).slug).toBe('b');
    expect(pickRandom(SPOTS, null, () => 0.999).slug).toBe('c');
    expect(pickRandom([SPOTS[0]], 'a', () => 0.9).slug).toBe('a');
    expect(pickRandom([], 'a')).toBeNull();
  });
});

describe('food trip links', () => {
  it('builds one Google Maps route: the last stop is the destination, the rest are waypoints, searched by name', () => {
    const url = new URL(tripUrl(SPOTS));
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('destination')).toBe('Alpha Bakery, Sogod, Southern Leyte, Philippines');
    expect(url.searchParams.get('waypoints').split('|')).toHaveLength(2);
  });
  it('handles one stop and no stops', () => {
    expect(new URL(tripUrl([SPOTS[0]])).searchParams.get('waypoints')).toBeNull();
    expect(tripUrl([])).toBe('');
  });
  it('writes a numbered list to paste', () => {
    expect(tripText(SPOTS.slice(0, 2))).toBe('1. Bay Café (Maasin City)\n2. Zed Grill (Sogod)');
  });
});
