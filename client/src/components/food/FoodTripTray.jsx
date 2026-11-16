import { useState } from 'react';
import { tripText, tripUrl } from '../../utils/food';

// The "food trip" tray: a bar pinned to the bottom of the page that appears once a place is added. It lists the stops in
// order, lets the visitor take one off or move it, and opens the whole list as one Google Maps route. Stays on this device.
export default function FoodTripTray({ places, max, onRemove, onMove, onClear, onOpen }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!places.length) return null;

  const copy = async () => {
    try { await navigator.clipboard.writeText(tripText(places)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked: ignore */ }
  };

  return (
    <aside className={`ftt ${open ? 'is-open' : ''}`} aria-label="Your food trip">
      <div className="ftt-bar">
        <button type="button" className="ftt-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span aria-hidden="true">🧭</span> Food trip <b>{places.length}</b><small>/{max}</small>
          <span aria-hidden="true" className="ftt-caret">{open ? '▾' : '▴'}</span>
        </button>
        <a className="btn btn-primary btn-sm" href={tripUrl(places)} target="_blank" rel="noopener noreferrer">Open route in Maps <span aria-hidden="true">↗</span></a>
      </div>
      {open && (
        <div className="ftt-body">
          <ol>
            {places.map((s, i) => (
              <li key={s.slug}>
                <button type="button" className="ftt-name" onClick={() => onOpen(s)}><b>{i + 1}</b> {s.name}<small>{s.municipality}</small></button>
                <span className="ftt-ctl">
                  <button type="button" disabled={i === 0} onClick={() => onMove(s.slug, -1)} aria-label={`Move ${s.name} earlier`}>↑</button>
                  <button type="button" disabled={i === places.length - 1} onClick={() => onMove(s.slug, 1)} aria-label={`Move ${s.name} later`}>↓</button>
                  <button type="button" onClick={() => onRemove(s.slug)} aria-label={`Remove ${s.name} from your food trip`}>&times;</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="ftt-foot">
            <button type="button" onClick={copy}>{copied ? 'List copied ✓' : 'Copy list'}</button>
            <button type="button" onClick={onClear}>Clear trip</button>
            <small>Maps searches each stop by name, so check opening hours before you go.</small>
          </div>
        </div>
      )}
    </aside>
  );
}
