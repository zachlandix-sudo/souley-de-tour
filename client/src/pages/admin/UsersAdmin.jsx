import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { deleteUser, listUsers, unlockUser, updateUser } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../hooks/useLoader';
import { useDebouncedCallback } from '../../hooks/useDebounce';
import { errorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/auditText';
import Banner from '../../components/Banner';
import Loading from '../../components/Loading';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import AdminHeader from '../../components/admin/AdminHeader';
import Avatar from '../../components/admin/Avatar';
import StatusPill from '../../components/admin/StatusPill';
import ExportButton from '../../components/admin/ExportButton';
import UserPanel from '../../components/admin/UserPanel';
import { Icon } from '../../components/admin/Icons';

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [params] = useSearchParams();
  const urlSearch = params.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const [panelUser, setPanelUser] = useState(null);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [banner, setBanner] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { data, loading, error, reload } = useLoader(
    () => listUsers({ search: search || undefined, role: role || undefined, status: status || undefined, page, limit: 10 }),
    [search, role, status, page]
  );
  useEffect(() => { setSearch(urlSearch); setPage(1); }, [urlSearch]);
  const onSearch = useDebouncedCallback((t) => { setSearch(t); setPage(1); }, 400);

  async function act(id, fn) {
    if (busyId) return;
    setBusyId(id);
    setBanner('');
    try { await fn(); reload(); } catch (e) { setBanner(errorMessage(e)); } finally { setBusyId(null); }
  }
  const users = data?.data || [];
  const sel = 'field w-auto text-sm';
  return (
    <div>
      <AdminHeader eyebrow="People" title="Users" subtitle="Change who can edit, pause an account, or open someone to see what they have done.">
        <ExportButton kind="users" params={{ search, role, status }} onError={setBanner} />
      </AdminHeader>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="adm-search flex-1 text-sm"><span className="sr-only">Search users</span>
          <Icon name="search" className="adm-search-icon" />
          <input key={urlSearch} type="search" defaultValue={urlSearch} placeholder="Search by name or email" onChange={(e) => onSearch(e.target.value.trim())} className="field" /></label>
        <label><span className="sr-only">Filter by role</span>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={sel}>
            <option value="">All roles</option><option value="visitor">Visitor</option><option value="editor">Editor</option><option value="admin">Admin</option>
          </select></label>
        <label><span className="sr-only">Filter by status</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
          </select></label>
      </div>
      <Banner>{banner}</Banner>
      {loading && !data && <Loading />}
      {error && <ErrorState message={errorMessage(error)} onRetry={reload} />}
      {!error && data && users.length === 0 && <EmptyState title="No users found." />}
      {!error && users.length > 0 && (
        <div className="adm-card adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {users.map((u, n) => {
                const own = me && u._id === me._id;
                return (
                  <tr key={u._id} className="adm-row" style={{ '--n': Math.min(n, 12) }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} />
                        <div className="min-w-0">
                          <p className="font-semibold leading-tight">{u.fullName}{own && <span className="ml-2 font-normal text-muted">(you)</span>}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {own ? <span className="capitalize">{u.role}</span> : (
                        <select aria-label={`Role for ${u.fullName}`} value={u.role} disabled={busyId === u._id} onChange={(e) => act(u._id, () => updateUser(u._id, { role: e.target.value }))} className={sel}>
                          <option value="visitor">Visitor</option><option value="editor">Editor</option><option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td>
                      <StatusPill status={u.status} />
                      {u.locked && <span className="adm-lock" title="Locked after too many wrong passwords"><Icon name="lock" className="h-3.5 w-3.5" /> Locked</span>}
                    </td>
                    <td className="text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</td>
                    <td className="text-muted" title={u.lastLogin ? new Date(u.lastLogin).toLocaleString() : undefined}>{u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setPanelUser(u)} className="adm-icon-btn" aria-label={`Details for ${u.fullName}`} title="Details"><Icon name="eye" /></button>
                        {u.locked && <button type="button" disabled={busyId === u._id} onClick={() => act(u._id, () => unlockUser(u._id))} className="adm-icon-btn" aria-label={`Unlock ${u.fullName}`} title="Unlock"><Icon name="unlock" /></button>}
                        {!own && (
                          <>
                            {u.status === 'suspended'
                              ? <button type="button" disabled={busyId === u._id} onClick={() => act(u._id, () => updateUser(u._id, { status: 'active' }))} className="adm-icon-btn" aria-label={`Activate ${u.fullName}`} title="Activate"><Icon name="check" /></button>
                              : <button type="button" disabled={busyId === u._id} onClick={() => act(u._id, () => updateUser(u._id, { status: 'suspended' }))} className="adm-icon-btn" aria-label={`Suspend ${u.fullName}`} title="Suspend"><Icon name="ban" /></button>}
                            <button type="button" disabled={busyId === u._id} onClick={() => { if (window.confirm(`Delete ${u.fullName}?`)) act(u._id, () => deleteUser(u._id)); }} className="adm-icon-btn adm-icon-btn-danger" aria-label={`Delete ${u.fullName}`} title="Delete"><Icon name="trash" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data?.pagination?.pages || 1} onChange={setPage} />
      {panelUser && <UserPanel user={panelUser} isSelf={!!me && panelUser._id === me._id} onClose={() => setPanelUser(null)} onChanged={reload} />}
    </div>
  );
}
