import { bestDayIndex, clock, foodMood, goodFor, peso, priceTier, rankFor, splitCost, sunFraction, verdict, weekday, wmo } from './fun';

describe('weather helpers', () => {
  it('names the weather codes and flags wet and stormy ones', () => {
    expect(wmo(0).word).toBe('Clear');
    expect(wmo(61)).toMatchObject({ wet: true, storm: false });
    expect(wmo(95)).toMatchObject({ wet: true, storm: true });
    expect(wmo(undefined).word).toBe('Unknown');
  });
  it('gives an honest verdict from the numbers', () => {
    expect(verdict({ code: 0, wind: 10, rainChance: 10 }).tone).toBe('good');
    expect(verdict({ code: 61, wind: 10, rainChance: 90 }).tone).toBe('meh');
    expect(verdict({ code: 95 }).tone).toBe('bad');
    expect(verdict({ code: 3, wind: 40, rainChance: 0 }).tone).toBe('meh');
    expect(verdict({ code: 3, wind: 5, rainChance: 50 }).tone).toBe('ok');
  });
  it('picks the day with the lowest rain chance, earliest on a tie', () => {
    expect(bestDayIndex([{ rain: 40 }, { rain: 10 }, { rain: 10 }])).toBe(1);
    expect(bestDayIndex([])).toBe(-1);
  });
  it('formats clock times, weekdays and the sun position', () => {
    expect(clock('2026-11-13T05:34')).toBe('5:34 am');
    expect(clock('2026-11-13T17:05')).toBe('5:05 pm');
    expect(clock('nope')).toBe('');
    expect(weekday('2026-11-13')).toBe('Fri');
    expect(sunFraction('2026-11-13T06:00', '2026-11-13T18:00', 12 * 60)).toBeCloseTo(0.5);
    expect(sunFraction('2026-11-13T06:00', '2026-11-13T18:00', 3 * 60)).toBe(0);
    expect(sunFraction('2026-11-13T06:00', '2026-11-13T18:00', 23 * 60)).toBe(1);
  });
});

describe('money and tags', () => {
  it('splits a cost between people and never goes below one person', () => {
    expect(splitCost(300, 4)).toEqual({ people: 4, each: 300, total: 1200 });
    expect(splitCost(300, 0).people).toBe(1);
    expect(splitCost('x', 3).total).toBe(0);
    expect(peso(1234.4)).toBe('₱1,234');
  });
  it('builds "good for" tags only from fields the spot has', () => {
    expect(goodFor({ entranceFee: 'Free', estimatedBudget: 300, difficulty: 'easy' })).toEqual(['No entrance fee', 'Light on the wallet', 'Easy-going']);
    expect(goodFor({})).toEqual([]);
    expect(goodFor({ difficulty: 'hard' })).toEqual(['For the adventurous']);
  });
  it('labels food places by type and price', () => {
    expect(foodMood({ entryType: 'bakery' })).toBe('Breakfast and merienda');
    expect(foodMood({})).toBe('');
    expect(priceTier({ estimatedBudget: 100 })).toBe('Budget-friendly');
    expect(priceTier({ estimatedBudget: 250 })).toBe('Mid-range');
    expect(priceTier({ estimatedBudget: 900 })).toBe('Treat yourself');
    expect(priceTier({})).toBe('');
  });
  it('ranks food explorers and says how far the next rank is', () => {
    expect(rankFor(0)).toMatchObject({ name: 'Just hungry', next: { at: 1, left: 1 } });
    expect(rankFor(7).name).toBe('Food explorer');
    expect(rankFor(20).next).toBeNull();
  });
});
