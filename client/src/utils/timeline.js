// Pure helpers for the trip timeline.
export const DEFAULT_MINUTES = 90;

export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}

export function fmtTime(total) {
  const m = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// "2 hours" -> 120, "1-2 hrs" -> 90, "2 hours 30 minutes" -> 150, "45 minutes" -> 45, "half day" -> 240, unknown -> null
export function parseDuration(text) {
  if (typeof text !== 'string') return null;
  const t = text.toLowerCase();
  if (/half[\s-]?day/.test(t)) return 240;
  if (/full[\s-]?day|whole day/.test(t)) return 480;
  const part = (units) => {
    const m = new RegExp(`(\\d+(?:\\.\\d+)?)(?:\\s*(?:-|to)\\s*(\\d+(?:\\.\\d+)?))?\\s*(?:${units})\\b`).exec(t);
    return m ? (Number(m[1]) + Number(m[2] ?? m[1])) / 2 : null;
  };
  const h = part('hours?|hrs?|h');
  const mi = part('minutes?|mins?');
  const d = part('days?');
  if (h === null && mi === null && d === null) return null;
  const mins = (h ?? 0) * 60 + (mi ?? 0) + (d ?? 0) * 480;
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.min(Math.round(mins), 720);
}

// stops: [{ id, name, minutes? }] -> sequential schedule with travel gaps between stops.
export function buildTimeline(stops = [], startTime = '08:00', travelMinutes = 20) {
  let cursor = toMinutes(startTime);
  if (cursor === null) cursor = 8 * 60;
  return stops.map((s, i) => {
    if (i > 0) cursor += travelMinutes;
    const minutes = Number.isFinite(s.minutes) && s.minutes > 0 ? s.minutes : DEFAULT_MINUTES;
    const start = cursor;
    cursor += minutes;
    return { ...s, minutes, start: fmtTime(start), end: fmtTime(cursor), dayOffset: Math.floor(cursor / 1440), travelBefore: i > 0 ? travelMinutes : 0 };
  });
}

export const totalMinutes = (items) => items.reduce((n, i) => n + i.minutes + i.travelBefore, 0);
export const fmtDuration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
