import { fmt } from '../../utils/chartMath';

// Bar graph for a short list. Horizontal rows by default (good for long names like towns), vertical columns with `vertical`
// (good for a handful of short labels like star ratings). The biggest bar is orange, the rest dark, like the Top spots chart.
// items: [{ key, label, value }]
export default function StatBars({ items = [], unit = '', vertical = false, label = 'Bar chart' }) {
  const values = items.map((i) => Number(i.value) || 0);
  const max = Math.max(1, ...values);
  const best = Math.max(0, ...values);
  const bestAt = best > 0 ? values.indexOf(best) : -1;
  return (
    <ul className={vertical ? 'adm-vb' : 'adm-hb'} aria-label={label}>
      {items.map((it, n) => {
        const v = values[n];
        const cls = `${n === bestAt ? 'is-best' : ''}${v === 0 ? ' is-zero' : ''}`.trim();
        return vertical ? (
          <li key={it.key} className={cls} style={{ '--h': v / max, '--n': n }}>
            <span className="adm-vb-plot"><span className="adm-vb-val">{fmt(v)}</span><span className="adm-vb-bar" /></span>
            <span className="adm-vb-label" title={`${fmt(v)} ${unit}`.trim()}>{it.label}<span className="sr-only">: {fmt(v)} {unit}</span></span>
          </li>
        ) : (
          <li key={it.key} className={cls} style={{ '--w': v / max, '--n': n }}>
            <span className="adm-hb-label" title={it.label}>{it.label}</span>
            <span className="adm-hb-track" aria-hidden="true"><span className="adm-hb-bar" /></span>
            <span className="adm-hb-val">{fmt(v)}<span className="sr-only"> {unit}</span></span>
          </li>
        );
      })}
    </ul>
  );
}
