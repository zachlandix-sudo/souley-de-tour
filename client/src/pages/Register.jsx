import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Banner from '../components/Banner';
import Field from '../components/auth/Field';
import StrengthMeter from '../components/auth/StrengthMeter';
import AuthShell, { AuthLink } from './AuthForm';
import { errorMessage, fieldErrors } from '../utils/errors';
import { isEmail } from '../utils/passwordStrength';
import { useI18n } from '../i18n/I18nContext';

export default function Register() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errs, setErrs] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setV((s) => ({ ...s, [k]: e.target.value })); setErrs((s) => ({ ...s, [k]: '' })); };

  function validate() {
    const p = {};
    if (v.fullName.trim().length < 2) p.fullName = t('auth.nameErr');
    if (!isEmail(v.email)) p.email = t('auth.emailErr');
    if (v.password.length < 8) p.password = t('auth.passErr');
    if (v.password !== v.confirmPassword) p.confirmPassword = t('auth.matchErr');
    return p;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const problems = validate();
    setErrs(problems);
    setBanner('');
    if (Object.keys(problems).length) return;
    setBusy(true);
    try {
      await register({ ...v, fullName: v.fullName.trim(), email: v.email.trim() });
      navigate('/', { replace: true });
    } catch (err) {
      const fromServer = fieldErrors(err);
      if (err.response?.status === 409) fromServer.email = t('auth.taken');
      setErrs(fromServer);
      if (!Object.keys(fromServer).length) setBanner(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow={t('auth.join')} title={t('auth.create')} lead={t('auth.registerLead')}
      footer={<>{t('auth.already')} <AuthLink to="/login">{t('auth.loginTitle')}</AuthLink></>}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label={t('auth.fullName')} autoComplete="name" autoFocus required value={v.fullName} onChange={set('fullName')} error={errs.fullName} />
        <Field label={t('auth.email')} type="email" autoComplete="email" required value={v.email} onChange={set('email')} error={errs.email} />
        <Field label={t('auth.password')} type="password" autoComplete="new-password" required value={v.password} onChange={set('password')}
          error={errs.password} hint={t('auth.passHint')}>
          <StrengthMeter password={v.password} />
        </Field>
        <Field label={t('auth.confirm')} type="password" autoComplete="new-password" required value={v.confirmPassword} onChange={set('confirmPassword')} error={errs.confirmPassword} />
        <Banner>{banner}</Banner>
        <button type="submit" disabled={busy} className="btn btn-dark w-full py-3">
          {busy ? t('auth.creating') : t('auth.create')}
        </button>
      </form>
    </AuthShell>
  );
}
