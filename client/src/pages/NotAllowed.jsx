import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export default function NotAllowed() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-28">
      <h1 className="text-5xl">{t('notallowed.title')}</h1>
      <p className="mt-4 text-muted">{t('notallowed.body')}</p>
      <Link to="/" className="btn btn-dark mt-8">{t('common.home')}</Link>
    </div>
  );
}
