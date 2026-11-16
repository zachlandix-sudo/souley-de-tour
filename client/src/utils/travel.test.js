import { describe, it, expect } from 'vitest';
import { MODES, arcPoints, arrival, easeOutCubic, estimateTravel, formatDuration, formatRoadKm, loopMs, pathUpTo, pointAlong } from './travel';
import { distanceKm } from './geo';

const MAASIN = [10.13, 124.84];
const SOGOD = [10.38, 124.98];

describe('estimateTravel', () => {
  it('uses the straight-line distance, a detour factor and the speed of the mode', () => {
    const straight = distanceKm(MAASIN, SOGOD);
    const car = estimateTravel(MAASIN, SOGOD, 'car');
    expect(car.straightKm).toBeCloseTo(straight, 6);
    expect(car.roadKm).toBeCloseTo(straight * 1.3, 6);
    expect(car.minutes).toBeCloseTo(((straight * 1.3) / 45) * 60, 6);
  });
  it('is slowest on foot and fastest by car, for the same trip', () => {
    const t = (id) => estimateTravel(MAASIN, SOGOD, id).minutes;
    expect(t('walk')).toBeGreaterThan(t('bike'));
    expect(t('bike')).toBeGreaterThan(t('car'));
  });
  it('falls back to the default mode for an unknown one and returns null for unusable points', () => {
    expect(estimateTravel(MAASIN, SOGOD, 'rocket').minutes).toBeCloseTo(estimateTravel(MAASIN, SOGOD, 'car').minutes, 6);
    expect(estimateTravel(null, SOGOD)).toBeNull();
    expect(estimateTravel(MAASIN, [NaN, 1])).toBeNull();
  });
  it('gives zero minutes when you are already there', () => {
    expect(estimateTravel(MAASIN, MAASIN, 'car').minutes).toBe(0);
  });
  it('every mode has the fields the UI needs', () => {
    for (const m of MODES) {
      expect(m.kmh).toBeGreaterThan(0);
      expect(m.detour).toBeGreaterThanOrEqual(1);
      expect(loopMs(m.id)).toBe(m.loopMs);
      expect(m.labelKey).toMatch(/^travel\./);
    }
  });
});

describe('formatDuration', () => {
  it('reads naturally from seconds to days', () => {
    expect(formatDuration(0)).toBe('< 1 min');
    expect(formatDuration(0.4)).toBe('< 1 min');
    expect(formatDuration(42)).toBe('42 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatDuration(1650)).toBe('1 d 3 h');
    expect(formatDuration(1440)).toBe('1 d');
  });
  it('rounds to the nearest 5 minutes from an hour up', () => {
    expect(formatDuration(62)).toBe('1 h');
    expect(formatDuration(64)).toBe('1 h 5 min');
  });
  it('returns an empty string for nothing usable', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(NaN)).toBe('');
    expect(formatDuration(-5)).toBe('');
  });
});

describe('formatRoadKm', () => {
  it('keeps one decimal under 10 km and whole numbers above', () => {
    expect(formatRoadKm(6.04)).toBe('6.0');
    expect(formatRoadKm(85.4)).toBe('85');
    expect(formatRoadKm(null)).toBe('');
  });
});

describe('arrival', () => {
  it('adds the minutes to the start time and counts the days', () => {
    const start = new Date(2026, 10, 11, 9, 0, 0);
    expect(arrival(start, 90).dayOffset).toBe(0);
    expect(arrival(start, 90).time).toBeTruthy();
    expect(arrival(new Date(2026, 10, 11, 23, 0, 0), 120).dayOffset).toBe(1);
    expect(arrival(start, 60 * 24 * 2 + 5).dayOffset).toBe(2);
  });
});

describe('route helpers', () => {
  const a = [10.0, 125.0];
  const b = [10.4, 125.2];
  it('arcPoints starts and ends exactly on the two points and bends away from the straight line', () => {
    const pts = arcPoints(a, b, 40);
    expect(pts).toHaveLength(41);
    expect(pts[0]).toEqual(a);
    expect(pts[40]).toEqual(b);
    const mid = pts[20];
    const lineMid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    expect(Math.hypot(mid[0] - lineMid[0], mid[1] - lineMid[1])).toBeGreaterThan(0.01);
  });
  it('arcPoints copes with two identical points', () => {
    expect(arcPoints(a, a)).toEqual([a, a]);
  });
  it('arcPoints always bends to the same side of the direction of travel', () => {
    const side = (p, q) => {
      const pts = arcPoints(p, q, 2);
      const m = pts[1];
      return Math.sign((q[1] - p[1]) * (m[0] - p[0]) - (q[0] - p[0]) * (m[1] - p[1]));
    };
    expect(side(a, b)).not.toBe(0);
    expect(side(b, a)).toBe(side(a, b)); // same side relative to the direction of travel, both ways
  });
  it('pointAlong walks the line from the start to the end', () => {
    const pts = [[0, 0], [0, 10], [10, 10]];
    expect(pointAlong(pts, 0)).toEqual([0, 0]);
    expect(pointAlong(pts, 0.5)).toEqual([0, 10]);
    expect(pointAlong(pts, 1)).toEqual([10, 10]);
    expect(pointAlong(pts, 0.25)).toEqual([0, 5]);
    expect(pointAlong(pts, 2)).toEqual([10, 10]); // clamped
  });
  it('pathUpTo grows the line and ends exactly at the moving tip', () => {
    const pts = [[0, 0], [0, 10], [10, 10]];
    expect(pathUpTo(pts, 0)).toEqual([[0, 0], [0, 0]]);
    expect(pathUpTo(pts, 0.25)).toEqual([[0, 0], [0, 5]]);
    expect(pathUpTo(pts, 0.75)).toEqual([[0, 0], [0, 10], [5, 10]]);
    expect(pathUpTo(pts, 1)).toEqual(pts);
  });
  it('easeOutCubic runs 0 to 1, fast then slow, and is clamped', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(9)).toBe(1);
  });
});
