import { describe, it, expect } from 'vitest';
import { frameDt, damp, easeOutQuart } from './motion';

describe('frameDt', () => {
  it('treats the first frame as one 60 Hz frame', () => {
    expect(frameDt(0, 1000)).toBeCloseTo(16.667, 2);
    expect(frameDt(null, 1000)).toBeCloseTo(16.667, 2);
  });
  it('returns the gap between frames', () => {
    expect(frameDt(1000, 1008)).toBe(8);
  });
  it('caps long gaps so a background tab cannot cause a jump', () => {
    expect(frameDt(1000, 6000)).toBe(64);
  });
  it('ignores a clock that went backwards', () => {
    expect(frameDt(2000, 1000)).toBeCloseTo(16.667, 2);
  });
});

describe('damp', () => {
  it('equals the rate on a 60 Hz frame', () => {
    expect(damp(0.1, 1000 / 60)).toBeCloseTo(0.1, 6);
  });
  it('covers the same distance per second at any frame rate', () => {
    const left = (rate, dt, ms) => { let v = 1; for (let t = 0; t < ms; t += dt) v *= 1 - damp(rate, dt); return v; };
    expect(left(0.1, 1000 / 60, 1000)).toBeCloseTo(left(0.1, 1000 / 144, 1000), 2);
  });
  it('stays between 0 and 1', () => {
    expect(damp(5, 16)).toBe(1);
    expect(damp(-1, 16)).toBe(0);
  });
});

describe('easeOutQuart', () => {
  it('runs from 0 to 1 and clamps outside', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuart(2)).toBe(1);
    expect(easeOutQuart(-1)).toBe(0);
  });
  it('starts fast', () => {
    expect(easeOutQuart(0.25)).toBeGreaterThan(0.6);
  });
});
