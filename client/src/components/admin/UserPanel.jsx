import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { forceLogoutUser, getUserOverview, unlockUser } from '../../services/userService';
import { useLoader } from '../../hooks/useLoader';
import { errorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/auditText';
import Banner from '../Banner';
import Loading from '../Loading';
import ErrorState from '../ErrorState';
import Avatar from './Avatar';
import StatusPill from './StatusPill';
import { Icon } from './Icons';

const day = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// A side panel with what one person has done on the site, and two safety actions: sign them out everywhere, unlock them.
export default function UserPanel({ user, isSelf, onClose, onChanged }) {
  const { data, loading, error, reload } = useLoader(() => getUserOverview(user._id), [user._id]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  // focus the close button on open, Esc closes, and focus goes back to where it was (runs once: the parent's onClose changes every render)
  useEffect(() => {
    const before = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') closeFn.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (before && typeof before.focus === 'function') before.focus(); };
  }, []);

  async function run(fn) {
    if (busy) return;
    setBusy(true); setNotice(''); setProblem('');
    try { setNotice(await fn()); reload(); onChanged?.(); } catch (e) { setProblem(errorMessage(e)); } finally { setBusy(false); }
  }

  const u = data?.user || user;
  const c = data?.counts;
  return createPortal(
    <div className="adm-drawer-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="adm-drawer" role="dialog" aria-modal="true" aria-label={`Details for ${user.fullName}`}>
        <div className="adm-drawer-head">
          <Avatar name={u.fullName} size="h-12 w-12 text-base" />
          <div className="min-w-0 flex-1">
            <h2 className="adm-drawer-name">{u.fullName}</h2>
            <p className="adm-drawer-mail">{u.email}</p>
          </div>
          <button ref={closeRef} type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close details"><Icon name="x" /></button>
        </div>

        <div className="adm-drawer-body">
          <Banner tone="ok">{notice}</Banner>
          <Banner>{problem}</Banner>
          {loading && !data && <Loading />}
          {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
          {data && (
            <>
              <dl className="adm-facts">
                <div><dt>Role</dt><dd className="capitalize">{u.role}</dd></div>
                <div><dt>Status</dt><dd><StatusPill status={u.status} />{u.locked && <span className="adm-lock"><Icon name="lock" className="h-3.5 w-3.5" /> Locked</span>}</dd></div>
                <div><dt>Joined</dt><dd>{day(u.createdAt) || '—'}</dd></div>
                <div><dt>Last login</dt><dd title={u.lastLogin ? new Date(u.lastLogin).toLocaleString() : undefined}>{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</dd></div>
              </dl>

              <ul className="adm-stat4" aria-label="Activity totals">
                <li><b>{c.reviews}</b><span>Reviews</span><small>{c.approvedReviews} approved</small></li>
                <li><b>{c.itineraries}</b><span>Trips planned</span></li>
                <li><b>{c.favorites}</b><span>Saved spots</span></li>
              </ul>

              <h3 className="adm-drawer-h">Latest reviews</h3>
              {data.recentReviews.length ? (
                <ul className="adm-minilist">
                  {data.recentReviews.map((r) => (
                    <li key={r._id}>
                      <span className="adm-minilist-main">
                        {r.touristSpotId?.slug ? <Link to={`/spots/${r.touristSpotId.slug}`} className="adm-recent-name">{r.touristSpotId.name}</Link> : <span className="adm-recent-name">{r.touristSpotId?.name || 'Removed spot'}</span>}
                        <small>{r.rating}★{r.title ? ` · ${r.title}` : ''}</small>
                      </span>
                      <StatusPill status={r.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="adm-drawer-none">No reviews yet.</p>}

              <h3 className="adm-drawer-h">Latest trips</h3>
              {data.recentTrips.length ? (
                <ul className="adm-minilist">
                  {data.recentTrips.map((t) => (
                    <li key={t._id}>
                      <span className="adm-minilist-main"><span className="adm-recent-name">{t.title}</span><small>{t.days} day{t.days === 1 ? '' : 's'}{t.generatedByAI ? ' · planned with Ask SOULEY' : ''}</small></span>
                      <time dateTime={new Date(t.createdAt).toISOString()} className="adm-recent-date">{day(t.createdAt)}</time>
                    </li>
                  ))}
                </ul>
              ) : <p className="adm-drawer-none">No trips yet.</p>}
            </>
          )}
        </div>

        {data && (!isSelf || u.locked) && (
          <div className="adm-drawer-foot">
            {u.locked && <button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={() => run(() => unlockUser(user._id))}><Icon name="unlock" className="h-4 w-4" /> Unlock account</button>}
            {!isSelf && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => { if (window.confirm(`Sign ${user.fullName} out of every device? They can log in again.`)) run(() => forceLogoutUser(user._id)); }}><Icon name="logout" className="h-4 w-4" /> Sign out everywhere</button>}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
