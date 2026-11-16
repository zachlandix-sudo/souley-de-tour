import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { listAdminSpots } from '../../services/adminService';
import { listUsers } from '../../services/userService';
import { rankCommands } from '../../utils/commands';
import { Icon } from './Icons';

// Quick jump (Ctrl K / ⌘ K): type a page, a spot or a person and press Enter. Pages are matched at once; spots and people are looked up
// on the server once two letters are typed (admins only for people). Arrow keys move, Enter goes, Esc closes.
const pagesFor = (isAdmin) => [
  { id: 'p-overview', label: 'Overview', hint: 'Dashboard and charts', to: '/admin', icon: 'dashboard', keywords: 'dashboard home stats numbers' },
  { id: 'p-spots', label: 'Spots', hint: 'All places and food spots', to: '/admin/spots', icon: 'spots', keywords: 'places list food' },
  { id: 'p-new', label: 'Add a spot', hint: 'Start a new spot', to: '/admin/spots/new', icon: 'plus', keywords: 'new create' },
  { id: 'p-health', label: 'Content health', hint: 'What each spot still needs', to: '/admin/health', icon: 'health', keywords: 'quality missing fix pin description duplicates' },
  ...(isAdmin ? [
    { id: 'p-categories', label: 'Categories', hint: 'Groups visitors filter by', to: '/admin/categories', icon: 'categories', keywords: 'groups tags' },
    { id: 'p-reviews', label: 'Reviews', hint: 'Approve or reject', to: '/admin/reviews', icon: 'reviews', keywords: 'moderation queue comments ratings' },
    { id: 'p-users', label: 'Users', hint: 'Roles and accounts', to: '/admin/users', icon: 'users', keywords: 'accounts people roles' },
    { id: 'p-activity', label: 'Activity', hint: 'Who changed what', to: '/admin/activity', icon: 'activity', keywords: 'log audit history changes' },
  ] : []),
  { id: 'p-site', label: 'Public site', hint: 'Open the website', to: '/', icon: 'external', keywords: 'website visitors home' },
];

// Mounted fresh every time it opens (see the wrapper at the bottom), so the text and results of the last visit can never carry over.
function PaletteBody({ onClose, isAdmin }) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]); // spots and people from the server
  const [active, setActive] = useState(0);
  const pages = useMemo(() => pagesFor(isAdmin), [isAdmin]);

  // give focus back to whatever had it when the palette closes
  useEffect(() => {
    const before = document.activeElement;
    return () => { if (before && typeof before.focus === 'function') before.focus(); };
  }, []);

  // spots and people, 250 ms after the last key; answers that arrive late for an older text are dropped
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setFound([]); return undefined; }
    let live = true;
    const t = setTimeout(async () => {
      const [spots, people] = await Promise.all([
        Promise.resolve().then(() => listAdminSpots({ search: text, limit: 5 })).catch(() => null),
        isAdmin ? Promise.resolve().then(() => listUsers({ search: text, limit: 4 })).catch(() => null) : null,
      ]);
      if (!live) return;
      setFound([
        ...((spots && spots.data) || []).map((s) => ({ id: `s-${s._id}`, group: 'Spots', label: s.name, hint: [s.municipality, s.status].filter(Boolean).join(' · '), to: `/admin/spots/${s._id}/edit`, icon: 'spots' })),
        ...((people && people.data) || []).map((u) => ({ id: `u-${u._id}`, group: 'People', label: u.fullName, hint: u.email, to: `/admin/users?search=${encodeURIComponent(u.email)}`, icon: 'users' })),
      ]);
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q, isAdmin]);

  const rows = useMemo(() => [...rankCommands(pages, q).map((p) => ({ ...p, group: 'Go to' })), ...found], [pages, q, found]);
  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, rows.length - 1))); }, [rows.length]);
  useEffect(() => { document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' }); }, [active, listId]);

  const go = (row) => { if (!row) return; onClose(); navigate(row.to); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (rows.length ? (a + 1) % rows.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[active]); }
  };

  let lastGroup = '';
  return createPortal(
    <div className="adm-cmd-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-cmd" role="dialog" aria-modal="true" aria-label="Quick jump" onKeyDown={onKey}>
        <div className="adm-cmd-field">
          <Icon name="search" className="adm-cmd-icon" />
          <input
            ref={(el) => { inputRef.current = el; if (el && document.activeElement !== el) el.focus(); }} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }}
            className="adm-cmd-input" placeholder={isAdmin ? 'Jump to a page, a spot or a person…' : 'Jump to a page or a spot…'} autoComplete="off" spellCheck={false}
            role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={rows.length ? `${listId}-${active}` : undefined} aria-label="Quick jump"
          />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Results" className="adm-cmd-list">
          {rows.map((row, i) => {
            const head = row.group !== lastGroup ? row.group : null;
            lastGroup = row.group;
            return (
              <li key={row.id} role="presentation">
                {head && <p className="adm-cmd-group">{head}</p>}
                <button type="button" id={`${listId}-${i}`} role="option" aria-selected={i === active} tabIndex={-1} className={`adm-cmd-row${i === active ? ' is-active' : ''}`} onMouseMove={() => setActive(i)} onClick={() => go(row)}>
                  <span className="adm-tile" aria-hidden="true"><Icon name={row.icon} /></span>
                  <span className="adm-cmd-text"><b>{row.label}</b>{row.hint && <small>{row.hint}</small>}</span>
                  <Icon name="arrow" className="adm-cmd-go h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="adm-cmd-empty">Nothing matches “{q.trim()}”.</p>}
        <p className="adm-cmd-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>
      </div>
    </div>,
    document.body,
  );
}

export default function CommandPalette({ open, onClose, isAdmin }) {
  return open ? <PaletteBody onClose={onClose} isAdmin={isAdmin} /> : null;
}
