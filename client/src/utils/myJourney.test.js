import { describe, it, expect } from 'vitest';
import { ago, firstName, greetingKey, nextStep, recentStamps, townProgress, tripWhen, unreviewedStamp, upcomingTrip } from './myJourney';

const NOW = new Date(2026, 10, 15, 9, 0, 0); // 15 Nov 2026, local
const trip = (title, startDate, endDate) => ({ _id: title, title, startDate, endDate });

describe('greeting', () => {
  it('follows the hour', () => {
    expect(greetingKey(7)).toBe('journey.hi.morning');
    expect(greetingKey(12)).toBe('journey.hi.afternoon');
    expect(greetingKey(19)).toBe('journey.hi.evening');
  });
  it('uses the first name only', () => {
    expect(firstName('  Maria Santos Cruz ')).toBe('Maria');
    expect(firstName('')).toBe('');
    expect(firstName(undefined)).toBe('');
  });
});

describe('tripWhen', () => {
  it('has no state to report without a date', () => {
    expect(tripWhen(trip('a'), NOW)).toEqual({ state: 'open' });
    expect(tripWhen(trip('a', 'not a date'), NOW)).toEqual({ state: 'open' });
  });
  it('counts whole days to a future start', () => {
    expect(tripWhen(trip('a', '2026-11-16'), NOW)).toEqual({ state: 'soon', days: 1 });
    expect(tripWhen(trip('a', '2026-12-01'), NOW)).toEqual({ state: 'soon', days: 16 });
  });
  it('is "now" on the first day, on the last day and in between', () => {
    expect(tripWhen(trip('a', '2026-11-15'), NOW).state).toBe('now');
    expect(tripWhen(trip('a', '2026-11-13', '2026-11-15'), NOW).state).toBe('now');
    expect(tripWhen(trip('a', '2026-11-10', '2026-11-20'), NOW).state).toBe('now');
  });
  it('is past once the last day is over, and an end before the start does not break it', () => {
    expect(tripWhen(trip('a', '2026-11-01', '2026-11-03'), NOW).state).toBe('past');
    expect(tripWhen(trip('a', '2026-11-20', '2026-11-18'), NOW)).toEqual({ state: 'soon', days: 5 });
  });
});

describe('upcomingTrip', () => {
  it('prefers a trip that is happening now, then the soonest', () => {
    const list = [trip('later', '2026-12-20'), trip('soon', '2026-11-20'), trip('now', '2026-11-14', '2026-11-16'), trip('old', '2026-01-01')];
    expect(upcomingTrip(list, NOW).trip.title).toBe('now');
    expect(upcomingTrip(list.filter((t) => t.title !== 'now'), NOW).trip.title).toBe('soon');
  });
  it('is null when nothing is coming up', () => {
    expect(upcomingTrip([trip('old', '2026-01-01'), trip('open')], NOW)).toBeNull();
    expect(upcomingTrip([], NOW)).toBeNull();
    expect(upcomingTrip(undefined, NOW)).toBeNull();
  });
});

describe('ago', () => {
  it('names today, yesterday and recent days, then leaves a plain date to the page', () => {
    expect(ago('2026-11-15T01:00:00', NOW)).toEqual({ key: 'journey.when.today', n: 0 });
    expect(ago(new Date(2026, 10, 14, 23), NOW)).toEqual({ key: 'journey.when.yesterday', n: 1 });
    expect(ago(new Date(2026, 10, 10), NOW)).toEqual({ key: 'journey.when.daysAgo', n: 5 });
    expect(ago(new Date(2026, 9, 1), NOW).key).toBeNull();
    expect(ago('garbage', NOW)).toBeNull();
    expect(ago(null, NOW)).toBeNull();
  });
});

describe('stamps', () => {
  const stamps = {
    a: { at: '2026-11-01T00:00:00Z', name: 'Alpha', municipality: 'Maasin City', slug: 'alpha' },
    b: { at: '2026-11-10T00:00:00Z', name: 'Beta', municipality: 'Sogod', slug: 'beta' },
    c: { at: '2026-11-05T00:00:00Z', name: 'Gamma', slug: '' },
    d: { at: '2026-11-12T00:00:00Z', name: '' },
  };
  it('lists the newest first and skips nameless ones', () => {
    expect(recentStamps(stamps, 3).map((s) => s.id)).toEqual(['b', 'c', 'a']);
    expect(recentStamps(stamps, 1)).toHaveLength(1);
    expect(recentStamps(null)).toEqual([]);
  });
  it('finds the newest stamped spot without a review, and needs a page to link to', () => {
    expect(unreviewedStamp(stamps, []).id).toBe('b');
    expect(unreviewedStamp(stamps, ['b']).id).toBe('a'); // c has no slug, so it cannot be linked
    expect(unreviewedStamp(stamps, ['a', 'b'])).toBeNull();
    expect(unreviewedStamp({}, [])).toBeNull();
  });
});

describe('townProgress', () => {
  const groups = [
    { town: 'Maasin City', collected: 2, total: 4, badge: false },
    { town: 'Sogod', collected: 3, total: 3, badge: true },
    { town: 'Liloan', collected: 0, total: 5, badge: false },
  ];
  it('keeps towns with a stamp, with a percent and the badge flag', () => {
    expect(townProgress(groups)).toEqual([
      { town: 'Maasin City', collected: 2, total: 4, pct: 50, badge: false },
      { town: 'Sogod', collected: 3, total: 3, pct: 100, badge: true },
    ]);
  });
  it('respects the limit and empty input', () => {
    expect(townProgress(groups, 1)).toHaveLength(1);
    expect(townProgress(undefined)).toEqual([]);
  });
});

describe('nextStep', () => {
  const base = { stamps: 3, saved: 2, trips: 1, asks: 4, food: 2 };
  it('puts a trip that is on or about to start first', () => {
    const now = { trip: { title: 'Sogod weekend' }, when: { state: 'now' } };
    expect(nextStep({ ...base, soon: now })).toMatchObject({ id: 'tripNow', to: '/trips', vars: { name: 'Sogod weekend' } });
    const soon = { trip: { title: 'Limasawa' }, when: { state: 'soon', days: 3 } };
    expect(nextStep({ ...base, soon })).toMatchObject({ id: 'tripSoon', vars: { name: 'Limasawa', n: 3 } });
  });
  it('does not rush a trip that is more than a week away', () => {
    const far = { trip: { title: 'x' }, when: { state: 'soon', days: 20 } };
    expect(nextStep({ ...base, soon: far }).id).toBe('explore');
  });
  it('walks a new visitor in: ask, then stamp, then review, save, plan, food', () => {
    expect(nextStep({}).id).toBe('ask');
    expect(nextStep({ asks: 2, trips: 0 }).id).toBe('stamp');
    expect(nextStep({ ...base, unreviewed: { slug: 'alpha', name: 'Alpha' } })).toMatchObject({ id: 'review', to: '/spots/alpha', vars: { name: 'Alpha' } });
    expect(nextStep({ ...base, saved: 0 }).id).toBe('save');
    expect(nextStep({ ...base, trips: 0 }).id).toBe('plan');
    expect(nextStep({ ...base, food: 0 }).id).toBe('food');
    expect(nextStep(base).id).toBe('explore');
  });
});
