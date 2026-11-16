import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../i18n/I18nContext';

// The brand mark: a tiny compass, the same needle the Ask page uses.
function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="nav-mark h-7 w-7 shrink-0">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeOpacity=".18" strokeDasharray="2 3" />
      <path className="nav-needle" d="M16 5l3.2 11L16 27l-3.2-11z" fill="#ff6a13" />
      <circle cx="16" cy="16" r="1.6" fill="#000" />
    </svg>
  );
}

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false); // user menu
  const [menu, setMenu] = useState(false); // phone menu
  const userRef = useRef(null);
  const isStaff = user && ['admin', 'editor'].includes(user.role);
  const link = ({ isActive }) => `nav-link px-3 py-2 text-sm transition-colors hover:text-white ${isActive ? 'is-active text-white' : 'text-white/75'}`;

  // Every page change closes both menus; Escape and a click outside close the user menu.
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!open && !menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); setMenu(false); } };
    const onDown = (e) => { if (open && userRef.current && !userRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open, menu]);

  const item = 'nav-menu-item block w-full px-4 py-2.5 text-left text-sm text-white/85';

  return (
    <nav aria-label="Main" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-4 py-4 sm:px-6 md:flex-nowrap">
      <Link to="/" className="nav-brand group flex items-center gap-2.5 font-display text-2xl tracking-[0.08em] text-white">
        <Mark />
        <span>SOULEY <span className="italic tracking-normal text-orange">de Tour</span></span>
      </Link>

      <button type="button" aria-expanded={menu} aria-controls="nav-panel" aria-label={t('nav.menu')} onClick={() => setMenu((m) => !m)} className="nav-burger md:hidden" data-open={menu ? '1' : ''}>
        <span /><span /><span />
      </button>

      <div id="nav-panel" className={`nav-panel ${menu ? 'is-open' : ''}`}>
        <div className="nav-links">
          <NavLink to="/spots" className={link}>{t('nav.spots')}</NavLink>
          <NavLink to="/food" className={link}><span aria-hidden="true" className="nav-food-dot" />{t('nav.food')}</NavLink>
          <NavLink to="/experience" className={link}>{t('nav.experience')}</NavLink>
          <NavLink to="/passport" className={link}>{t('nav.passport')}</NavLink>
          <NavLink to="/ask" className={link}>{t('nav.ask')}</NavLink>
          <NavLink to="/about-dev" className={link}>{t('nav.aboutDev')}</NavLink>
        </div>
        <div className="nav-actions">
          <LanguageSwitcher />
          {!user ? (
            <>
              <NavLink to="/login" className={link}>{t('nav.login')}</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">{t('nav.register')}</NavLink>
            </>
          ) : (
            <div className="relative" ref={userRef}>
              <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} className="nav-user">
                <span aria-hidden="true" className="nav-avatar">{initials(user.fullName)}</span>
                <span className="max-w-[9rem] truncate">{user.fullName}</span>
                <svg aria-hidden="true" viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}><path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {open && (
                <div role="menu" className="nav-dropdown">
                  <p className="border-b border-white/10 px-4 pb-2.5 pt-1 text-xs text-white/50">{t('nav.signedIn')}<span className="mt-0.5 block truncate text-sm text-white">{user.email || user.fullName}</span></p>
                  {isStaff && <Link role="menuitem" to="/admin" className={item}>{t('nav.admin')}</Link>}
                  <Link role="menuitem" to="/journey" className={item}>{t('nav.journey')}</Link>
                  <Link role="menuitem" to="/saved" className={item}>{t('nav.saved')}</Link>
                  <Link role="menuitem" to="/trips" className={item}>{t('nav.trips')}</Link>
                  <Link role="menuitem" to="/account" className={item}>{t('nav.account')}</Link>
                  <button
                    role="menuitem"
                    type="button"
                    className={`${item} border-t border-white/10`}
                    onClick={async () => {
                      setOpen(false);
                      await logout();
                      navigate('/');
                    }}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
