import { useState } from 'react';
import { niceScale } from '../../utils/niceScale';
import { areaPath, axisIndexes, fmt, monotonePath, seriesPoints } from '../../utils/chartMath';

// Line graph: one smooth line per series over the same labels (days or months).
// series: [{ id, label, color, values }]. Hover, touch or the arrow keys move a guide that shows every value at that point.
// Only the lines are SVG (stretched, with a constant stroke width); numbers, dots and the tooltip are HTML so text stays sharp.
export default function LineChart({ labels = [], series = [], unit = 'day', label = 'Activity over time', emptyText = 'No activity in this period.' }) {
  const n = labels.length;
  const [hover, setHover] = useState(null);
  const best = Math.max(0, ...series.flatMap((s) => s.values));
  const { max, ticks } = niceScale(best);
  const at = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const single = series.length === 1;
  const idx = hover !== null && hover < n ? hover : null;

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width || n < 2) return;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))));
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { setHover(null); return; }
    const cur = idx ?? n - 1;
    const next = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setHover(Math.min(n - 1, Math.max(0, next)));
  };

  return (
    <div className="adm-lc">
      <div className="adm-lc-plot" role="group" aria-label={`${label}. Use the left and right arrow keys to read each ${unit}.`} tabIndex={0}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? n - 1)} onBlur={() => setHover(null)} onKeyDown={onKey}>
        <div className="adm-lc-grid" aria-hidden="true">
          {ticks.map((t) => <div key={t} className="adm-lc-tick" style={{ bottom: `${(t / max) * 100}%` }}><span>{fmt(t)}</span></div>)}
          <div className="adm-lc-x">
            {axisIndexes(n, 6).map((i) => <span key={i} style={{ left: `${at(i)}%` }}>{labels[i]}</span>)}
          </div>
        </div>

        <svg className="adm-lc-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {series.map((s) => {
            const pts = seriesPoints(s.values, max);
            return (
              <g key={s.id} style={{ '--c': s.color }}>
                {single && <path className="adm-lc-area" d={areaPath(pts)} />}
                <path className="adm-lc-line" d={monotonePath(pts)} />
              </g>
            );
          })}
        </svg>

        {best === 0 && <p className="adm-lc-empty">{emptyText}</p>}

        {idx !== null && (
          <>
            <div className="adm-lc-guide" style={{ left: `${at(idx)}%` }} aria-hidden="true" />
            {series.map((s) => <span key={s.id} className="adm-lc-dot" aria-hidden="true" style={{ '--c': s.color, left: `${at(idx)}%`, bottom: `${((s.values[idx] || 0) / max) * 100}%` }} />)}
            <div className={`adm-lc-tip${at(idx) > 55 ? ' is-left' : ''}`} style={{ left: `${at(idx)}%` }} aria-hidden="true">
              <b>{labels[idx]}</b>
              {series.map((s) => <span key={s.id} style={{ '--c': s.color }}><i />{s.label}<em>{fmt(s.values[idx])}</em></span>)}
            </div>
          </>
        )}
      </div>

      {/* a table ignores width: 1px, so it sits inside a clipped box or it would widen the page on phones */}
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead><tr><th scope="col">{unit === 'month' ? 'Month' : 'Day'}</th>{series.map((s) => <th key={s.id} scope="col">{s.label}</th>)}</tr></thead>
          <tbody>{labels.map((l, i) => <tr key={l}><th scope="row">{l}</th>{series.map((s) => <td key={s.id}>{s.values[i] || 0}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
