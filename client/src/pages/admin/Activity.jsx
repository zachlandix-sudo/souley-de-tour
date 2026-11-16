import { Fragment, useState } from 'react';
import { getActivity } from '../../services/adminService';
import { useLoader } from '../../hooks/useLoader';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { errorMessage } from '../../utils/errors';
import { dayLabel, describeAction, timeAgo } from '../../utils/auditText';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import AdminHeader from '../../components/admin/AdminHeader';
import ExportButton from '../../components/admin/ExportButton';
import { Icon } from '../../components/admin/Icons';

const TYPES = [['', 'All'], ['spot', 'Spots'], ['review', 'Reviews'], ['user', 'People'], ['category', 'Categories'], ['export', 'Exports']];

// Who changed what, newest first, grouped by day. Admin only. Lines are written by the server whenever staff publish, edit, moderate,
// change a role or export a list.
export default function Activity() {
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState('');
  const { data, loading, error, reload } = useLoader(() => getActivity({ type: type || undefined, q: q || undefined, page, limit: 25 }), [type, q, page]);
  const onSearch = useDebouncedCallback((t) => { setQ(t); setPage(1); }, 400);

  const lines = data?.data || [];
  const total = data?.pagination?.total;
  let lastDay = '';
  return (
    <div>
      <AdminHeader eyebrow="System" title="Activity" subtitle={total != null ? `${total} recorded change${total === 1 ? '' : 's'}. Newest first.` : 'Who changed what, and when.'}>
        <button type="button" className="btn btn-outline" onClick={reload}><Icon name="refresh" /> Refresh</button>
        <ExportButton kind="activity" params={{ type, q }} onError={setBanner} />
      </AdminHeader>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="adm-search flex-1 text-sm"><span className="sr-only">Search the activity</span>
          <Icon name="search" className="adm-search-icon" />
          <input type="search" placeholder="Search by person, spot or detail" onChange={(e) => onSearch(e.target.value.trim())} className="field" /></label>
        <div role="group" aria-label="Kind of change" className="adm-seg">
          {TYPES.map(([v, label]) => <button key={v || 'all'} type="button" aria-pressed={type === v} onClick={() => { setType(v); setPage(1); }}>{label}</button>)}
        </div>
      </div>
      <Banner>{banner}</Banner>
      {loading && !data && <Loading />}
      {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
      {!error && data && lines.length === 0 && <EmptyState title={type || q ? 'Nothing matches that.' : 'No activity yet. Changes you and your team make will show up here.'} />}
      {!error && lines.length > 0 && (
        <div className="adm-card adm-act">
          <ol className="adm-act-list">
            {lines.map((l) => {
              const { verb, tone, icon } = describeAction(l);
              const head = dayLabel(l.createdAt);
              const newDay = head !== lastDay;
              lastDay = head;
              return (
                <Fragment key={l._id}>
                  {newDay && <li className="adm-act-day" aria-label={head}>{head}</li>}
                  <li className={`adm-act-item is-${tone}`}>
                    <span className="adm-act-dot" aria-hidden="true"><Icon name={icon} className="h-4 w-4" /></span>
                    <p className="adm-act-text">
                      <b>{l.actorName || 'Someone'}</b> {verb}{l.targetLabel && <> <b className="adm-act-target">{l.targetLabel}</b></>}
                      {l.detail && <span className="adm-act-detail"> · {l.detail}</span>}
                    </p>
                    <time className="adm-act-time" dateTime={new Date(l.createdAt).toISOString()} title={new Date(l.createdAt).toLocaleString()}>{timeAgo(l.createdAt)}</time>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
      )}
      <Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} />
    </div>
  );
}
