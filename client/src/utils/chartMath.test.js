import { PALETTE, areaPath, axisIndexes, donutSlices, fmt, monotonePath, pctText, seriesPoints, sum } from './chartMath';

describe('chartMath', () => {
  it('fmt and sum treat missing numbers as 0', () => {
    expect(fmt(1234)).toBe((1234).toLocaleString());
    expect(fmt()).toBe('0');
    expect(sum([{ value: 2 }, { value: '3' }, {}])).toBe(5);
    expect(sum()).toBe(0);
  });

  it('pctText rounds, and shows <1% for a tiny slice that exists', () => {
    expect(pctText(1, 4)).toBe('25%');
    expect(pctText(1, 1000)).toBe('<1%');
    expect(pctText(0, 10)).toBe('0%');
    expect(pctText(5, 0)).toBe('0%');
  });

  it('seriesPoints maps values into a 0..100 box with the top value at y = 0', () => {
    expect(seriesPoints([0, 5, 10], 10)).toEqual([{ x: 0, y: 100 }, { x: 50, y: 50 }, { x: 100, y: 0 }]);
    expect(seriesPoints([3], 3)).toEqual([{ x: 50, y: 0 }]);
    expect(seriesPoints([0, 0], 0)).toEqual([{ x: 0, y: 100 }, { x: 100, y: 100 }]);
    expect(seriesPoints([])).toEqual([]);
  });

  it('monotonePath starts at the first point, ends at the last, and never leaves the data range', () => {
    const pts = seriesPoints([0, 0, 8, 0, 0, 3, 3], 8);
    const d = monotonePath(pts);
    expect(d.startsWith(`M${pts[0].x},${pts[0].y}`)).toBe(true);
    expect(d.endsWith(`${pts[pts.length - 1].x},${pts[pts.length - 1].y}`)).toBe(true);
    const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(100); // a smooth curve must not dip under a flat zero line
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 1, y: 2 }])).toBe('M1,2');
  });

  it('areaPath closes the line down to the baseline', () => {
    const d = areaPath(seriesPoints([1, 2, 3], 3));
    expect(d.endsWith('L100,100L0,100Z')).toBe(true);
    expect(areaPath([{ x: 0, y: 0 }])).toBe('');
  });

  it('donutSlices: percentages add up to 100, zero slices are skipped, indexes point back to the item', () => {
    const s = donutSlices([{ key: 'a', value: 50 }, { key: 'b', value: 0 }, { key: 'c', value: 50 }]);
    expect(s.map((x) => x.key)).toEqual(['a', 'c']);
    expect(s.map((x) => x.index)).toEqual([0, 2]);
    expect(s[0].pct + s[1].pct).toBeCloseTo(100, 1);
    expect(s[0].start).toBe(0);
    expect(s[1].start).toBeCloseTo(50, 1);
    expect(s[0].len).toBeCloseTo(49.3, 1); // the hairline gap
  });

  it('donutSlices: a single slice is a full ring with no gap; nothing to show gives no slices', () => {
    const [only] = donutSlices([{ key: 'a', value: 7 }, { key: 'b', value: 0 }]);
    expect(only.len).toBe(100);
    expect(donutSlices([{ key: 'a', value: 0 }])).toEqual([]);
    expect(donutSlices()).toEqual([]);
  });

  it('axisIndexes spreads labels evenly and keeps both ends', () => {
    expect(axisIndexes(4, 6)).toEqual([0, 1, 2, 3]);
    const a = axisIndexes(30, 6);
    expect(a[0]).toBe(0);
    expect(a[a.length - 1]).toBe(29);
    expect(a).toHaveLength(6);
    expect(axisIndexes(0)).toEqual([]);
  });

  it('the palette has enough distinct colours for seven slices', () => {
    expect(new Set(PALETTE).size).toBe(PALETTE.length);
    expect(PALETTE.length).toBeGreaterThanOrEqual(7);
  });
});
