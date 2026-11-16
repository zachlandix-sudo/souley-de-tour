// "Beacons at night": timing for the map's opening sequence. No Leaflet or React in here, so it is easy to test.
//
// 1. The map opens dark and tilted, then dives in to the spots while it levels out and brightens (DIVE_MS).
// 2. Once it lands, the pins drop into place as a wave from the south of the province to the north
//    (the CSS animation in index.css lasts PIN_S seconds).
import { hashSeed } from './contours.js';

export const DIVE_LEAD_MS = 450; // the dark, tilted map holds this long before the dive starts
export const DIVE_MS = 2400;
export const WAVE_SPAN_S = 1.6; // time between the southernmost and the northernmost pin lighting up
export const JITTER_S = 0.25; // keeps pins at the same latitude from lighting in lockstep
export const PIN_S = 0.7; // must match the pin animations in index.css
export const WAVE_TOTAL_MS = Math.round((WAVE_SPAN_S + JITTER_S + PIN_S) * 1000) + 150;
// The Spots page map ("First light", `live` in SpotMap): how long the camera glides to the pins, first time and after that.
export const FLY_FIRST_S = 1.8;
export const FLY_NEXT_S = 1.1;

// items: [{ id, lat }]. Returns Map(id -> delay in seconds), south first.
export function waveDelays(items) {
  const out = new Map();
  if (!items.length) return out;
  let lo = Infinity, hi = -Infinity;
  for (const it of items) { if (it.lat < lo) lo = it.lat; if (it.lat > hi) hi = it.lat; }
  const range = hi - lo;
  for (const it of items) {
    const along = range > 0 ? (it.lat - lo) / range : 0;
    out.set(it.id, Number((along * WAVE_SPAN_S + (hashSeed(it.id) % 250) / 1000 * (JITTER_S / 0.25)).toFixed(2)));
  }
  return out;
}

// Middle of a set of [lat, lng] points.
export function centerOf(points) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [lat, lng] of points) { a = Math.min(a, lat); b = Math.max(b, lat); c = Math.min(c, lng); d = Math.max(d, lng); }
  return [(a + b) / 2, (c + d) / 2];
}
