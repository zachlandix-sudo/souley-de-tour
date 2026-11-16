import { useState } from 'react';
import { Link } from 'react-router-dom';
import { bulkSpots, getHealth } from '../../services/adminService';
import { useLoader } from '../../hooks/useLoader';
import { errorMessage } from '../../utils/errors';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import AdminHeader from '../../components/admin/AdminHeader';
import CountUp from '../../components/admin/CountUp';
import Gauge from '../../components/admin/Gauge';
import StatusPill from '../../components/admin/StatusPill';
import ExportButton from '../../components/admin/ExportButton';
import { Icon } from '../../components/admin/Icons';

const SEVERITY = { high: 'Fix first', medium: 'Should fix', low: 'Nice to have' };
const ORDER = { high: 0, medium: 1, low: 2 };
const fmt = (n) => Number(n || 0).toLocaleString();
const spots = (n) => `${fmt(n)} spot${n === 1 ? '' : 's'}`;

function SpotRows({ items }) {
  return (
    <ul className="adm-hrows">
      {items.map((s) => (
        <li key={s._id}>
          <span className="adm-hrow-main"><span className="adm-hrow-name">{s.name}</span><small>{s.municipality}</small></span>
          <StatusPill status={s.status} />
          <Link to={`/admin/spots/${s._id}/edit`} className="adm-hrow-fix" aria-label={`Fix ${s.name}`}>Fix <Icon name="arrow" className="h-3.5 w-3.5" /></Link>
        </li>
      ))}
    </ul>
  );
}

// One kind of problem: its title, how many spots have it, why it matters, and the first few spots with a Fix link each.
function CheckCard({ check, items, onShowAll, busy }) {
  const more = check.count - items.length;
  if (check.count === 0) {
    return <li className="adm-hcheck is-clear"><span className="adm-hcheck-ok" aria-hidden="true"><Icon name="check" className="h-4 w-4" /></span><span><b>{check.label}</b> <small>All good</small></span></li>;
  }
  return (
    <li className={`adm-hcheck is-${check.severity}`}>
      <div className="adm-hcheck-head">
        <div className="min-w-0">
          <p className="adm-hcheck-sev">{SEVERITY[check.severity]}</p>
          <h3 className="adm-hcheck-title">{check.label}</h3>
          <p className="adm-hcheck-hint">{check.hint}</p>
        </div>
        <span className="adm-hcheck-count" aria-label={spots(check.count)}>{fmt(check.count)}</span>
      </div>
      <SpotRows items={items} />
      {more > 0 && <button type="button" className="adm-link-u adm-hcheck-more" disabled={busy} onClick={onShowAll}>{busy ? 'Loading…' : `Show all ${fmt(check.count)}`}</button>}
    </li>
  );
}

