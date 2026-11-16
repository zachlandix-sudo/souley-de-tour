import { formatCoord, toLatLng } from './geo';

describe('toLatLng', () => {
  it('swaps [lng, lat] to [lat, lng]', () => {
    expect(toLatLng({ location: { coordinates: [125.07, 9.91] } })).toEqual([9.91, 125.07]);
  });
  it.each([
    [undefined], [{}], [{ location: { coordinates: [] } }], [{ location: { coordinates: [NaN, 1] } }],
    [{ location: { coordinates: ['a', 'b'] } }], [{ location: { coordinates: [200, 10] } }], [{ location: { coordinates: [10, 95] } }],
  ])('returns null for bad input %#', (spot) => {
    expect(toLatLng(spot)).toBeNull();
  });
});

describe('formatCoord', () => {
  it('formats with hemisphere letters', () => {
    expect(formatCoord({ location: { coordinates: [125.07, 9.91] } })).toEqual({ lat: '9.91000° N', lng: '125.07000° E', decimal: '9.91000, 125.07000' });
    expect(formatCoord({ location: { coordinates: [-70.5, -12.25] } })).toMatchObject({ lat: '12.25000° S', lng: '70.50000° W' });
  });
  it('returns null without usable coordinates', () => expect(formatCoord({})).toBeNull());
});

import { distanceKm, sortByDistance, formatKm } from './geo';

describe('distance helpers', () => {
  it('distanceKm is ~0 for the same point and ~111 km per degree of latitude', () => {
    expect(distanceKm([10, 125], [10, 125])).toBeCloseTo(0, 5);
    expect(distanceKm([10, 125], [11, 125])).toBeGreaterThan(110);
    expect(distanceKm([10, 125], [11, 125])).toBeLessThan(112);
  });
  it('sortByDistance orders nearest first and puts spots without coordinates last', () => {
    const at = (name, lat, lng) => ({ name, location: { coordinates: [lng, lat] } });
    const out = sortByDistance([at('far', 11, 125), { name: 'none' }, at('near', 10.01, 125)], [10, 125]);
    expect(out.map((s) => s.name)).toEqual(['near', 'far', 'none']);
    expect(out[2].distanceKm).toBeNull();
  });
  it('formatKm', () => {
    expect(formatKm(0.45)).toBe('450 m away');
    expect(formatKm(3.26)).toBe('3.3 km away');
    expect(formatKm(42.4)).toBe('42 km away');
    expect(formatKm(null)).toBe('');
  });
});
