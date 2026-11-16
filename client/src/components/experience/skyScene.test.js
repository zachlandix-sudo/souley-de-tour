import { describe, it, expect } from 'vitest';
import { scene, fmt, nowHour, clamp, STOPS } from './skyScene';

describe('skyScene', () => {
  it('has the sun up at noon and down at midnight', () => {
    expect(scene(12).sunAlt).toBeCloseTo(1, 5);
    expect(scene(0).sunAlt).toBe(0);
    expect(scene(22).sunAlt).toBe(0);
  });
  it('has the moon up at midnight and down at noon', () => {
    expect(scene(0).moonAlt).toBeCloseTo(1, 5);
    expect(scene(22).moonAlt).toBeGreaterThan(0.5);
    expect(scene(12).moonAlt).toBe(0);
  });
  it('is dark at night, light by day, and fades through dusk', () => {
    expect(scene(2).night).toBe(1);
    expect(scene(12).night).toBe(0);
    const dusk = scene(19.25).night;
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
  });
  it('keeps every colour channel and body position in range for every quarter hour', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const s = scene(h);
      for (const c of [s.top, s.bottom, s.sea, s.sun]) for (const v of c) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(255); }
      expect(s.sunX).toBeGreaterThanOrEqual(44); expect(s.sunX).toBeLessThanOrEqual(94);
      expect(s.moonX).toBeGreaterThanOrEqual(44); expect(s.moonX).toBeLessThanOrEqual(94);
    }
  });
  it('keeps the sun and moon on the right edge on phones', () => {
    for (let h = 0; h < 24; h += 0.25) { const s = scene(h, true); expect(s.sunX).toBeGreaterThanOrEqual(80); expect(s.moonX).toBeLessThanOrEqual(94); }
  });
  it('is still deep blue, not brown, in the small hours', () => {
    const [r, , b] = scene(2).bottom;
    expect(b).toBeGreaterThan(r);
  });
  it('joins up at midnight, so the sky does not jump when the slider wraps', () => {
    expect(scene(0).top).toEqual(scene(24).top);
    expect(STOPS[0].top).toBe(STOPS[STOPS.length - 1].top);
  });
  it('formats hours as HH:MM', () => {
    expect(fmt(0)).toBe('00:00');
    expect(fmt(6)).toBe('06:00');
    expect(fmt(17.5)).toBe('17:30');
    expect(fmt(23.75)).toBe('23:45');
  });
  it('reads the clock to the nearest quarter hour and never returns 24', () => {
    expect(nowHour(new Date(2026, 0, 1, 9, 7))).toBe(9);
    expect(nowHour(new Date(2026, 0, 1, 9, 8))).toBe(9.25);
    expect(nowHour(new Date(2026, 0, 1, 23, 58))).toBe(0);
  });
  it('clamps', () => { expect(clamp(-1)).toBe(0); expect(clamp(2)).toBe(1); });
});
