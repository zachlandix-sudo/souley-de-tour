import { dayLabel, describeAction, timeAgo } from './auditText';

describe('describeAction', () => {
  it('turns known actions into a verb and a tone', () => {
    expect(describeAction({ action: 'spot.published', targetType: 'spot' })).toEqual({ verb: 'published', tone: 'ok', icon: 'spots' });
    expect(describeAction({ action: 'user.deleted', targetType: 'user' })).toEqual({ verb: 'deleted the account of', tone: 'bad', icon: 'users' });
    expect(describeAction({ action: 'review.bulk_rejected', targetType: 'review' }).tone).toBe('warn');
    expect(describeAction({ action: 'export.users', targetType: 'export' }).icon).toBe('download');
  });
  it('single and bulk versions of an action read the same', () => {
    expect(describeAction({ action: 'spot.bulk_archived' }).verb).toBe(describeAction({ action: 'spot.archived' }).verb);
    expect(describeAction({ action: 'review.bulk_approved' }).verb).toBe(describeAction({ action: 'review.approved' }).verb);
  });
  it('shows an unknown action as it is, and never throws on an empty line', () => {
    expect(describeAction({ action: 'spot.teleported', targetType: 'spot' })).toEqual({ verb: 'spot.teleported', tone: 'idle', icon: 'spots' });
    expect(describeAction().verb).toBe('did something');
    expect(describeAction({ action: 'x', targetType: 'nope' }).icon).toBe('activity');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const ago = (ms) => new Date(now - ms).toISOString();
  it('counts minutes, hours and days', () => {
    expect(timeAgo(ago(10 * 1000), now)).toBe('just now');
    expect(timeAgo(ago(5 * 60 * 1000), now)).toBe('5 min ago');
    expect(timeAgo(ago(3 * 3600 * 1000), now)).toBe('3 h ago');
    expect(timeAgo(ago(30 * 3600 * 1000), now)).toBe('yesterday');
    expect(timeAgo(ago(4 * 86400 * 1000), now)).toBe('4 days ago');
  });
  it('a date in the future (a slow clock) reads as just now', () => {
    expect(timeAgo(new Date(now + 5 * 60 * 1000).toISOString(), now)).toBe('just now');
  });
  it('old dates become a plain date, and nonsense becomes nothing', () => {
    expect(timeAgo(ago(60 * 86400 * 1000), now)).toMatch(/Sep/);
    expect(timeAgo('not a date', now)).toBe('');
    expect(timeAgo(undefined, now)).toBe('');
  });
});

describe('dayLabel', () => {
  const now = new Date(2026, 10, 14, 15, 0).getTime(); // 14 Nov 2026, local time
  it('names today and yesterday, and spells out older days', () => {
    expect(dayLabel(new Date(2026, 10, 14, 1, 0), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 10, 13, 23, 59), now)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 10, 10, 9, 0), now)).toMatch(/10/);
    expect(dayLabel(new Date(2025, 11, 31, 9, 0), now)).toMatch(/2025/);
  });
  it('gives nothing for a date that is not one', () => {
    expect(dayLabel('nope', now)).toBe('');
  });
});
