import { useEffect, useRef, useState } from 'react';
import { easeOutCubic } from '../utils/travel';

const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const frame = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16));
const unframe = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

// A number that glides to `target`.
//   enabled  false holds it at 0 (the card shows "Calculating…"); true starts the count
//   firstMs  how long the first count from 0 takes (kept in step with the route being drawn)
//   moreMs   how long it takes to move from one value to another afterwards (e.g. switching walk -> car)
//   animate  false (reduced motion) jumps straight to the target
export function useCountTo(target, { enabled = true, firstMs = 1400, moreMs = 650, animate = true } = {}) {
  const [value, setValue] = useState(!animate && enabled && Number.isFinite(target) ? target : 0);
  const shown = useRef(value);

  useEffect(() => {
    const set = (v) => { shown.current = v; setValue(v); };
    if (!enabled || !Number.isFinite(target)) { set(0); return undefined; }
    if (!animate) { set(target); return undefined; }
    const from = shown.current;
    if (from === target) return undefined;
    const ms = from === 0 ? firstMs : moreMs;
    const t0 = clock();
    let id = 0;
    const tick = () => {
      const p = Math.min(1, (clock() - t0) / ms);
      set(from + (target - from) * easeOutCubic(p));
      if (p < 1) id = frame(tick);
    };
    tick();
    return () => unframe(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, animate]);

  return value;
}

export default useCountTo;
