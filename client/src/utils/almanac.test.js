import { describe, it, expect } from 'vitest';
import { FACTS, THEMES, CALENDAR } from '../data/almanac';
import { entryOfTheDay, upcomingDates, localDayNumber } from './almanac';

describe('almanac data', () => {
  it('has many entries, numbered 1..n in order, with unique ids', () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(50);
    FACTS.forEach((f, i) => { expect(f.id).toBe(i + 1); expect(f.no).toBe(String(i + 1).padStart(2, '0')); });
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
  });

  it('keeps the six original cards first', () => {
    expect(FACTS[0].q).toMatch(/first Mass/);
    expect(FACTS[5].q).toMatch(/golden rule/);
  });

  it('every entry has a known theme, a question and an answer that fit a flip card', () => {
    for (const f of FACTS) {
      expect(THEMES[f.theme], `theme of "${f.q}"`).toBeTruthy();
      expect(f.q.length, `question too long: ${f.q}`).toBeLessThanOrEqual(95);
      expect(f.a.length, `answer too long: ${f.q}`).toBeLessThanOrEqual(240);
      expect(f.a.length).toBeGreaterThan(20);
    }
  });

  it('has no duplicate questions', () => {
    expect(new Set(FACTS.map((f) => f.q)).size).toBe(FACTS.length);
  });

  it('uses every theme at least four times', () => {
    for (const key of Object.keys(THEMES)) expect(FACTS.filter((f) => f.theme === key).length, key).toBeGreaterThanOrEqual(4);
  });

  it('calendar dates are real dates', () => {
    for (const c of CALENDAR) {
      const d = new Date(c.y, c.m - 1, c.d);
      expect(d.getMonth()).toBe(c.m - 1);
      expect(d.getDate()).toBe(c.d);
    }
  });
});

describe('entryOfTheDay', () => {
  it('is the same all day and changes the next day', () => {
    const morning = new Date(2026, 10, 13, 0, 5);
    const night = new Date(2026, 10, 13, 23, 55);
    const next = new Date(2026, 10, 14, 9, 0);
    expect(entryOfTheDay(FACTS, morning).id).toBe(entryOfTheDay(FACTS, night).id);
    expect(entryOfTheDay(FACTS, next).id).not.toBe(entryOfTheDay(FACTS, morning).id);
  });

  it('cycles through every entry once per cycle', () => {
    const seen = new Set();
    for (let i = 0; i < FACTS.length; i += 1) seen.add(entryOfTheDay(FACTS, new Date(2026, 0, 1 + i)).id);
    expect(seen.size).toBe(FACTS.length);
  });

  it('returns null for an empty list', () => {
    expect(entryOfTheDay([], new Date())).toBeNull();
  });
});

describe('upcomingDates', () => {
  const cal = [
    { m: 3, d: 31, y: 1521, text: 'a' },
    { m: 7, d: 1, y: 1960, text: 'b' },
    { m: 11, d: 13, y: 2000, text: 'c' },
  ];

  it('puts today first with 0 days away', () => {
    const r = upcomingDates(cal, new Date(2026, 10, 13, 15, 0), 3);
    expect(r[0]).toMatchObject({ text: 'c', daysAway: 0, year: 2026, yearsOn: 26 });
  });

  it('rolls dates that already passed into next year, soonest first', () => {
    const r = upcomingDates(cal, new Date(2026, 10, 13), 3);
    expect(r.map((x) => x.text)).toEqual(['c', 'a', 'b']);
    expect(r[1]).toMatchObject({ year: 2027, daysAway: 138, yearsOn: 506 });
  });

  it('respects the limit', () => {
    expect(upcomingDates(cal, new Date(2026, 0, 1), 2)).toHaveLength(2);
  });

  it('counts across a leap day', () => {
    const r = upcomingDates([{ m: 3, d: 1, y: 2000, text: 'x' }], new Date(2027, 1, 28), 1);
    expect(r[0].daysAway).toBe(1);
    const r2 = upcomingDates([{ m: 3, d: 1, y: 2000, text: 'x' }], new Date(2028, 1, 28), 1);
    expect(r2[0].daysAway).toBe(2);
  });
});

describe('localDayNumber', () => {
  it('advances by exactly one per calendar day', () => {
    expect(localDayNumber(new Date(2026, 2, 8, 23, 59)) + 1).toBe(localDayNumber(new Date(2026, 2, 9, 0, 1)));
  });
});
