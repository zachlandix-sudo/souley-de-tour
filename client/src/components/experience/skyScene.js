// The sky for a given hour (0-24): colours, where the sun and moon are, how dark it is.
// Pure functions, so they can be tested without a browser.
export const STOPS = [
  { h: 0, top: '#05070f', bottom: '#101a33' }, { h: 4, top: '#080c1d', bottom: '#18214a' }, { h: 5, top: '#2a2f5c', bottom: '#ff9a5a' },
  { h: 7, top: '#4d8fd1', bottom: '#ffd9a0' }, { h: 12, top: '#2f7fd6', bottom: '#9fd4f5' },
  { h: 16.5, top: '#4a86c8', bottom: '#ffcf8a' }, { h: 18.5, top: '#3a2d5e', bottom: '#ff6a13' },
  { h: 20.5, top: '#0c1226', bottom: '#26325a' }, { h: 24, top: '#05070f', bottom: '#101a33' },
];
export const PRESETS = [[6, '6:00'], [12, '12:00'], [17.5, '17:30'], [22, '22:00']];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export const rgb = (c, a = 1) => `rgba(${c.join(',')},${a})`;
export const clamp = (v) => Math.min(1, Math.max(0, v));

// `narrow` (phones): the sun and moon travel along the right edge so they stay clear of the headline.
export function scene(h, narrow = false) {
  let i = 0;
  while (i < STOPS.length - 2 && h >= STOPS[i + 1].h) i++;
  const a = STOPS[i], b = STOPS[i + 1], t = clamp((h - a.h) / (b.h - a.h));
  const top = mix(hex(a.top), hex(b.top), t), bottom = mix(hex(a.bottom), hex(b.bottom), t);
  const x0 = narrow ? 80 : 44, span = narrow ? 14 : 50; // the bodies travel across the right-hand side
  const st = (h - 6) / 12; // the sun is up from 6:00 to 18:00
  const mt = ((h + 6) % 24) / 12; // the moon is up from 18:00 to 6:00 (it peaks at midnight)
  const sunAlt = st >= 0 && st <= 1 ? Math.sin(Math.PI * st) : 0;
  const moonAlt = mt >= 0 && mt <= 1 ? Math.sin(Math.PI * mt) : 0;
  const night = h < 5 ? 1 : h < 6.5 ? (6.5 - h) / 1.5 : h > 20 ? 1 : h > 18.5 ? (h - 18.5) / 1.5 : 0;
  return {
    top, bottom, sunAlt, moonAlt, night: clamp(night),
    sunX: x0 + span * clamp(st), moonX: x0 + span * clamp(mt),
    sun: mix(hex('#ff6a13'), hex('#fff6d0'), clamp(sunAlt * 1.6)),
    sea: mix(mix(bottom, hex('#06304f'), 0.65), hex('#02121f'), 0.25 + 0.5 * clamp(night)),
  };
}

export const fmt = (h) => {
  const m = Math.round(((h % 24) + 24) % 24 * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
// The hour of the day on the visitor's clock, rounded to a quarter hour.
export const nowHour = (d = new Date()) => Math.round((d.getHours() + d.getMinutes() / 60) * 4) / 4 % 24;
