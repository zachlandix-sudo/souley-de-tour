import { niceScale } from './niceScale';

describe('niceScale', () => {
  it('rounds the top up to a tidy number', () => {
    expect(niceScale(2420)).toEqual({ step: 1000, max: 4000, ticks: [0, 1000, 2000, 3000, 4000] });
    expect(niceScale(9)).toMatchObject({ step: 5, max: 20 });
    expect(niceScale(40)).toMatchObject({ step: 10, max: 40 });
  });
  it('never gives a fractional step and never collapses on zero or bad input', () => {
    [0, 1, 3, undefined, null, NaN, 'x'].forEach((v) => {
      const s = niceScale(v);
      expect(Number.isInteger(s.step)).toBe(true);
      expect(s.step).toBeGreaterThanOrEqual(1);
      expect(s.ticks).toHaveLength(5);
    });
  });
  it('always reaches the biggest value', () => {
    [1, 7, 19, 101, 999, 12345].forEach((v) => expect(niceScale(v).max).toBeGreaterThanOrEqual(v));
  });
});
