import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/admin/Icons';
import Avatar from '../components/admin/Avatar';
import CommandPalette from '../components/admin/CommandPalette';

// Layout: a dark sidebar on the left (grouped links, public site, log out, your profile), and on the right a slim top bar
// (breadcrumb, search, clock, "New") above the page. On phones and tablets the sidebar slides in from the left.
const SIDE_KEY = 'souley-admin-side';
const SECTION = { spots: 'Spots', categories: 'Categories', reviews: 'Reviews', users: 'Users', health: 'Content health', activity: 'Activity' };
const isMac = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '');

function trail(pathname) {
  const [, , first, second] = pathname.split('/');
  const root = { label: 'SOULEY', to: '/admin' };
  if (!first) return [root, { label: 'Overview' }];
  const label = SECTION[first] || 'Admin';
  if (first === 'spots' && second === 'new') return [root, { label, to: '/admin/spots' }, { label: 'New spot' }];
  if (first === 'spots' && second) return [root, { label, to: '/admin/spots' }, { label: 'Edit spot' }];
  return [root, { label }];
}

function readCollapsed() {
  try { return localStorage.getItem(SIDE_KEY) === '1'; } catch { return false; }
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [open, setOpen] = useState(false);
  const [jump, setJump] = useState(false); // quick jump (Ctrl K) is open
  const [now, setNow] = useState(() => new Date());
  const searchRef = useRef(null);

  const groups = [
    { label: 'Content', items: [
      { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
      { to: '/admin/spots', label: 'Spots', icon: 'spots' },
      { to: '/admin/health', label: 'Content health', icon: 'health' },
      ...(isAdmin ? [{ to: '/admin/categories', label: 'Categories', icon: 'categories' }] : []),
    ] },
    ...(isAdmin ? [{ label: 'Community', items: [
      { to: '/admin/reviews', label: 'Reviews', icon: 'reviews' },
      { to: '/admin/users', label: 'Users', icon: 'users' },
    ] }, { label: 'System', items: [
      { to: '/admin/activity', label: 'Activity', icon: 'activity' },
    ] }] : []),
  ];

  const out = async () => { await logout(); navigate('/login'); };
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(SIDE_KEY, next ? '1' : '0'); } catch { /* storage can be blocked: the choice just is not remembered */ }
    return next;
  });
  const submitSearch = (e) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') || '').trim();
    navigate(q ? `/admin/spots?search=${encodeURIComponent(q)}` : '/admin/spots');
  };

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // "/" jumps to the search box, unless you are already typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (!searchRef.current || searchRef.current.offsetParent === null) return;
      e.preventDefault();
      searchRef.current.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Ctrl K (⌘ K on a Mac) opens quick jump from anywhere in the admin, even while typing.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key !== 'k' && e.key !== 'K') || !(e.ctrlKey || e.metaKey) || e.altKey) return;
      e.preventDefault();
      setJump((j) => !j);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const link = ({ isActive }) => `adm-nav-link${isActive ? ' is-active' : ''}`;
  const crumbs = trail(pathname);

  return (
    <div className={`adm-shell${collapsed ? ' is-collapsed' : ''}`}>
      <aside id="adm-side" className={`adm-side${open ? ' is-open' : ''}`} aria-label="Admin sidebar">
        <div className="adm-side-head">
          <Link to="/admin" className="adm-brand" aria-label="SOULEY admin home">
            <span className="adm-brand-mark" aria-hidden="true"><Icon name="spots" className="h-5 w-5" /></span>
            <span className="adm-brand-text"><span className="adm-brand-name">SOULEY</span><small>de Tour admin</small></span>
          </Link>
          <button type="button" className="adm-side-btn adm-side-toggle" onClick={toggle} aria-pressed={collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name="sidebar" /></button>
          <button type="button" className="adm-side-btn adm-side-close" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="x" /></button>
        </div>

        <nav aria-label="Admin" className="adm-nav">
          {groups.map((g) => (
            <div key={g.label} className="adm-nav-group">
              <p className="adm-nav-label">{g.label}</p>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} className={link} title={i.label}><Icon name={i.icon} /><span>{i.label}</span></NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="adm-side-foot">
          <Link to="/" className="adm-nav-link" title="Public site"><Icon name="external" /><span>Public site</span></Link>
          <button type="button" onClick={out} className="adm-nav-link" title="Log out"><Icon name="logout" /><span>Log out</span></button>
          <div className="adm-user" title={user?.fullName}>
            <Avatar name={user?.fullName} />
            <span className="adm-user-text"><b>{user?.fullName}</b><small>{user?.role}</small></span>
          </div>
        </div>
      </aside>
      {open && <div className="adm-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}

      <div className="adm-body">
        <div className="adm-frame">
          <header className="adm-top">
            <button type="button" className="adm-burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="adm-side"><Icon name="menu" /></button>
            <nav aria-label="Breadcrumb" className="adm-crumbs">
              {crumbs.map((c, n) => {
                const last = n === crumbs.length - 1;
                return (
                  <span key={c.label} className={`adm-crumb${last ? ' is-last' : ''}`}>
                    {n > 0 && <span className="adm-crumb-sep" aria-hidden="true">›</span>}
                    {last ? <b aria-current="page">{c.label}</b> : <Link to={c.to}>{c.label}</Link>}
                  </span>
                );
              })}
            </nav>
            <form role="search" className="adm-gsearch" onSubmit={submitSearch}>
              <Icon name="search" className="adm-gsearch-icon" />
              <input ref={searchRef} type="search" name="q" placeholder="Search spots…" aria-label="Search spots" className="adm-gsearch-input" autoComplete="off" />
              <kbd aria-hidden="true">/</kbd>
            </form>
            <button type="button" className="adm-cmdk" onClick={() => setJump(true)} aria-label="Quick jump" title="Quick jump"><Icon name="bolt" /><span>Quick jump</span><kbd aria-hidden="true">{isMac() ? '⌘ K' : 'Ctrl K'}</kbd></button>
            <span className="adm-clock"><i aria-hidden="true" /><b>{time}</b><span>{date}</span></span>
            <Link to="/admin/spots/new" className="adm-new" aria-label="New spot"><Icon name="plus" /><span>New</span></Link>
          </header>
          <main className="adm-main"><div key={pathname} className="page-enter"><Outlet /></div></main>
        </div>
      </div>
      <CommandPalette open={jump} onClose={() => setJump(false)} isAdmin={isAdmin} />
    </div>
  );
}
