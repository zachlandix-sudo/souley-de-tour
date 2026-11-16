import { describe, expect, it } from 'vitest';
import { SNAP, ZONES, matchPct, rankByVibe, vibeName, vibeOf, zoneOf } from './vibe';

const spot = (slug, cats, acts = [], rating = 0) => ({ slug, name: slug, categoryIds: cats.map((name) => ({ name })), activities: acts, averageRating: rating });

describe('vibeOf', () => {
  it('puts adventure spots on the wild side and heritage spots on the slow, cultural side', () => {
    const trek = vibeOf(spot('falls', ['Nature', 'Adventure'], ['Trekking', 'Waterfall hiking']));
    const church = vibeOf(spot('church', ['Heritage', 'Culture'], ['Pilgrimage', 'Sightseeing']));
    expect(trek.x).toBeGreaterThan(0.7);
    expect(church.x).toBeLessThan(0.4);
    expect(church.y).toBeGreaterThan(0.75);
    expect(trek.y).toBeLessThan(0.35);
  });

  it('keeps beaches near the nature and sea edge', () => {
    expect(vibeOf(spot('beach', ['Beach'], ['Swimming'])).y).toBeLessThan(0.3);
  });

  it('always stays inside the pad, and gives the same answer every time', () => {
    const wild = spot('x', ['Adventure', 'Heritage', 'Culture', 'Beach', 'Nature'], ['Trekking', 'Diving', 'Pilgrimage', 'Pilgrimage', 'Pilgrimage']);
    const a = vibeOf(wild);
    for (const v of [a, vibeOf({}), vibeOf(null)]) {
      expect(v.x).toBeGreaterThanOrEqual(0.04); expect(v.x).toBeLessThanOrEqual(0.96);
      expect(v.y).toBeGreaterThanOrEqual(0.04); expect(v.y).toBeLessThanOrEqual(0.96);
    }
    expect(vibeOf(wild)).toEqual(a);
  });

  it('fans out spots that have the same tags', () => {
    const a = vibeOf(spot('one', ['Nature'])), b = vibeOf(spot('two', ['Nature']));
    expect(a.x === b.x && a.y === b.y).toBe(false);
  });
});

describe('matching', () => {
  it('is 100 on the spot and falls off with distance', () => {
    expect(matchPct({ x: 0.3, y: 0.3 }, { x: 0.3, y: 0.3 })).toBe(100);
    expect(matchPct({ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 })).toBeLessThan(100);
    expect(matchPct({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(0);
  });

  it('ranks the closest spot first and breaks ties by rating', () => {
    const trek = spot('trek', ['Nature', 'Adventure'], ['Trekking'], 4);
    const church = spot('church', ['Heritage'], ['Pilgrimage'], 5);
    expect(rankByVibe([church, trek], vibeOf(trek))[0].spot.slug).toBe('trek');
    expect(rankByVibe([church, trek], vibeOf(church))[0].spot.slug).toBe('church');
    const twinA = spot('a', ['Beach'], [], 3), twinB = { ...twinA, slug: 'a', averageRating: 5, name: 'b' };
    expect(rankByVibe([twinA, twinB], vibeOf(twinA))[0].spot.averageRating).toBe(5);
    expect(rankByVibe(null, { x: 0.5, y: 0.5 })).toEqual([]);
  });
});

describe('vibeName', () => {
  it('names the corners and the middle', () => {
    expect(vibeName(0.1, 0.1)).toBe('Slow and scenic');
    expect(vibeName(0.9, 0.1)).toBe('Wild adventure');
    expect(vibeName(0.1, 0.9)).toBe('Sacred and still');
    expect(vibeName(0.5, 0.5)).toBe('A bit of everything');
  });
});

describe('zones', () => {
  it('finds the area of the pad a point is in', () => {
    expect(zoneOf(0.1, 0.1)).toEqual({ row: 0, col: 0, name: 'Slow and scenic' });
    expect(zoneOf(0.9, 0.9)).toEqual({ row: 2, col: 2, name: 'Historic trail' });
    expect(zoneOf(0.5, 0.8).name).toBe('Story seeker');
  });
  it('has nine named areas and a small snap distance', () => {
    expect(ZONES.flat()).toHaveLength(9);
    expect(SNAP).toBeGreaterThan(0);
    expect(SNAP).toBeLessThan(0.1);
  });
});
