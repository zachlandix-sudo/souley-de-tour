import { describe, expect, it } from 'vitest';
import { filterStops, isFood, spreadPins, townsOf } from './journey';

const place = { _id: 'a', name: 'Panaon Island', municipality: 'Liloan', categoryIds: [{ slug: 'nature' }] };
const cafe = { _id: 'b', name: 'Sea Cafe', municipality: 'Maasin City', entryType: 'cafe', categoryIds: [] };
const grill = { _id: 'c', name: 'Grill House', municipality: 'Liloan', categoryIds: [{ slug: 'food' }] };
const all = [place, cafe, grill];

describe('isFood', () => {
  it('knows food by entryType or by the Food category', () => {
    expect(isFood(cafe)).toBe(true);
    expect(isFood(grill)).toBe(true);
    expect(isFood(place)).toBe(false);
    expect(isFood(null)).toBe(false);
  });
});

describe('filterStops', () => {
  it('splits places from food and filters by town and text', () => {
    expect(filterStops(all, { kind: 'places' })).toEqual([place]);
    expect(filterStops(all, { kind: 'food' })).toEqual([cafe, grill]);
    expect(filterStops(all, { town: 'Liloan' })).toEqual([place, grill]);
    expect(filterStops(all, { q: ' sea ' })).toEqual([cafe]);
    expect(filterStops(all)).toHaveLength(3);
  });
});

describe('townsOf', () => {
  it('lists each town once, sorted', () => expect(townsOf(all)).toEqual(['Liloan', 'Maasin City']));
});

describe('spreadPins', () => {
  it('keeps a lone pin where it is and fans out pins that share a spot', () => {
    const out = spreadPins([{ id: 'x', lnglat: [125, 10] }, { id: 'y', lnglat: [125, 10] }, { id: 'z', lnglat: [124, 9] }]);
    expect(out.x).toEqual([125, 10]);
    expect(out.y).not.toEqual([125, 10]);
    expect(out.z).toEqual([124, 9]);
  });
});
