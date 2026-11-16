import { buildTimeline, fmtTime, parseDuration, toMinutes, totalMinutes } from './timeline';

describe('timeline helpers', () => {
  it('toMinutes / fmtTime', () => {
    expect(toMinutes('08:30')).toBe(510);
    expect(toMinutes('25:00')).toBeNull();
    expect(toMinutes('abc')).toBeNull();
    expect(fmtTime(510)).toBe('08:30');
    expect(fmtTime(1450)).toBe('00:10');
  });
  it('parseDuration', () => {
    expect(parseDuration('2 hours')).toBe(120);
    expect(parseDuration('1-2 hrs')).toBe(90);
    expect(parseDuration('45 minutes')).toBe(45);
    expect(parseDuration('half day')).toBe(240);
    expect(parseDuration('2 hours 30 minutes')).toBe(150);
    expect(parseDuration('30-45 mins')).toBe(38);
    expect(parseDuration('whenever')).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
  });
  it('buildTimeline schedules stops with travel gaps', () => {
    const t = buildTimeline([{ id: 'a', name: 'A', minutes: 60 }, { id: 'b', name: 'B' }], '08:00', 20);
    expect(t[0]).toMatchObject({ start: '08:00', end: '09:00', travelBefore: 0 });
    expect(t[1]).toMatchObject({ start: '09:20', end: '10:50', minutes: 90, travelBefore: 20 });
    expect(totalMinutes(t)).toBe(60 + 90 + 20);
  });
  it('falls back to 08:00 on a bad start time and handles empty', () => {
    expect(buildTimeline([{ id: 'a', name: 'A' }], 'zz')[0].start).toBe('08:00');
    expect(buildTimeline([])).toEqual([]);
  });
});
