import { addStamp, canStamp, countStamps, groupByTown, loadStamps, nextStamp, passportToText, persistStamps, rankFor, removeStamp, STAMP_INKS, STAMP_RADIUS_KM, STAMP_SHAPES, stampLook, STORAGE_KEY } from './passport';

const spot = (id, name, town, lat, lng, extra = {}) => ({ _id: id, name, slug: id, municipality: town, location: { type: 'Point', coordinates: [lng, lat] }, ...extra });
const A = spot('a', 'Alpha Falls', 'Maasin City', 10.13, 124.84);
const B = spot('b', 'Beta Cave', 'Maasin City', 10.14, 124.85);
const C = spot('c', 'Gamma Beach', 'Sogod', 10.38, 124.98);
const FOOD = spot('f', 'Tasty Eatery', 'Sogod', 10.38, 124.98, { categoryIds: [{ slug: 'food' }] });
const NOCOORD = { _id: 'n', name: 'No Coords', municipality: 'Sogod' };
const SPOTS = [A, B, C, FOOD, NOCOORD];

function memoryStorage(initial) {
  const data = { ...(initial || {}) };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

describe('passport stamps', () => {
  it('can stamp only within the radius', () => {
    const near = canStamp(A, [10.1301, 124.8401]);
    expect(near.ok).toBe(true);
    expect(near.distanceKm < STAMP_RADIUS_KM).toBe(true);
    expect(canStamp(A, [10.2, 124.9]).ok).toBe(false);
  });

  it('cannot stamp without a location or origin', () => {
    expect(canStamp(NOCOORD, [10, 124])).toEqual({ ok: false, distanceKm: null });
    expect(canStamp(A, null)).toEqual({ ok: false, distanceKm: null });
  });

  it('addStamp records the visit once and keeps the first date', () => {
    const first = addStamp({}, A, 'gps', new Date('2026-10-31T01:00:00Z'));
    expect(first.a).toEqual({ at: '2026-10-31T01:00:00.000Z', method: 'gps', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'a' });
    const again = addStamp(first, A, 'manual', new Date('2027-01-01T00:00:00Z'));
    expect(again).toBe(first);
  });

  it('unknown methods fall back to gps, manual is kept, spots without an id are ignored', () => {
    expect(addStamp({}, A, 'weird').a.method).toBe('gps');
    expect(addStamp({}, A, 'manual').a.method).toBe('manual');
    const empty = {};
    expect(addStamp(empty, { name: 'x' })).toBe(empty);
  });

  it('removeStamp drops one stamp without touching the original object', () => {
    const s = addStamp(addStamp({}, A), B);
    const r = removeStamp(s, 'a');
    expect(Object.keys(r)).toEqual(['b']);
    expect(Object.keys(s)).toEqual(['a', 'b']);
    expect(removeStamp(s, 'zzz')).toBe(s);
  });
});

describe('passport storage', () => {
  it('round-trips through storage', () => {
    const st = memoryStorage();
    const stamps = addStamp({}, A);
    expect(persistStamps(stamps, st)).toBe(true);
    expect(loadStamps(st)).toEqual(stamps);
  });

  it('survives broken or missing storage', () => {
    expect(loadStamps(memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual({});
    expect(loadStamps(memoryStorage({ [STORAGE_KEY]: '[1,2]' }))).toEqual({});
    expect(loadStamps(null)).toEqual({});
    const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(loadStamps(throwing)).toEqual({});
    expect(persistStamps({}, throwing)).toBe(false);
  });
});

describe('towns, badges and ranks', () => {
  it('groups by town, skips food and spots without an id', () => {
    const groups = groupByTown(SPOTS, {});
    expect(groups.map((g) => g.town).sort()).toEqual(['Maasin City', 'Sogod']);
    const sogod = groups.find((g) => g.town === 'Sogod');
    expect(sogod.spots.map((s) => s._id).sort()).toEqual(['c', 'n']);
    expect(sogod.total).toBe(2);
  });

  it('awards a badge only when a town with 2+ spots is complete', () => {
    const none = groupByTown(SPOTS, {});
    expect(none.every((g) => !g.badge)).toBe(true);
    const half = groupByTown(SPOTS, addStamp({}, A));
    expect(half.find((g) => g.town === 'Maasin City').collected).toBe(1);
    expect(half.find((g) => g.town === 'Maasin City').badge).toBe(false);
    const full = groupByTown(SPOTS, addStamp(addStamp({}, A), B));
    const maasin = full.find((g) => g.town === 'Maasin City');
    expect(maasin.complete).toBe(true);
    expect(maasin.badge).toBe(true);
  });

  it('a one-spot town completes but gives no badge', () => {
    const g = groupByTown([C], addStamp({}, C))[0];
    expect(g.complete).toBe(true);
    expect(g.badge).toBe(false);
  });

  it('puts towns with the most progress first', () => {
    const groups = groupByTown(SPOTS, addStamp(addStamp({}, A), B));
    expect(groups[0].town).toBe('Maasin City');
  });

  it('counts only stamps for spots in the list', () => {
    const stamps = addStamp(addStamp({}, A), spot('gone', 'Closed Spot', 'Sogod', 10, 124));
    expect(countStamps(SPOTS, stamps)).toBe(1);
  });

  it('ranks rise with the stamp count', () => {
    expect(rankFor(0).key).toBe('passport.rank.tourist');
    expect(rankFor(1).key).toBe('passport.rank.newcomer');
    expect(rankFor(4).key).toBe('passport.rank.newcomer');
    expect(rankFor(5).key).toBe('passport.rank.wanderer');
    expect(rankFor(15).key).toBe('passport.rank.trailblazer');
    expect(rankFor(99).key).toBe('passport.rank.local');
  });
});

describe('next stamp and sharing', () => {
  it('suggests the nearest spot that has no stamp yet', () => {
    const origin = [10.131, 124.841];
    expect(nextStamp(SPOTS, {}, origin).spot._id).toBe('a');
    expect(nextStamp(SPOTS, addStamp({}, A), origin).spot._id).toBe('b');
  });

  it('returns null with no origin or nothing left', () => {
    expect(nextStamp(SPOTS, {}, null)).toBeNull();
    expect(nextStamp([A], addStamp({}, A), [10, 124])).toBeNull();
  });

  it('builds a share text, newest first', () => {
    let stamps = addStamp({}, A, 'gps', new Date('2026-10-01T00:00:00Z'));
    stamps = addStamp(stamps, B, 'gps', new Date('2026-10-02T00:00:00Z'));
    const text = passportToText({ count: 2, total: 3, rankLabel: 'Newcomer', badgeTowns: ['Maasin City'], stamps }, 'https://x.test');
    const lines = text.split('\n');
    expect(lines[0]).toBe('My Leyte Passport');
    expect(text.includes('Newcomer: 2 of 3 stamps')).toBe(true);
    expect(text.includes('Town badges: Maasin City')).toBe(true);
    expect(text.indexOf('Beta Cave')).toBeLessThan(text.indexOf('Alpha Falls'));
    expect(lines[lines.length - 1]).toBe('https://x.test/passport');
  });
});

describe('stampLook', () => {
  it('is stable for a spot and always picks a known shape and ink', () => {
    expect(stampLook('abc')).toEqual(stampLook('abc'));
    ['a', 'b', 'c', 'spot-123', '64f0c1'].forEach((id) => {
      const l = stampLook(id);
      expect(STAMP_SHAPES).toContain(l.shape);
      expect(STAMP_INKS).toContain(l.ink);
    });
  });
  it('gives different spots a mix of looks', () => {
    const shapes = new Set(Array.from({ length: 40 }, (_, i) => stampLook(`spot-${i}`).shape));
    expect(shapes.size).toBeGreaterThan(1);
  });
});

import { clearStamps, COVER_COLORS, initials, passportNumber, stampsFromList, stampsToList } from './passport';

describe('passport account helpers', () => {
  it('turns the server list into the page map and back', () => {
    const list = [
      { spot: 'a', at: '2026-11-01T00:00:00.000Z', method: 'manual', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' },
      { spot: 'b', at: '2026-11-02T00:00:00.000Z', method: 'teleport' },
      { name: 'no id' },
    ];
    const map = stampsFromList(list);
    expect(Object.keys(map)).toEqual(['a', 'b']);
    expect(map.a).toEqual({ at: '2026-11-01T00:00:00.000Z', method: 'manual', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'alpha' });
    expect(map.b.method).toBe('gps'); // unknown methods count as GPS
    expect(stampsToList(map)).toEqual([
      { spot: 'a', at: '2026-11-01T00:00:00.000Z', method: 'manual' },
      { spot: 'b', at: '2026-11-02T00:00:00.000Z', method: 'gps' },
    ]);
    expect(stampsFromList(null)).toEqual({});
    expect(stampsToList(undefined)).toEqual([]);
  });

  it('makes a stable passport number from the account id', () => {
    expect(passportNumber({ _id: '64b7f0f0f0f0f0f0f0f0abc1' })).toBe('SDT-F0ABC1');
    expect(passportNumber({ id: '64b7f0f0f0f0f0f0f0f0abc1' })).toBe('SDT-F0ABC1');
    expect(passportNumber(null)).toBe('');
  });

  it('takes monogram letters from the name', () => {
    expect(initials('Maria Santos')).toBe('MS');
    expect(initials('  juan   dela   cruz ')).toBe('JC');
    expect(initials('Madonna')).toBe('M');
    expect(initials('')).toBe('');
  });

  it('knows the four cover colours and can clear the browser copy', () => {
    expect(COVER_COLORS).toEqual(['black', 'navy', 'green', 'burgundy']);
    persistStamps({ a: { at: 'x', method: 'gps' } });
    expect(loadStamps()).toEqual({ a: { at: 'x', method: 'gps' } });
    expect(clearStamps()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadStamps()).toEqual({});
  });
});
