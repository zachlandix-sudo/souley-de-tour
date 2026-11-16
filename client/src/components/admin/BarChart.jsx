import { Link } from 'react-router-dom';
import { niceScale } from '../../utils/niceScale';

const fmt = (n) => Number(n || 0).toLocaleString();

// Vertical capsule bars with a side scale, an average line (dark tag on the right) and the best bar in orange.
// items: [{ id, name, slug, value }]. Every bar links to its public spot page.
export default function BarChart({ items = [], unit = '' }) {
  const values = items.map((i) => Number(i.value) || 0);
  const best = Math.max(0, ...values);
  const { max, ticks } = niceScale(best);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const bestAt = best > 0 ? values.indexOf(best) : -1;
  return (
    <div className="adm-plot">
      <div className="adm-lines" aria-hidden="true">
        {ticks.map((t) => (
          <div key={t} className="adm-line" style={{ bottom: `${(t / max) * 100}%` }}><span className="adm-yl">{fmt(t)}</span></div>
        ))}
        <div className="adm-avg" style={{ bottom: `${(avg / max) * 100}%` }}><span>{fmt(avg)}</span></div>
      </div>
      <div className="adm-cols">
        {items.map((it, n) => (
          <Link key={it.id} to={`/spots/${it.slug}`} className="adm-col" aria-label={`${it.name}, ${fmt(values[n])} ${unit}`}>
            <span className="adm-col-plot" style={{ '--h': values[n] / max, '--n': n }}>
              <span className="adm-val">{fmt(values[n])}</span>
              <span className={`adm-bar-v${n === bestAt ? ' is-best' : ''}`} />
            </span>
            <span className="adm-col-label" title={it.name}>{it.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
