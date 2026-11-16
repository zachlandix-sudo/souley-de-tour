// "Travel time" on the spot map: an offline estimate from the visitor's location to a spot, plus the helpers the
// route animation needs. No React or Leaflet in here, so it is easy to test.
//
// The estimate is straight-line distance x a detour factor (roads wind) / an average speed for the mode.
// It is an estimate only: traffic, stops and ferries are NOT included. Change the numbers below to tune it.
import { distanceKm } from './geo.js';

export const MODES = [
  { id: 'walk', labelKey: 'travel.walk', kmh: 4.5, detour: 1.25, loopMs: 6500 },
  { id: 'bike', labelKey: 'travel.bike', kmh: 40, detour: 1.3, loopMs: 3200 },
  { id: 'car', labelKey: 'travel.car', kmh: 45, detour: 1.3, loopMs: 2600 },
];
export const DEFAULT_MODE = 'car';

// Timing of the animation (the card counts up in step with the route being drawn).
export const ROUTE_DELAY_MS = 450; // fallback wait for the camera, if it never reports that it arrived
export const ROUTE_DRAW_MS = 1400; // the line draws itself from you to the spot
export const COUNT_MS = 650; // the number morphs when the mode changes
export const CAMERA_S = 1.1; // camera glide to frame both points

const modeOf = (id) => MODES.find((m) => m.id === id) || MODES.find((m) => m.id === DEFAULT_MODE);
export const loopMs = (id) => modeOf(id).loopMs;

// origin, dest: [lat, lng]. Returns { straightKm, roadKm, minutes } or null when either point is unusable.
export function estimateTravel(origin, dest, modeId = DEFAULT_MODE) {
  const ok = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);
  if (!ok(origin) || !ok(dest)) return null;
  const mode = modeOf(modeId);
  const straightKm = distanceKm(origin, dest);
  const roadKm = straightKm * mode.detour;
  return { straightKm, roadKm, minutes: (roadKm / mode.kmh) * 60 };
}

// 0.4 -> "< 1 min", 42 -> "42 min", 135 -> "2 h 15 min", 1650 -> "1 d 3 h" (a day or more drops the minutes).
// From an hour up the minutes are rounded to the nearest 5, because an estimate should not look more exact than it is.
export function formatDuration(minutes) {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const total = Math.round(minutes / 5) * 5;
  const d = Math.floor(total / 1440);
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  if (d > 0) return `${d} d${h ? ` ${h} h` : ''}`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// 6.04 -> "6.0", 85.4 -> "85"
export const formatRoadKm = (km) => (km == null || !Number.isFinite(km) ? '' : km < 10 ? km.toFixed(1) : String(Math.round(km)));

// When would you arrive if you left at `now`? { time: '3:45 PM', dayOffset: 0 }  (dayOffset 1 = tomorrow, ...)
export function arrival(now, minutes, locale) {
  const end = new Date(now.getTime() + minutes * 60000);
  const day = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return {
    time: end.toLocaleTimeString(locale || undefined, { hour: 'numeric', minute: '2-digit' }),
    dayOffset: Math.round((day(end) - day(now)) / 86400000),
  };
}

export const easeOutCubic = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

// A gentle arc from a to b (both [lat, lng]) so the route reads as a journey, not a ruler line.
// The bend is worked out on a locally flat map so it is perpendicular on screen, and always bends to the same side.
export function arcPoints(a, b, steps = 72, bend = 0.16) {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const k = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180) || 1;
  const x1 = lng1 * k, y1 = lat1, x2 = lng2 * k, y2 = lat2;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return [[lat1, lng1], [lat2, lng2]];
  const cx = (x1 + x2) / 2 - dy * bend;
  const cy = (y1 + y2) / 2 + dx * bend;
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps, u = 1 - t;
    out.push([u * u * y1 + 2 * u * t * cy + t * t * y2, (u * u * x1 + 2 * u * t * cx + t * t * x2) / k]);
  }
  out[0] = [lat1, lng1];
  out[out.length - 1] = [lat2, lng2];
  return out;
}

// The point `f` (0..1) of the way along a polyline (by index, which is even enough for an arc sampled this finely).
export function pointAlong(pts, f) {
  const n = pts.length - 1;
  if (n < 1) return pts[0];
  const pos = Math.min(1, Math.max(0, f)) * n;
  const i = Math.min(n - 1, Math.floor(pos));
  const r = pos - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r];
}

// The first `f` (0..1) of a polyline, ending exactly at the moving tip. Used to draw the route as it grows.
export function pathUpTo(pts, f) {
  const n = pts.length - 1;
  if (n < 1) return pts.slice();
  if (f >= 1) return pts.slice();
  const pos = Math.max(0, f) * n;
  const i = Math.floor(pos);
  return [...pts.slice(0, i + 1), pointAlong(pts, f)];
}
