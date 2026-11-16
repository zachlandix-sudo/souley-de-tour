import { useState } from 'react';
import { OTHER_COLOR, PALETTE, donutSlices, fmt, pctText, sum } from '../../utils/chartMath';

// Pie graph (drawn as a donut): one ring of slices, a legend with count and share, and the total in the middle.
// items: [{ key, label, value }]. Hover (mouse), tap (touch) or focus (keyboard) a legend row to pick out its slice.
// A zero slice stays in the legend but has no arc. The ring is decorative: the legend carries the numbers.
export default function DonutChart({ items = [], noun = 'in total', label = 'Breakdown' }) {
  const [active, setActive] = useState(null);
  const total = sum(items);
  const colorOf = (item, i) => (item.key === '__other' ? OTHER_COLOR : PALETTE[i % PALETTE.length]);
  const slices = donutSlices(items);
  const on = active !== null ? items.find((i) => i.key === active) : null;
  const mouse = (fn) => (e) => { if (e.pointerType !== 'touch') fn(); };

  return (
    <div className="adm-pie" role="group" aria-label={label}>
      <div className={`adm-donut${on ? ' has-active' : ''}`}>
        <svg viewBox="0 0 42 42" aria-hidden="true" focusable="false">
          <circle className="adm-donut-ring" cx="21" cy="21" r="15.9155" />
          {slices.map((s, k) => (
            <circle key={s.key} className={`adm-donut-slice${active === s.key ? ' is-on' : ''}`} cx="21" cy="21" r="15.9155" transform="rotate(-90 21 21)"
              style={{ '--c': colorOf(s, s.index), '--i': k }} strokeDasharray={`${s.len} ${100 - s.len}`} strokeDashoffset={-s.start}
              onPointerEnter={mouse(() => setActive(s.key))} onPointerLeave={mouse(() => setActive(null))} />
          ))}
        </svg>
        <div className="adm-donut-center">
          <span className="adm-donut-num">{fmt(on ? on.value : total)}</span>
          <span className="adm-donut-cap">{on ? on.label : noun}</span>
        </div>
      </div>

      <ul className="adm-legend">
        {items.map((it, i) => (
          <li key={it.key}>
            <button type="button" className={active === it.key ? 'is-on' : ''} style={{ '--c': colorOf(it, i) }} aria-pressed={active === it.key}
              onPointerEnter={mouse(() => setActive(it.key))} onPointerLeave={mouse(() => setActive(null))}
              onPointerUp={(e) => { if (e.pointerType === 'touch') setActive((a) => (a === it.key ? null : it.key)); }}
              onFocus={() => setActive(it.key)} onBlur={() => setActive(null)}>
              <i aria-hidden="true" />
              <span className="l-name">{it.label}</span>
              <span className="l-val">{fmt(it.value)}</span>
              <span className="l-pct">{pctText(it.value, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
