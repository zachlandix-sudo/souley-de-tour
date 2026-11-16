// INP logger: shows, for every slow interaction, WHICH element it was and how long each of the three phases took.
//   input delay        = the page was busy when you clicked (a running animation frame, a long task)  -> startTime .. processingStart
//   processing time    = your event handlers (and React rendering inside them)                         -> processingStart .. processingEnd
//   presentation delay = style, layout, paint and the next frame's animation callbacks                 -> processingEnd .. the next paint
// Long Animation Frames (LoAF, Chrome 123+) name the script and function that held the main thread.
// Runs in `npm run dev`, or in any build when the address has ?inp (for example https://yoursite/about-dev?inp). Otherwise it does nothing.
// Results are also kept in window.__inp (an array) so they can be copied out of the console.

const LIMIT = 100; // ms: log interactions slower than this ("needs improvement" starts at 200; 100 shows the near misses too)

const label = (el) => {
  if (!el || !el.tagName) return '(unknown)';
  const id = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
  return `${el.tagName.toLowerCase()}${id}${cls}`;
};

export function watchInp() {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  if (!import.meta.env.DEV && !/[?&]inp\b/.test(window.location.search)) return;
  if (!PerformanceObserver.supportedEntryTypes?.includes('event')) { console.info('[inp] this browser has no Event Timing API (use Chrome or Edge).'); return; }

  const frames = []; // recent long animation frames, to find the one that overlaps an interaction
  if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
    new PerformanceObserver((list) => { frames.push(...list.getEntries()); if (frames.length > 60) frames.splice(0, frames.length - 60); }).observe({ type: 'long-animation-frame', buffered: true });
  }
  window.__inp = [];
  let worst = 0;
  const seen = new Set(); // one row per interaction (several events share an interactionId)
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.interactionId || e.duration < LIMIT) continue;
      const key = `${e.interactionId}`;
      const input = Math.round(e.processingStart - e.startTime);
      const processing = Math.round(e.processingEnd - e.processingStart);
      const presentation = Math.max(0, Math.round(e.startTime + e.duration - e.processingEnd));
      const row = { type: e.name, element: label(e.target), total: e.duration, 'input delay': input, processing, presentation };
      const end = e.startTime + e.duration;
      const f = frames.find((fr) => fr.startTime <= end && fr.startTime + fr.duration >= e.startTime);
      if (f) {
        row.frame = { duration: Math.round(f.duration), blocking: Math.round(f.blockingDuration || 0), renderStart: Math.round(f.renderStart - f.startTime), styleAndLayoutStart: Math.round(f.styleAndLayoutStart - f.startTime) };
        row.scripts = (f.scripts || []).filter((sc) => sc.duration >= 8).map((sc) => `${sc.invoker || sc.type} -> ${sc.sourceFunctionName || '(anonymous)'} ${Math.round(sc.duration)}ms @ ${(sc.sourceURL || '').split('/').pop()}:${sc.sourceCharPosition}`);
      }
      const slowest = Math.max(input, processing, presentation);
      row.verdict = slowest === input ? 'INPUT DELAY: something else was running when you interacted' : slowest === processing ? 'PROCESSING: your handler / React render is the cost' : 'PRESENTATION: style, layout, paint or the next frame\'s callbacks are the cost';
      if (seen.has(key) && e.duration <= (window.__inp.find((r) => r.id === key)?.total || 0)) continue;
      seen.add(key); row.id = key;
      window.__inp = window.__inp.filter((r) => r.id !== key); window.__inp.push(row);
      if (e.duration > worst) worst = e.duration;
      console.groupCollapsed(`[inp] ${e.name} on ${row.element}: ${e.duration} ms (input ${input} + processing ${processing} + presentation ${presentation})${e.duration === worst ? '  <- slowest so far' : ''}`);
      console.table({ phases: { input, processing, presentation }, });
      console.log(row.verdict);
      if (row.frame) console.log('long animation frame', row.frame);
      if (row.scripts?.length) console.log('scripts in that frame:\n' + row.scripts.join('\n'));
      console.groupEnd();
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  console.info('[inp] logging interactions slower than', LIMIT, 'ms. window.__inp holds the list.');
}