export default function ContentHealth() {
  const { data, loading, error, reload } = useLoader(() => getHealth({ limit: 8 }), []);
  const [full, setFull] = useState({}); // check key -> the whole list, after "Show all"
  const [loadingKey, setLoadingKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  const refresh = () => { setFull({}); reload(); };

  async function showAll(key) {
    if (loadingKey) return;
    setLoadingKey(key);
    try {
      const r = await getHealth({ check: key, limit: 500 });
      setFull((f) => ({ ...f, [key]: r.checks[0].items }));
    } catch (e) { setProblem(errorMessage(e)); } finally { setLoadingKey(''); }
  }

  async function publishReady(items, count) {
    if (busy || !items.length) return;
    if (!window.confirm(`Publish ${items.length} draft${items.length === 1 ? '' : 's'} now? Visitors will see ${items.length === 1 ? 'it' : 'them'} straight away.`)) return;
    setBusy(true); setNotice(''); setProblem('');
    try {
      const r = await bulkSpots(items.map((i) => i._id), 'publish');
      setNotice(`Published ${spots(r.matched)}.${count > items.length ? ` ${fmt(count - items.length)} more are ready: run it again for the next batch.` : ''}`);
      refresh();
    } catch (e) { setProblem(errorMessage(e)); } finally { setBusy(false); }
  }

  if (loading && !data) return <div><AdminHeader eyebrow="Content" title="Content health" /><Loading /></div>;
  if (error && !data) return <div><AdminHeader eyebrow="Content" title="Content health" /><ErrorState message={errorMessage(error)} onRetry={reload} /></div>;

  const d = data;
  const t = d.totals;
  // problems first (most serious, then most spots), the "All good" rows last
  const checks = [...d.checks].sort((a, b) => (a.count === 0) - (b.count === 0) || ORDER[a.severity] - ORDER[b.severity] || b.count - a.count);
  const open = checks.filter((c) => c.count > 0);
  const first = open[0];
  const ready = d.opportunities.readyDrafts;
  const stale = d.opportunities.staleDrafts;
  const tone = d.score === null ? '' : d.score >= 85 ? 'is-good' : d.score >= 60 ? 'is-fair' : 'is-low';

  return (
    <div>
      <AdminHeader eyebrow="Content" title="Content health" subtitle="What each spot still needs, so visitors always see something finished. Archived spots are left out.">
        <button type="button" className="btn btn-outline" onClick={refresh}><Icon name="refresh" /> Check again</button>
        <ExportButton kind="spots" params={{ status: 'all' }} label="Export spots" onError={setProblem} />
      </AdminHeader>
      <Banner tone="ok">{notice}</Banner>
      <Banner>{problem}</Banner>

      <div className="adm-health">
        <aside className="adm-health-side">
          <section className={`adm-card adm-panel adm-score ${tone}`} aria-labelledby="adm-score-h">
            <h2 id="adm-score-h" className="adm-panel-title">Health score</h2>
            <p className="adm-panel-sub">Average over your published spots, weighted by how much each gap matters.</p>
            <Gauge percent={d.score ?? 0}>
              <span className="adm-gauge-num">{d.score === null ? '–' : <CountUp value={d.score} />}</span>
              <span className="adm-gauge-cap">{d.score === null ? 'Publish a spot to get a score' : `${fmt(d.scored)} published spot${d.scored === 1 ? '' : 's'} checked`}</span>
            </Gauge>
            <dl className="adm-sums adm-sums-3">
              <div className="adm-sum"><dt>Published</dt><dd>{fmt(t.published)}</dd></div>
              <div className="adm-sum"><dt>Drafts</dt><dd>{fmt(t.draft)}</dd></div>
              <div className="adm-sum"><dt>Archived</dt><dd>{fmt(t.archived)}</dd></div>
            </dl>
            <p className="adm-note adm-score-note">
              <span className={`adm-note-badge${first ? ' is-warn' : ''}`}><Icon name={first ? 'bolt' : 'check'} className="h-5 w-5" /></span>
              {first ? <span>Start with <b>{first.label.toLowerCase()}</b>: {spots(first.count)}.</span> : 'Everything looks finished. Nothing to fix.'}
            </p>
          </section>

          {ready.count > 0 && (
            <section className="adm-card adm-panel" aria-labelledby="adm-ready-h">
              <h2 id="adm-ready-h" className="adm-panel-title">Ready to publish</h2>
              <p className="adm-panel-sub">{spots(ready.count)} in draft with a pin, a real description and a category.</p>
              <ul className="adm-minilist adm-minilist-tight">
                {ready.items.slice(0, 5).map((s) => <li key={s._id}><span className="adm-minilist-main"><Link to={`/admin/spots/${s._id}/edit`} className="adm-recent-name">{s.name}</Link><small>{s.municipality}</small></span></li>)}
              </ul>
              {ready.count > 5 && <p className="adm-drawer-none">and {fmt(ready.count - 5)} more</p>}
              <button type="button" className="btn btn-dark adm-wait-btn" disabled={busy} onClick={() => publishReady(ready.items, ready.count)}><Icon name="eye" /> {busy ? 'Publishing…' : `Publish ${fmt(ready.items.length)}`}</button>
            </section>
          )}

          {stale.count > 0 && (
            <section className="adm-card adm-panel" aria-labelledby="adm-stale-h">
              <h2 id="adm-stale-h" className="adm-panel-title"><Icon name="clock" className="adm-inline-icon" /> Forgotten drafts</h2>
              <p className="adm-panel-sub">{spots(stale.count)} in draft, untouched for {stale.days}+ days. Finish them or archive them.</p>
              <ul className="adm-minilist adm-minilist-tight">
                {stale.items.slice(0, 5).map((s) => <li key={s._id}><span className="adm-minilist-main"><Link to={`/admin/spots/${s._id}/edit`} className="adm-recent-name">{s.name}</Link><small>{s.municipality}</small></span></li>)}
              </ul>
              {stale.count > 5 && <p className="adm-drawer-none">and {fmt(stale.count - 5)} more</p>}
            </section>
          )}
        </aside>

        <section aria-label="Checks">
          <ul className="adm-hchecks">
            {checks.map((c) => <CheckCard key={c.key} check={c} items={full[c.key] || c.items} busy={loadingKey === c.key} onShowAll={() => showAll(c.key)} />)}
          </ul>
        </section>
      </div>
    </div>
  );
}
