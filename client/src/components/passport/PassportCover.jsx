import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { COVER_COLORS, initials } from '../../utils/passport';

const LOCALES = { en: 'en-PH', fil: 'fil-PH', ceb: 'en-PH' };

// The passport booklet: leather cover, gold-foil compass and lettering, a ribbon bookmark.
// On a mouse the closed book turns toward the pointer. "Open passport" (or a click on the book) swings the cover open
// onto the holder page: name, passport number, issue date, rank, and for a signed-in visitor an editable home town and cover colour.
// `holder` is { name, number, since, homeTown, color } or null for a guest. `onSaveProfile({ homeTown?, color? })` saves to the account.
export default function PassportCover({ count = 0, total = 0, holder = null, rankLabel = '', onSaveProfile }) {
  const { t, lang } = useI18n();
  const book = useRef(null);
  const toggler = useRef(null);
  const panel = useId();
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(holder?.color || 'black');
  const [town, setTown] = useState(holder?.homeTown || '');
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  useEffect(() => { setColor(holder?.color || 'black'); }, [holder?.color]);
  useEffect(() => { setTown(holder?.homeTown || ''); }, [holder?.homeTown]);

  const onMove = (e) => {
    if (open || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || !book.current) return;
    const b = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
    book.current.style.transform = `rotateY(${px * 22 - 8}deg) rotateX(${-py * 16 + 4}deg)`;
    book.current.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    book.current.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => { if (book.current) book.current.style.transform = ''; };
  const toggle = () => { if (book.current) book.current.style.transform = ''; setState('idle'); setOpen((o) => !o); };
  // Escape closes the open book wherever the focus is (after "Save" the focus drops to the page)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (book.current) book.current.style.transform = '';
      setState('idle'); setOpen(false);
      toggler.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const dirty = town.trim() !== (holder?.homeTown || '');
  const saveTown = async (e) => {
    e.preventDefault();
    if (!dirty || !onSaveProfile) return;
    setState('saving');
    try { await onSaveProfile({ homeTown: town.trim() }); setState('saved'); } catch { setState('error'); }
  };
  const pick = async (c) => {
    if (c === color || !onSaveProfile) return;
    const before = color;
    setColor(c); setState('saving');
    try { await onSaveProfile({ color: c }); setState('saved'); } catch { setColor(before); setState('error'); }
  };

  const no = String(count).padStart(3, '0');
  const since = holder?.since ? new Date(holder.since) : null;
  const issued = since && !Number.isNaN(since.getTime()) ? since.toLocaleDateString(LOCALES[lang] || 'en-PH', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div onPointerMove={onMove} onPointerLeave={onLeave} className="pp-stage">
      <div className="pp-shift" data-open={open ? '1' : '0'}>
        <div ref={book} className="pp-book" data-cover={color}>
          <span aria-hidden="true" className="pp-pages" />

          <div id={panel} role="group" aria-label={t('passport.holder.title')} className="pp-holder">
            <p className="pp-holder-head">{t('passport.holder.title')}</p>
            <div className="pp-holder-id">
              <span aria-hidden="true" className="pp-mono">
                {holder ? initials(holder.name) : (
                  <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]"><path d="M12 2l3 10-3 10-3-10z" fill="#ff6a13" /><path d="M2 12l10-3 10 3-10 3z" fill="#ff6a13" opacity=".55" /></svg>
                )}
              </span>
              <div className="min-w-0">
                <p className="pp-holder-name font-display">{holder ? holder.name : t('passport.holder.guest')}</p>
                <p className="pp-holder-rank">{rankLabel} · {count}/{total}</p>
              </div>
            </div>
            {holder ? (
              <>
                <form onSubmit={saveTown} className="pp-holder-town">
                  <label htmlFor={`${panel}-town`}>{t('passport.holder.home')}</label>
                  <div>
                    <input id={`${panel}-town`} value={town} maxLength={60} onChange={(e) => { setTown(e.target.value); setState('idle'); }} placeholder={t('passport.holder.homePlaceholder')} autoComplete="off" />
                    {dirty && <button type="submit" disabled={state === 'saving'}>{t('passport.holder.save')}</button>}
                  </div>
                </form>
                <dl className="pp-holder-rows">
                  <div><dt>{t('passport.holder.number')}</dt><dd>{holder.number}</dd></div>
                  {issued && <div><dt>{t('passport.holder.issued')}</dt><dd>{issued}</dd></div>}
                </dl>
                <fieldset className="pp-holder-colors">
                  <legend>{t('passport.holder.cover')}</legend>
                  <div>
                    {COVER_COLORS.map((c) => (
                      <label key={c}>
                        <input type="radio" name={`${panel}-cover`} className="sr-only" checked={color === c} onChange={() => pick(c)} />
                        <span aria-hidden="true" className="pp-swatch" data-cover={c} />
                        <span className="sr-only">{t(`passport.color.${c}`)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p role="status" className="pp-holder-status" data-state={state}>
                  {state === 'saved' ? t('passport.holder.saved') : state === 'error' ? t('passport.holder.saveFail') : ''}
                </p>
              </>
            ) : (
              <div className="pp-holder-guest">
                <p>{t('passport.holder.guestNote')}</p>
                <Link to="/login">{t('passport.holder.signIn')}</Link>
              </div>
            )}
          </div>

          <div aria-hidden="true" onClick={() => { if (!open) toggle(); }} className="pp-leaf select-none">
            <div className="pp-cover">
              <span className="pp-glint" />
              <span className="pp-frame" />
              <p className="pp-foil pp-cover-top">Republic of Leyte</p>
              <svg viewBox="0 0 120 120" className="pp-emblem">
                <defs>
                  <linearGradient id="pp-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffc9a3" /><stop offset=".5" stopColor="#ff6a13" /><stop offset="1" stopColor="#b5470a" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="52" fill="none" stroke="url(#pp-gold)" strokeWidth="1.6" />
                <circle cx="60" cy="60" r="44" fill="none" stroke="url(#pp-gold)" strokeWidth=".8" strokeDasharray="1.5 3.5" />
                {Array.from({ length: 24 }, (_, i) => (
                  <line key={i} x1="60" y1="10" x2="60" y2={i % 6 === 0 ? 20 : 15} stroke="url(#pp-gold)" strokeWidth={i % 6 === 0 ? 1.6 : .8} transform={`rotate(${i * 15} 60 60)`} />
                ))}
                <path d="M60 22l8 38-8 38-8-38z" fill="url(#pp-gold)" />
                <path d="M22 60l38-8 38 8-38 8z" fill="url(#pp-gold)" opacity=".55" />
                <circle cx="60" cy="60" r="4" fill="#000000" stroke="url(#pp-gold)" strokeWidth="1" />
              </svg>
              <p className="pp-foil pp-cover-title">PASSPORT</p>
              <p className="pp-foil pp-cover-sub">SOULEY <em>de Tour</em></p>
              <div className="pp-cover-foot">
                {holder?.name && <p className="pp-foil pp-cover-holder">{holder.name}</p>}
                <p className="pp-foil pp-cover-no">N&deg; {no} / {String(total).padStart(3, '0')}</p>
              </div>
            </div>
            <div className="pp-leaf-back" />
          </div>
          <span aria-hidden="true" className="pp-ribbon" />
        </div>
      </div>
      <button ref={toggler} type="button" className="pp-open" aria-expanded={open} aria-controls={panel} onClick={toggle}>
        {open ? t('passport.close') : t('passport.open')}
      </button>
    </div>
  );
}
