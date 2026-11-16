import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Banner from '../components/Banner';
import Field from '../components/auth/Field';
import AuthShell, { AuthLink } from './AuthForm';
import { errorMessage } from '../utils/errors';
import { isEmail } from '../utils/passwordStrength';
import { postLoginPath } from '../utils/authRedirect';
import { useI18n } from '../i18n/I18nContext';

export default function Login() {
  const { t } = useI18n();
  const { login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErr, setFieldErr] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);
  const emailRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const problems = {};
    if (!email.trim()) problems.email = t('auth.enterEmail');
    else if (!isEmail(email)) problems.email = t('auth.emailIncomplete');
    if (!password) problems.password = t('auth.enterPassword');
    setFieldErr(problems);
    if (problems.email || problems.password) return (problems.email ? emailRef : passwordRef).current?.focus();

    setBusy(true);
    setError('');
    try {
      const u = await login(email.trim(), password);
      navigate(postLoginPath(u, location), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      if (err.response?.status === 401) { setPassword(''); passwordRef.current?.focus(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow={t('auth.welcome')} title={t('auth.loginTitle')} lead={t('auth.loginLead')}
      footer={<>{t('auth.newHere')} <AuthLink to="/register">{t('auth.create')}</AuthLink></>}>
      {sessionExpired && <Banner>{t('auth.expired')}</Banner>}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label={t('auth.email')} type="email" inputRef={emailRef} autoComplete="email" autoFocus required value={email} error={fieldErr.email}
          onChange={(e) => { setEmail(e.target.value); setFieldErr((s) => ({ ...s, email: '' })); }} />
        <Field label={t('auth.password')} type="password" inputRef={passwordRef} autoComplete="current-password" required value={password} error={fieldErr.password}
          onChange={(e) => { setPassword(e.target.value); setFieldErr((s) => ({ ...s, password: '' })); }} />
        <Banner>{error}</Banner>
        <button type="submit" disabled={busy} className="btn btn-dark w-full py-3">
          {busy ? t('auth.loggingIn') : t('auth.loginTitle')}
        </button>
      </form>
    </AuthShell>
  );
}
