import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import CalmTitle from '../components/CalmTitle';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-28">
      <CalmTitle as="h1" className="text-5xl" text={t('notfound.title')} />
      <p className="mt-4 text-muted">{t('notfound.body')}</p>
      <Link to="/" className="btn btn-dark mt-8">{t('common.home')}</Link>
    </div>
  );
}
