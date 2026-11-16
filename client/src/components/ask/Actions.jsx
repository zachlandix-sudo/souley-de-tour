import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createTrip } from '../../services/itineraryService';
import { tripFromAi } from '../../utils/tripText';
import { useI18n } from '../../i18n/I18nContext';

export function SaveTrip({ question, days }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState('idle'); // idle | saving | saved | error
  if (!user) return <p className="text-sm text-white/60"><Link className="text-[#ff6a13] underline" to="/login">{t('ask.loginLink')}</Link> {t('ask.loginSuffix')}</p>;
  const save = async () => {
    setState('saving');
    try { await createTrip(tripFromAi(question, days)); setState('saved'); } catch { setState('error'); }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === 'saved'
        ? <p role="status" className="text-sm text-[#7be0a8]">{t('ask.saved')} <Link className="underline" to="/trips">{t('ask.viewTrips')}</Link></p>
        : <button type="button" onClick={save} disabled={state === 'saving'} className="btn btn-primary btn-sm">{state === 'saving' ? t('ask.saving') : t('ask.save')}</button>}
      {state === 'error' && <p role="alert" className="text-sm text-danger-light">{t('ask.saveErr')}</p>}
    </div>
  );
}

export function CopyButton({ text }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); clearTimeout(timer.current); timer.current = setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked: nothing to do */ }
  };
  return <button type="button" onClick={copy} className="ask-ghost">{done ? t('ask.copied') : t('ask.copy')}</button>;
}
