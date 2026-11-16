// Round numbers for a chart's side scale. Returns the step between lines, the top of the scale and every line's value
// (0 up to the top). Counts are whole numbers, so the step is always a whole number too.
export function niceScale(max, intervals = 4) {
  const top = Math.max(1, Number(max) || 0);
  const raw = top / intervals;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => Number.isInteger(s) && s >= raw) || Math.ceil(raw);
  return { step, max: step * intervals, ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step) };
}
