import { useState } from 'react';
import { Link } from 'react-router-dom';
import { bulkReviews, deleteReview, listAllReviews, setReviewStatus } from '../../services/reviewService';
import { useLoader } from '../../hooks/useLoader';
import { useSelection } from '../../hooks/useSelection';
import { errorMessage } from '../../utils/errors';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Rating from '../../components/Rating';
import AdminHeader from '../../components/admin/AdminHeader';
import Avatar from '../../components/admin/Avatar';
import BulkBar from '../../components/admin/BulkBar';
import ExportButton from '../../components/admin/ExportButton';
import { Icon } from '../../components/admin/Icons';

const TABS = ['pending', 'approved', 'rejected'];
const reviews_ = (n) => `${n} review${n === 1 ? '' : 's'}`;

export default function ReviewsAdmin() {
  const [status, setStatus] = useState('pending');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null); // a review id, or 'bulk'
  const { data, loading, error, reload } = useLoader(() => listAllReviews({ status, rating: rating || undefined, page, limit: 10 }), [status, rating, page]);
  const reviews = data?.data || [];
  const counts = data?.counts;
  const sel = useSelection(reviews.map((r) => r._id));
  const off = (id) => busyId === id || busyId === 'bulk';

  async function act(id, fn) {
    if (busyId) return;
    setBusyId(id);
    setBanner('');
    setNotice('');
    try { await fn(); reload(); } catch (e) { setBanner(errorMessage(e)); } finally { setBusyId(null); }
  }
  async function bulk(action, done) {
    if (busyId || !sel.count) return;
    if (action === 'delete' && !window.confirm(`Delete ${reviews_(sel.count)} permanently?`)) return;
    setBusyId('bulk');
    setBanner('');
    setNotice('');
    try {
      const r = await bulkReviews(sel.ids, action);
      setNotice(`${done} ${reviews_(r.matched)}.`);
      sel.clear();
      reload();
    } catch (e) { setBanner(errorMessage(e)); } finally { setBusyId(null); }
  }

  return (
    <div>
      <AdminHeader eyebrow="Community" title="Reviews" subtitle="Read what visitors wrote, then approve, reject or remove it. Tick several to decide them together.">
        <ExportButton kind="reviews" params={{ status }} onError={setBanner} />
      </AdminHeader>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Review status" className="adm-seg inline-flex">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={status === t} type="button" onClick={() => { setStatus(t); setPage(1); }}>
              {t[0].toUpperCase() + t.slice(1)}
              {counts && <span className={`adm-tabcount${t === 'pending' && counts.pending > 0 ? ' is-hot' : ''}`}>{counts[t]}</span>}
            </button>
          ))}
        </div>
        <label><span className="sr-only">Filter by rating</span>
          <select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }} className="field w-auto text-sm">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}
          </select>
        </label>
        {reviews.length > 0 && (
          <label className="adm-pickall"><input type="checkbox" className="adm-check" checked={sel.allOn} ref={(el) => { if (el) el.indeterminate = sel.some; }} onChange={sel.toggleAll} /> Select all on this page</label>
        )}
      </div>
      <Banner>{banner}</Banner>
      <Banner tone="ok">{notice}</Banner>
      {loading && !data && <Loading />}
      {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
      {!error && data && reviews.length === 0 && <EmptyState title={`No ${rating ? `${rating}-star ` : ''}${status} reviews.`} />}
      <ul className="space-y-4">
        {!error && reviews.map((r, n) => (
          <li key={r._id} className={`adm-card adm-row adm-review adm-review-${status}${sel.has(r._id) ? ' is-picked' : ''} p-6`} style={{ '--n': Math.min(n, 12) }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="adm-check" checked={sel.has(r._id)} onChange={() => sel.toggle(r._id)} aria-label={`Select the review by ${r.userId?.fullName || 'an unknown user'}`} />
                <Avatar name={r.userId?.fullName} />
                <div>
                  <p className="font-semibold leading-tight">{r.userId?.fullName || 'Unknown user'}</p>
                  <p className="text-xs text-muted">{r.userId?.email || ''}</p>
                </div>
              </div>
              <Rating value={r.rating} count={1} />
            </div>
            <p className="mt-4 text-sm text-muted">on{' '}
              {r.touristSpotId?.slug ? <Link to={`/spots/${r.touristSpotId.slug}`} className="font-display text-lg text-ink hover:text-ember">{r.touristSpotId.name}</Link> : <span className="font-display text-lg text-ink">{r.touristSpotId?.name || 'Unknown spot'}</span>}
            </p>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            <p className="mt-1 whitespace-pre-line text-[.95rem] leading-relaxed">{r.comment}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              {status !== 'approved' && <button type="button" disabled={off(r._id)} onClick={() => act(r._id, () => setReviewStatus(r._id, 'approved'))} className="btn btn-dark btn-sm"><Icon name="check" className="h-4 w-4" /> Approve</button>}
              {status !== 'rejected' && <button type="button" disabled={off(r._id)} onClick={() => act(r._id, () => setReviewStatus(r._id, 'rejected'))} className="btn btn-outline btn-sm"><Icon name="x" className="h-4 w-4" /> Reject</button>}
              <button type="button" disabled={off(r._id)} onClick={() => { if (window.confirm('Delete this review permanently?')) act(r._id, () => deleteReview(r._id)); }} className="ml-auto inline-flex items-center gap-1.5 text-danger hover:underline"><Icon name="trash" className="h-4 w-4" /> Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} />
      <BulkBar count={sel.count} noun="review" onClear={sel.clear}>
        {status !== 'approved' && <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('approve', 'Approved')}><Icon name="check" className="h-4 w-4" /> Approve</button>}
        {status !== 'rejected' && <button type="button" className="adm-bulk-btn" disabled={busyId === 'bulk'} onClick={() => bulk('reject', 'Rejected')}><Icon name="x" className="h-4 w-4" /> Reject</button>}
        <button type="button" className="adm-bulk-btn is-danger" disabled={busyId === 'bulk'} onClick={() => bulk('delete', 'Deleted')}><Icon name="trash" className="h-4 w-4" /> Delete</button>
      </BulkBar>
    </div>
  );
}
