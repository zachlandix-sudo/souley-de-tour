import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bulkSpots, deleteSpot, listAdminSpots, setSpotStatus } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../hooks/useLoader';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { useSelection } from '../../hooks/useSelection';
import { errorMessage } from '../../utils/errors';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import SpotImage from '../../components/SpotImage';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusPill from '../../components/admin/StatusPill';
import BulkBar from '../../components/admin/BulkBar';
import ExportButton from '../../components/admin/ExportButton';
import { Icon } from '../../components/admin/Icons';

const STATUSES = [['all', 'All'], ['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']];
const spots_ = (n) => `${n} spot${n === 1 ? '' : 's'}`;

export default function SpotsAdmin() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [params] = useSearchParams();
  const urlSearch = params.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null); // a spot id, or 'bulk' while a bulk action runs
  const { data, loading, error, reload } = useLoader(() => listAdminSpots({ search: search || undefined, status, page, limit: 10 }), [search, status, page]);
  useEffect(() => { setSearch(urlSearch); setPage(1); }, [urlSearch]);
  const onSearch = useDebouncedCallback((t) => { setSearch(t); setPage(1); }, 400);

  const spots = data?.data || [];
  const total = data?.pagination?.total;
  const sel = useSelection(spots.map((s) => s._id));
  const off = (id) => busyId === id || busyId === 'bulk';

  async function act(id, fn) {
    if (busyId) return;
    setBusyId(id);
    setBanner('');
    setNotice('');
    try { await fn(); reload(); } catch (e) { setBanner(errorMessage(e)); } finally { setBusyId(null); }
  }
  const remove = (s) => {
    if (!window.confirm(`Delete "${s.name}" permanently? This cannot be undone.`)) return;
    act(s._id, () => deleteSpot(s._id, true));
  };

  // one action on every ticked spot (the server does it in one go and writes one line in the activity log)
  async function bulk(action, done) {
    if (busyId || !sel.count) return;
    if (action === 'delete' && !window.confirm(`Delete ${spots_(sel.count)} permanently? Their reviews go too. This cannot be undone.`)) return;
    setBusyId('bulk');
    setBanner('');
    setNotice('');
    try {
      const r = await bulkSpots(sel.ids, action);
      setNotice(`${done} ${spots_(r.matched)}.`);
      sel.clear();
      reload();
    } catch (e) { setBanner(errorMessage(e)); } finally { setBusyId(null); }
  }

  return (
    <div>
      <AdminHeader eyebrow="Content" title="Spots" subtitle={total != null ? `${total} place${total === 1 ? '' : 's'} on the map. Add photos, publish, or tidy up.` : 'Every place and food spot on the map.'}>
        <ExportButton kind="spots" params={{ status, search }} onError={setBanner} />
        <Link to="/admin/spots/new" className="btn btn-dark"><Icon name="plus" /> Add spot</Link>
      </AdminHeader>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="adm-search flex-1 text-sm"><span className="sr-only">Search spots</span>
          <Icon name="search" className="adm-search-icon" />
          <input key={urlSearch} type="search" defaultValue={urlSearch} placeholder="Search spots" onChange={(e) => onSearch(e.target.value.trim())} className="field" />
        </label>
        <div role="group" aria-label="Status" className="adm-seg">
          {STATUSES.map(([v, label]) => (
            <button key={v} type="button" aria-pressed={status === v} onClick={() => { setStatus(v); setPage(1); }}>{label}</button>
          ))}
        </div>
      </div>
      <Banner>{banner}</Banner>
      <Banner tone="ok">{notice}</Banner>
      {loading && !data && <Loading />}
      {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
      {!error && data && spots.length === 0 && <EmptyState title="No spots found." />}
      {!error && spots.length > 0 && (
        <div className="adm-card adm-tablewrap">
          <table className="adm-table">
            <thead><tr>
              <th className="adm-selcol"><input type="checkbox" className="adm-check" checked={sel.allOn} ref={(el) => { if (el) el.indeterminate = sel.some; }} onChange={sel.toggleAll} aria-label="Select all spots on this page" /></th>
              <th>Name</th><th>Municipality</th><th>Status</th><th>Updated</th><th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {spots.map((s, n) => (
                <tr key={s._id} className={`adm-row${sel.has(s._id) ? ' is-picked' : ''}`} style={{ '--n': Math.min(n, 12) }}>
                  <td className="adm-selcol"><input type="checkbox" className="adm-check" checked={sel.has(s._id)} onChange={() => sel.toggle(s._id)} aria-label={`Select ${s.name}`} /></td>
                  <td>
                    <div className="flex items-center gap-3">
                      <SpotImage src={s.images?.[0]} fallbacks={s.images?.slice(1)} slug={s.slug} alt={s.name} className="h-12 w-12 shrink-0" />
                      <span className="min-w-0">
                        <span className="font-display text-lg leading-tight">{s.name}</span>
                        {s.isFeatured && <span className="adm-tag-feat"><Icon name="star" className="h-3 w-3" /> Featured</span>}
                      </span>
                    </div>
                  </td>
                  <td>{s.municipality}</td>
                  <td><StatusPill status={s.status} /></td>
                  <td className="text-muted">{s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ''}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" disabled={off(s._id)} onClick={() => act(s._id, () => bulkSpots([s._id], s.isFeatured ? 'unfeature' : 'feature'))} className={`adm-icon-btn adm-star${s.isFeatured ? ' is-on' : ''}`} aria-pressed={!!s.isFeatured} aria-label={`Feature ${s.name} on the home page`} title={s.isFeatured ? 'Featured on the home page' : 'Feature on the home page'}><Icon name="star" /></button>
                      <Link to={`/admin/spots/${s._id}/edit`} className="adm-icon-btn" aria-label={`Edit ${s.name}`} title="Edit"><Icon name="edit" /></Link>
                      {s.status === 'published'
                        ? <button type="button" disabled={off(s._id)} onClick={() => act(s._id, () => setSpotStatus(s._id, 'draft'))} className="adm-icon-btn" aria-label={`Unpublish ${s.name}`} title="Unpublish"><Icon name="eyeOff" /></button>
                        : <button type="button" disabled={off(s._id)} onClick={() => act(s._id, () => setSpotStatus(s._id, 'published'))} className="adm-icon-btn" aria-label={`Publish ${s.name}`} title="Publish"><Icon name="eye" /></button>}
                      {s.status !== 'archived'
                        ? <button type="button" disabled={off(s._id)} onClick={() => act(s._id, () => setSpotStatus(s._id, 'archived'))} className="adm-icon-btn" aria-label={`Archive ${s.name}`} title="Archive"><Icon name="archive" /></button>
                        : <span aria-hidden="true" className="w-[2.1rem]" />}
                      {isAdmin && <button type="button" disabled={off(s._id)} onClick={() => remove(s)} className="adm-icon-btn adm-icon-btn-danger" aria-label={`Delete ${s.name} permanently`} title="Delete permanently"><Icon name="trash" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} />
      <BulkBar count={sel.count} noun="spot" onClear={sel.clear}>
        <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('publish', 'Published')}><Icon name="eye" className="h-4 w-4" /> Publish</button>
        <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('draft', 'Moved to draft:')}><Icon name="eyeOff" className="h-4 w-4" /> Unpublish</button>
        <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('feature', 'Featured')}><Icon name="star" className="h-4 w-4" /> Feature</button>
        <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('archive', 'Archived')}><Icon name="archive" className="h-4 w-4" /> Archive</button>
        {isAdmin && <button type="button" className="adm-bulk-btn is-danger" disabled={busyId === 'bulk'} onClick={() => bulk('delete', 'Deleted')}><Icon name="trash" className="h-4 w-4" /> Delete</button>}
      </BulkBar>
    </div>
  );
}
