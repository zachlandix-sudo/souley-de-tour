import { useState } from 'react';
import { getStatistics } from '../../services/adminService';
import { useLoader } from '../../hooks/useLoader';
import LineChart from '../../components/admin/LineChart';
import DonutChart from '../../components/admin/DonutChart';
import StatBars from '../../components/admin/StatBars';
import { fmt, sum } from '../../utils/chartMath';

const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['12m', '12 months']];

// Lines on the activity graph. "Spots added" is off at first: an import adds hundreds of spots in one day and would flatten the rest.
const SERIES = [
  { id: 'users', label: 'New sign-ups', color: '#ff6a13', on: true },
  { id: 'reviews', label: 'New reviews', color: '#2b2b2b', on: true },
  { id: 'trips', label: 'Trips planned', color: '#1d7a4c', on: true },
  { id: 'aiChats', label: 'Ask SOULEY chats', color: '#5b7f95', on: true },
  { id: 'spots', label: 'Spots added', color: '#e0a060', on: false, hint: 'Off at first: importing spots adds hundreds in one day and flattens the other lines.' },
];

const PIES = [
  { id: 'spotStatus', tab: 'Status', title: 'Spots by status', noun: 'spots' },
  { id: 'spotCategory', tab: 'Categories', title: 'Spots by category', noun: 'tags', note: 'A spot counts once for every category it has.' },
  { id: 'spotDifficulty', tab: 'Difficulty', title: 'Spots by difficulty', noun: 'spots' },
  { id: 'reviewStatus', tab: 'Reviews', title: 'Reviews by status', noun: 'reviews' },
  { id: 'userRole', tab: 'Roles', title: 'Accounts by role', noun: 'accounts' },
  { id: 'tripOrigin', tab: 'Trips', title: 'Trips by how they were made', noun: 'trips' },
];

const BARS = [
  { id: 'towns', tab: 'Towns', unit: 'spots' },
  { id: 'categoryViews', tab: 'Views by category', unit: 'views' },
  { id: 'ratings', tab: 'Star ratings', unit: 'reviews', vertical: true },
];

function Tabs({ items, value, onChange, label }) {
  return (
    <div className="adm-chips" role="group" aria-label={label}>
      {items.map(([id, text]) => <button key={id} type="button" className="adm-chipbtn" aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}
    </div>
  );
}

function Activity({ data, range, setRange, busy }) {
  const [on, setOn] = useState(() => new Set(SERIES.filter((s) => s.on).map((s) => s.id)));
  const tl = data.timeline || {};
  const all = SERIES.map((s) => ({ ...s, values: tl.series?.[s.id] || [] }));
  const shown = all.filter((s) => on.has(s.id));
  const toggle = (id) => setOn((cur) => {
    const next = new Set(cur);
    if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id); // keep at least one line on screen
    return next;
  });
  const t = data.totals || {};
  const per = tl.unit === 'month' ? 'month' : 'day';
  return (
    <section className={`adm-card adm-panel adm-stat-card${busy ? ' is-loading' : ''}`} aria-labelledby="adm-act-h" aria-busy={busy}>
      <div className="adm-panel-head">
        <div>
          <h3 id="adm-act-h" className="adm-panel-title">Activity over time</h3>
          <p className="adm-panel-sub">What visitors and your team did each {per}.</p>
        </div>
        <Tabs items={RANGES} value={range} onChange={setRange} label="Time range" />
      </div>
      <div className="adm-series" role="group" aria-label="Lines to show">
        {all.map((s) => (
          <button key={s.id} type="button" className="adm-serie" style={{ '--c': s.color }} title={s.hint} aria-pressed={on.has(s.id)} onClick={() => toggle(s.id)}>
            <i aria-hidden="true" />{s.label}<b>{fmt(sum(s.values.map((value) => ({ value }))))}</b>
          </button>
        ))}
      </div>
      <LineChart labels={tl.labels || []} series={shown} unit={per} label={`Activity per ${per}`} />
      <dl className="adm-sums">
        <div className="adm-sum"><dt>Spot views, all time</dt><dd>{fmt(t.views)}</dd></div>
        <div className="adm-sum"><dt>Favorites, all time</dt><dd>{fmt(t.favorites)}</dd></div>
        <div className="adm-sum"><dt>Average rating</dt><dd>{t.averageRating ?? '–'}<small>{t.averageRating ? 'out of 5' : ''}</small></dd></div>
        <div className="adm-sum"><dt>Ask SOULEY chats, all time</dt><dd>{fmt(t.aiChats)}</dd></div>
      </dl>
    </section>
  );
}

