import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const BUDGETS = [1000, 3000, 5000, 10000];
export const MAX_DAYS = 50;
const QUICK_DAYS = [3, 7, 14, 30, 50];
const PACES = ['relaxed', 'balanced', 'packed'];
const Send = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>;

// The message box. Grows with the text (up to ~6 lines), Enter sends, Shift+Enter adds a line. In trip planner mode the
// days and budget controls slide open above it. The border draws a travelling light while you type or the guide is busy.
export default function Composer({ mode, value, onChange, onSend, busy, days, setDays, budget, setBudget, pace, setPace, startDate, setStartDate, autoFocus }) {
  const { t } = useI18n();
  const ta = useRef(null);
  const ok = value.trim().length >= 3;
  const trip = mode === 'itinerary';

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value]);
  useEffect(() => { if (autoFocus) ta.current?.focus(); }, [autoFocus]);

  const step = (d) => setDays(String(Math.min(MAX_DAYS, Math.max(1, (Number(days) || 2) + d))));
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (ok && !busy) onSend(); }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="ask-composer">
      <div className="ask-dock" data-busy={busy ? '1' : ''}>
        <div className="ask-opts" data-open={trip ? '1' : ''}>
          <div className="overflow-hidden">
            <div className="ask-opts-body space-y-3 px-4 pb-1 pt-4 text-sm text-white/75">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2"><span>{t('ask.days')}</span>
                  <span className="ask-stepper">
                    <button type="button" aria-label={t('ask.daysLess')} onClick={() => step(-1)}>−</button>
                    <input type="number" min="1" max={MAX_DAYS} value={days} onChange={(e) => setDays(e.target.value)} aria-label={t('ask.days')} />
                    <button type="button" aria-label={t('ask.daysMore')} onClick={() => step(1)}>+</button>
                  </span>
                </div>
                <span className="ask-chips flex flex-wrap gap-1.5">
                  {QUICK_DAYS.map((n) => (
                    <button key={n} type="button" aria-pressed={Number(days) === n} onClick={() => setDays(String(n))} className="ask-chip">{t('ask.nDays', { n })}</button>
                  ))}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2"><span>{t('ask.pace')}</span>
                  <span className="ask-seg" role="group" aria-label={t('ask.pace')}>
                    {PACES.map((p) => <button key={p} type="button" aria-pressed={pace === p} onClick={() => setPace(p)}>{t(`ask.pace.${p}`)}</button>)}
                  </span>
                </div>
                <label className="flex items-center gap-2">{t('ask.start')}
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ask-budget ask-date" />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2">{t('ask.budget')}
                  <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} className="ask-budget" />
                </label>
                <span className="ask-chips flex flex-wrap gap-1.5">
                  {BUDGETS.map((b) => (
                    <button key={b} type="button" aria-pressed={String(budget) === String(b)} onClick={() => setBudget(String(budget) === String(b) ? '' : String(b))} className="ask-chip">₱{b.toLocaleString('en-US')}</button>
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2 p-2.5 sm:gap-3 sm:p-3">
          <textarea ref={ta} rows={1} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} maxLength={1000} aria-label={t('ask.q')}
            placeholder={trip ? t('ask.phTrip') : t('ask.phRec')} className="ask-input" />
          <button type="submit" disabled={busy || !ok} className="ask-send">
            <span>{t('ask.btn')}</span><Send />
          </button>
        </div>
      </div>
      <p className="ask-hint">
        <span className="hidden sm:inline">{t('ask.hint')}</span>
        {value.length > 800 && <span className="ml-auto tabular-nums">{t('ask.chars', { n: value.length })}</span>}
      </p>
    </form>
  );
}
