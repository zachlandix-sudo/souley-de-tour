import { useI18n } from '../../i18n/I18nContext';
import { fmtDuration } from '../../utils/timeline';

const OPTIONS = [30, 45, 60, 90, 120, 180, 240];

// Vertical day timeline: time on the left, stop on the right, travel gaps between stops.
export default function Timeline({ items, onMinutes, card }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <ol aria-label={t('canvas.timeline')} className="xp-tl">
      {items.map((it, i) => (
        <li key={it.id} className="xp-tl-item">
          {it.travelBefore > 0 && <p className="xp-tl-travel">{it.travelBefore} min travel</p>}
          <span aria-hidden="true" className="xp-tl-dot" />
          <p className="xp-tl-time">{it.start}<span className="block text-xs font-normal opacity-60">{it.end}{it.dayOffset > 0 ? ' +1' : ''}</span></p>
          <div className={`xp-tl-card ${card || ''}`}>
            <div>
              <p className="font-semibold">{i + 1}. {it.name}</p>
              {it.municipality && <p className="text-sm opacity-70">{it.municipality}</p>}
            </div>
            <label className="text-sm">
              <span className="sr-only">Time spent at {it.name}</span>
              <select value={OPTIONS.includes(it.minutes) ? it.minutes : ''} onChange={(e) => onMinutes(it.id, Number(e.target.value))} className="xp-select">
                {!OPTIONS.includes(it.minutes) && <option value="">{fmtDuration(it.minutes)}</option>}
                {OPTIONS.map((m) => <option key={m} value={m}>{fmtDuration(m)}</option>)}
              </select>
            </label>
          </div>
        </li>
      ))}
    </ol>
  );
}