function BarsCard({ data }) {
  const [id, setId] = useState('towns');
  const def = BARS.find((b) => b.id === id);
  const b = data.bars || {};
  const items = id === 'towns' ? b.towns?.items || [] : b[id] || [];
  const empty = !items.some((i) => i.value > 0);
  const avg = data.totals?.averageRating;
  const sub = {
    towns: `Spots per town${b.towns?.total > items.length ? `, the top ${items.length} of ${b.towns.total} towns` : ''}.`,
    categoryViews: 'Visitor views added up for every category.',
    ratings: avg ? `Approved reviews by star rating. The average is ${avg} out of 5.` : 'Approved reviews by star rating.',
  }[id];
  const none = { towns: 'No spots yet.', categoryViews: 'No views yet. They show up once visitors open spots.', ratings: 'No approved reviews yet.' }[id];
  return (
    <section className="adm-card adm-panel adm-stat-card" aria-labelledby="adm-bars-h">
      <div className="adm-panel-head">
        <div>
          <h3 id="adm-bars-h" className="adm-panel-title">Top places and scores</h3>
          <p className="adm-panel-sub">{sub}</p>
        </div>
        <Tabs items={BARS.map((x) => [x.id, x.tab])} value={id} onChange={setId} label="Bar graph" />
      </div>
      {empty ? <p className="adm-empty">{none}</p> : <StatBars key={id} items={items} unit={def.unit} vertical={def.vertical} label={def.tab} />}
    </section>
  );
}

function PieCard({ data }) {
  const [id, setId] = useState('spotStatus');
  const def = PIES.find((p) => p.id === id);
  const items = data.pies?.[id] || [];
  return (
    <section className="adm-card adm-panel adm-stat-card" aria-labelledby="adm-pie-h">
      <div className="adm-panel-head">
        <div>
          <h3 id="adm-pie-h" className="adm-panel-title">Breakdowns</h3>
          <p className="adm-panel-sub">{def.title}.{def.note ? ` ${def.note}` : ''}</p>
        </div>
        <Tabs items={PIES.map((p) => [p.id, p.tab])} value={id} onChange={setId} label="Pie graph" />
      </div>
      {sum(items) ? <DonutChart key={id} items={items} noun={def.noun} label={def.title} /> : <p className="adm-empty">Nothing to show yet.</p>}
    </section>
  );
}

// The dashboard's statistics: a line graph of activity over time, a bar graph and a pie graph. It loads on its own, so the
// rest of the dashboard never waits for it, and a failure here only shows a small retry note.
export default function DashboardStats() {
  const [range, setRange] = useState('30d');
  const { data, loading, error, reload } = useLoader(() => Promise.resolve(getStatistics(range)), [range]);

  return (
    <section className="adm-stats" aria-labelledby="adm-stats-h">
      <div className="adm-stats-head">
        <div>
          <h2 id="adm-stats-h" className="adm-stats-title">Statistics</h2>
          <p className="adm-panel-sub">Everything happening on SOULEY de Tour: sign-ups, spots, reviews, trips and chats.</p>
        </div>
      </div>
      {error && (
        <div role="alert" className="adm-stat-error">
          <span>{data ? 'Could not load those numbers. Showing the last ones.' : 'Could not load the statistics.'}</span>
          <button type="button" className="btn btn-dark" onClick={reload}>Retry</button>
        </div>
      )}
      {!data && loading && <div className="adm-card adm-panel" aria-busy="true"><p className="adm-empty">Loading statistics…</p></div>}
      {data && (
        <>
          <Activity data={data} range={range} setRange={setRange} busy={loading} />
          <div className="adm-stat-row">
            <BarsCard data={data} />
            <PieCard data={data} />
          </div>
        </>
      )}
    </section>
  );
}
