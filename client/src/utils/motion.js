// Small helpers for hand-written animation loops (requestAnimationFrame), so they feel the same on a 60 Hz phone
// and a 120/144 Hz monitor. No React in here, so it is easy to test.

const FRAME = 1000 / 60;

// Time since the last frame in ms, never more than `max` (a background tab or a long task must not make the next
// frame jump). The first frame (last = 0 / null) counts as one normal 60 Hz frame.
export function frameDt(last, now, max = 64) {
  if (!last || !Number.isFinite(last) || !Number.isFinite(now) || now <= last) return FRAME;
  return Math.min(max, now - last);
}

// "Move this share of the way to the target each 60 Hz frame", turned into the right share for a frame of `dt` ms.
//   value += (target - value) * damp(0.1, dt)
export function damp(rate, dt = FRAME) {
  const r = Math.min(1, Math.max(0, rate));
  return 1 - (1 - r) ** (dt / FRAME);
}

// Ease for counting numbers: fast start, long soft landing (gentler on the eye than cubic for 3-digit numbers).
export const easeOutQuart = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 4;
