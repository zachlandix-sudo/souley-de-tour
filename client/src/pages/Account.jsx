import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell, { inputCls } from './AuthForm';
import { errorMessage, fieldErrors } from '../utils/errors';
import { useI18n } from '../i18n/I18nContext';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Account() {
  const { t } = useI18n();
  const { user, changePassword, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setFields({}); setDone(false);
    if (v.newPassword.length < 8) return setFields({ newPassword: t('account.newErr') });
    if (v.newPassword !== v.confirmPassword) return setFields({ confirmPassword: t('auth.matchErr') });
    setSaving(true);
    try {
      await changePassword(v);
      setV(EMPTY);
      setDone(true);
    } catch (err) {
      setFields(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const everywhere = async () => {
    await logoutAll();
    navigate('/login');
  };

  const Field = ({ id, label, k, auto }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} type="password" autoComplete={auto} value={v[k]} onChange={set(k)} aria-invalid={!!fields[k]} className={inputCls} required />
      {fields[k] && <p role="alert" className="mt-1 text-sm text-danger">{fields[k]}</p>}
    </div>
  );

  return (
    <AuthShell title={t('account.title')}>
      <p className="text-sm text-muted">{user?.fullName} · {user?.email}</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <h2 className="text-3xl">{t('account.change')}</h2>
        {Field({ id: 'currentPassword', label: t('account.current'), k: 'currentPassword', auto: 'current-password' })}
        {Field({ id: 'newPassword', label: t('account.new'), k: 'newPassword', auto: 'new-password' })}
        {Field({ id: 'confirmPassword', label: t('account.confirmNew'), k: 'confirmPassword', auto: 'new-password' })}
        {error && !Object.keys(fields).length && <p role="alert" className="text-sm text-danger">{error}</p>}
        {done && <p role="status" className="text-sm text-positive">{t('account.done')}</p>}
        <button type="submit" disabled={saving} className="btn btn-dark">
          {saving ? t('account.saving') : t('account.change')}
        </button>
      </form>
      <div className="mt-12 border-t border-line pt-8">
        <h2 className="text-3xl">{t('account.sessions')}</h2>
        <p className="mt-1 text-sm opacity-80">{t('account.sessionsLead')}</p>
        <button type="button" onClick={everywhere} className="btn btn-danger mt-4">{t('account.logoutAll')}</button>
      </div>
    </AuthShell>
  );
}
