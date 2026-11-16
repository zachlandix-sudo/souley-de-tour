import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FOOD_TYPES, MEALS, activeCount, clockText, sameSet, typeLabel } from '../../utils/food';

const SORT_LABELS = { top: 'Top rated', az: 'A to Z', town: 'By town', near: 'Nearest to me' };

// Everything under the search box on the Food page: type chips with live counts, "I feel like..." meal picks,
// sort, rating, saved and food-log filters, the Spin button, and a row of removable pills for what is switched on.
// It owns no data: `filters` come from the page (and the address bar), `onChange(patch)` hands changes back.
export default function FoodFilters({ filters, onChange, onClear, counts = {}, matched = 0, total = 0, hasRated = false, user = null, nearActive = false, mealNow = null, minutesNow = null, onSpin, spinOpen = false }) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const n = activeCount(filters);
  const sort = filters.sort === 'near' && !nearActive ? 'top' : (filters.sort || (nearActive ? 'near' : 'top'));
  const sorts = nearActive ? ['near', 'top', 'az', 'town'] : ['top', 'az', 'town'];

  const toggleType = (t) => onChange({ types: filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t] });
  const pickMeal = (m) => onChange({ types: sameSet(filters.types, m.types) ? [] : m.types });
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked: nothing to do */ }
  };

  const pills = [
    filters.q && { key: 'q', text: `“${filters.q}”`, off: { q: '' } },
    filters.town && { key: 'town', text: filters.town, off: { town: '' } },
    ...filters.types.map((t) => ({ key: `t-${t}`, text: typeLabel({ entryType: t }), off: { types: filters.types.filter((x) => x !== t) } })),
    filters.minRating > 0 && { key: 'rating', text: `${filters.minRating}★ and up`, off: { minRating: 0 } },
    filters.saved && { key: 'saved', text: 'Saved ♥', off: { saved: false } },
    filters.tried === 'tried' && { key: 'tried', text: 'Ate here ✓', off: { tried: '' } },
    filters.tried === 'new' && { key: 'tried', text: 'Not tried yet', off: { tried: '' } },
  ].filter(Boolean);

  return (
    <div className="ffl">
      {mealNow && !dismissed && filters.types.length === 0 && (
        <div className="ffl-now" role="note">
          <span aria-hidden="true" className="ffl-now-icon">{mealNow.icon}</span>
          <p>
            <b>It is {clockText(minutesNow)} in Southern Leyte.</b> That sounds like {mealNow.label.toLowerCase()} time.
          </p>
          <button type="button" className="ffl-now-go" onClick={() => pickMeal(mealNow)}>Show {mealNow.label.toLowerCase()} spots</button>
          <button type="button" className="ffl-x" onClick={() => setDismissed(true)} aria-label="Dismiss the meal suggestion">&times;</button>
        </div>
      )}

      <div className="ffl-row" role="group" aria-label="Type of place">
        <span className="ffl-label">Type</span>
        <div className="ffl-scroll">
          <button type="button" className="food-chip" aria-pressed={filters.types.length === 0} onClick={() => onChange({ types: [] })}>All types</button>
          {FOOD_TYPES.filter((t) => counts[t] > 0 || filters.types.includes(t)).map((t) => (
            <button key={t} type="button" className="food-chip" aria-pressed={filters.types.includes(t)} onClick={() => toggleType(t)}>
              {typeLabel({ entryType: t })} <span className="ffl-n">{counts[t] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ffl-row" role="group" aria-label="I feel like">
        <span className="ffl-label">I feel like</span>
        <div className="ffl-scroll">
          {MEALS.map((m) => (
            <button key={m.id} type="button" className="food-chip ffl-meal" aria-pressed={sameSet(filters.types, m.types)} onClick={() => pickMeal(m)}>
              <span aria-hidden="true">{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ffl-tools">
        <label className="ffl-select">
          <span>Sort</span>
          <select value={sort} onChange={(e) => onChange({ sort: e.target.value })} aria-label="Sort places">
            {sorts.map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
          </select>
        </label>
        {hasRated && (
          <label className="ffl-select">
            <span>Rating</span>
            <select value={filters.minRating} onChange={(e) => onChange({ minRating: Number(e.target.value) })} aria-label="Minimum rating">
              <option value={0}>Any</option>
              <option value={3}>3★ and up</option>
              <option value={4}>4★ and up</option>
            </select>
          </label>
        )}
        <label className="ffl-select">
          <span>Food log</span>
          <select value={filters.tried} onChange={(e) => onChange({ tried: e.target.value })} aria-label="Filter by your food log">
            <option value="">All places</option>
            <option value="new">Not tried yet</option>
            <option value="tried">Ate here</option>
          </select>
        </label>
        {user
          ? <button type="button" className="ffl-tog" aria-pressed={filters.saved} onClick={() => onChange({ saved: !filters.saved })}>{filters.saved ? '♥' : '♡'} Saved only</button>
          : <Link to="/login" className="ffl-tog" title="Sign in to keep a list of saved places">♡ Saved only</Link>}
        <button type="button" className="ffl-spin" aria-expanded={spinOpen} onClick={onSpin}>
          <span aria-hidden="true">🎲</span> Spin the plate
        </button>
      </div>

      <div className="ffl-sum" aria-live="polite">
        <p>
          <b>{matched}</b> {matched === 1 ? 'place' : 'places'}{n > 0 && total > 0 ? <> of {total}</> : null}
        </p>
        {pills.length > 0 && (
          <ul className="ffl-pills" aria-label="Active filters">
            {pills.map((p) => (
              <li key={p.key}><button type="button" onClick={() => onChange(p.off)} aria-label={`Remove filter: ${p.text}`}>{p.text} <span aria-hidden="true">&times;</span></button></li>
            ))}
          </ul>
        )}
        {n > 0 && <button type="button" className="ffl-link" onClick={onClear}>Clear all</button>}
        {n > 0 && <button type="button" className="ffl-link" onClick={copyLink}>{copied ? 'Link copied ✓' : 'Copy link to this view'}</button>}
      </div>
    </div>
  );
}
