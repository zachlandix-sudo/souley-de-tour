import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getHealth } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../hooks/useLoader';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import { Icon } from '../../components/admin/Icons';
import CountUp from '../../components/admin/CountUp';
import StatusPill from '../../components/admin/StatusPill';
import Gauge from '../../components/admin/Gauge';
import BarChart from '../../components/admin/BarChart';
import DashboardStats from './DashboardStats';

const load = () => getDashboard();
const fmt = (n) => Number(n || 0).toLocaleString();

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// One number card: small icon and label on top, a big number, a short line underneath.
// In the markup the label is followed by its number (the CSS grid places the icon, label, number and footer).
function Kpi({ label, value, icon, hot, to, foot }) {
  const body = (
    <>
      <span className="adm-kpi-icon"><Icon name={icon} /></span>
      <p className="adm-kpi-label">{label}</p>
      <p className="adm-kpi-value"><CountUp value={value} /></p>
      <div className="adm-kpi-foot">{foot}</div>
    </>
  );
  const cls = `adm-kpi${hot ? ' is-hot' : ''}`;
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

const METRICS = {
  views: { label: 'Most viewed', icon: 'eye', unit: 'views', key: 'mostViewed', count: 'viewCount' },
  favorites: { label: 'Most favorited', icon: 'heart', unit: 'favorites', key: 'mostFavorited', count: 'favoriteCount' },
};

function TopSpots({ data }) {
  const [metric, setMetric] = useState('views');
  const m = METRICS[metric];
  const items = (data[m.key] || []).map((i) => ({ id: i._id, name: i.name, slug: i.slug, value: Number(i[m.count]) || 0 }));
  const values = items.map((i) => i.value);
  const best = Math.max(0, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = items.length ? Math.round(total / items.length) : 0;
  const share = total ? Math.round((best / total) * 100) : 0;
  return (
    <section className="adm-card adm-panel" aria-labelledby="adm-top-h">
      <div className="adm-panel-head">
        <div>
          <h2 id="adm-top-h" className="adm-panel-title">Top spots</h2>
          <p className="adm-panel-sub">The five spots visitors open and save the most.</p>
        </div>
        <div className="adm-chips">
          {Object.entries(METRICS).map(([k, v]) => (
            <button key={k} type="button" className="adm-chipbtn" aria-pressed={metric === k} onClick={() => setMetric(k)}>
              <Icon name={v.icon} className="h-4 w-4" />{v.label}
            </button>
          ))}
        </div>
      </div>
      {items.length ? <BarChart key={metric} items={items} unit={m.unit} /> : <p className="adm-empty">Nothing yet. Views and favorites show up here once visitors use the site.</p>}
      <dl className="adm-sums">
        <div className="adm-sum adm-sum-hot"><dt>Best</dt><dd>{fmt(best)} <small>{m.unit}</small></dd></div>
        <div className="adm-sum"><dt>Average</dt><dd>{fmt(avg)} <small>{m.unit}</small></dd></div>
        <div className="adm-sum"><dt>Total</dt><dd>{fmt(total)} <small>{m.unit}</small></dd></div>
        <div className="adm-sum"><dt>Top spot’s share</dt><dd>{share}<small>%</small></dd></div>
      </dl>
    </section>
  );
}

function Recent({ items = [] }) {
  return (
    <section className="adm-card adm-panel" aria-labelledby="adm-recent-h">
      <div className="adm-panel-head">
        <div>
          <h2 id="adm-recent-h" className="adm-panel-title"><i className="adm-live-dot" aria-hidden="true" />Recent activity</h2>
          <p className="adm-panel-sub">The spots you or your team edited last.</p>
        </div>
        <Link to="/admin/spots" className="adm-link-u">All spots</Link>
      </div>
      {items.length ? (
        <ul className="adm-recent">
          {items.map((i) => {
            const when = i.updatedAt ? new Date(i.updatedAt) : null;
            return (
              <li key={i._id}>
                <span className="adm-tile" aria-hidden="true"><Icon name="spots" /></span>
                <span className="adm-recent-main">
                  <Link to={`/spots/${i.slug}`} className="adm-recent-name">{i.name}</Link>
                  <span className="adm-recent-status"><StatusPill status={i.status} /></span>
                </span>
                {when && !Number.isNaN(when.getTime()) && <time dateTime={when.toISOString()} className="adm-recent-date">{when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>}
              </li>
            );
          })}
        </ul>
      ) : <p className="adm-empty">Nothing yet. Edits to your spots show up here.</p>}
    </section>
  );
}

// A small card on the overview: the content health score and the first thing to fix. It loads on its own and stays out of the way
// (nothing drawn) while loading or if it fails, so the rest of the overview never waits for it.
const SEV_ORDER = { high: 0, medium: 1, low: 2 };
function HealthGlance() {
  const [h, setH] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => getHealth({ limit: 1 })).then((d) => { if (live && d && Array.isArray(d.checks)) setH(d); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!h) return null;
  const first = h.checks.filter((c) => c.count > 0).sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.count - a.count)[0];
  return (
    <section className="adm-card adm-glance" aria-labelledby="adm-health-h">
      <div className="adm-glance-main">
        <h2 id="adm-health-h" className="adm-panel-title">Content health</h2>
        <p className="adm-panel-sub">How finished your published spots are.</p>
      </div>
      {h.score === null ? <p className="adm-note adm-glance-body">Publish a spot to get a score.</p> : (
        <div className="adm-glance-body">
          <p className="adm-glance-score"><span>{h.score}</span><small>%</small></p>
          <div className="adm-glance-bar">
            <div className="adm-meter" role="img" aria-label={`Health score ${h.score} percent`}><i style={{ width: `${h.score}%` }} /></div>
            <p className="adm-glance-line">{first ? <>Start with <b>{first.label.toLowerCase()}</b>: {fmt(first.count)} spot{first.count === 1 ? '' : 's'}.</> : 'Everything looks finished.'}</p>
          </div>
        </div>
      )}
      <Link to="/admin/health" className="btn btn-outline">Open content health <Icon name="arrow" /></Link>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useLoader(load, []);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState onRetry={reload} />;
  const d = data || {};
  const pending = d.pendingReviews || 0;
  const isAdmin = user?.role === 'admin';
  const first = String(user?.fullName || '').trim().split(/\s+/)[0];
  const total = d.totalSpots || 0;
  const live = d.publishedSpots || 0;
  const pct = total ? Math.min(100, Math.round((live / total) * 100)) : 0;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div>
      <div className="adm-hello">
        <div>
          <h1 className="adm-hello-title">{greeting()}{first ? `, ${first}` : ''}</h1>
          <p className="adm-hello-sub">
            {today}.{' '}
            {total
              ? <><b>{fmt(live)} of {fmt(total)}</b> {total === 1 ? 'spot is' : 'spots are'} visible to visitors{pending > 0 ? <>, and <b>{fmt(pending)}</b> {pending === 1 ? 'review is' : 'reviews are'} in the queue</> : ', and the review queue is empty'}.</>
              : 'No spots yet. Add your first one to get started.'}
          </p>
        </div>
        <div className="adm-hello-actions">
          <Link to="/admin/spots" className="btn btn-outline"><Icon name="spots" /> Manage spots</Link>
          <Link to="/admin/spots/new" className="btn btn-dark"><Icon name="plus" /> Add spot</Link>
        </div>
      </div>

      <div className="adm-kpis">
        <Kpi label="Total spots" value={d.totalSpots} icon="spots"
          foot={<><span className="adm-tag">{pct}% live</span><span>{fmt(live)} published</span></>} />
        <Kpi label="Pending reviews" value={d.pendingReviews} icon="reviews" hot={pending > 0} to={isAdmin && pending > 0 ? '/admin/reviews' : undefined}
          foot={pending > 0 ? <><span className="adm-tag is-warn">Needs you</span><span>in the review queue</span></> : <><span className="adm-tag is-ok">All clear</span><span>nothing waiting</span></>} />
        <Kpi label="Users" value={d.users} icon="users" foot={<span>Registered accounts</span>} />
        <Kpi label="Itineraries" value={d.itineraries} icon="itineraries" foot={<span>Trips planned by visitors</span>} />
      </div>

      <DashboardStats />

      <div className="adm-main-row">
        <TopSpots data={d} />
        <Recent items={d.recentActivity} />
      </div>

      <div className="adm-trio">
        <section className="adm-card adm-panel" aria-labelledby="adm-pub-h">
          <h2 id="adm-pub-h" className="adm-panel-title">Published spots</h2>
          <p className="adm-panel-sub">Share of your spots that visitors can see.</p>
          <Gauge percent={pct}>
            <span className="adm-gauge-num"><CountUp value={pct} /></span>
            <span className="adm-gauge-cap">{total ? `${fmt(live)} of ${fmt(total)} spots live` : 'No spots yet'}</span>
          </Gauge>
        </section>

        <section className="adm-card adm-panel" aria-labelledby="adm-wait-h">
          <h2 id="adm-wait-h" className="adm-panel-title">Waiting on you</h2>
          <p className="adm-panel-sub">Reviews that need a decision before they go live.</p>
          <p className="adm-note">
            <span className={`adm-note-badge${pending > 0 ? ' is-warn' : ''}`}><Icon name={pending > 0 ? 'reviews' : 'check'} className="h-5 w-5" /></span>
            {pending > 0 ? `${pending} review${pending === 1 ? ' is' : 's are'} waiting for you.` : 'Everything is up to date. Nothing is waiting for you.'}
          </p>
          {isAdmin && pending > 0 && <Link to="/admin/reviews" className="btn btn-dark adm-wait-btn">Open review queue <Icon name="arrow" /></Link>}
        </section>

        <section className="adm-card adm-panel" aria-labelledby="adm-short-h">
          <h2 id="adm-short-h" className="adm-panel-title">Shortcuts</h2>
          <p className="adm-panel-sub">Jump to the places you use most.</p>
          <ul className="adm-short">
            <li><Link to="/" className="adm-short-row"><span className="adm-tile" aria-hidden="true"><Icon name="external" /></span><span>Open public site</span><Icon name="arrow" className="h-4 w-4" /></Link></li>
            {isAdmin && <li><Link to="/admin/categories" className="adm-short-row"><span className="adm-tile" aria-hidden="true"><Icon name="categories" /></span><span>Edit categories</span><Icon name="arrow" className="h-4 w-4" /></Link></li>}
            {isAdmin && <li><Link to="/admin/users" className="adm-short-row"><span className="adm-tile" aria-hidden="true"><Icon name="users" /></span><span>Manage users</span><Icon name="arrow" className="h-4 w-4" /></Link></li>}
          </ul>
        </section>
      </div>

      <HealthGlance />
    </div>
  );
}
