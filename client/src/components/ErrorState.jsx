import { useI18n } from '../i18n/I18nContext';
export default function ErrorState({ message, onRetry }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="border-l-4 border-danger bg-danger/5 p-6">
      <p className="font-semibold text-danger">{message ?? t('err.default')}</p>
      <button type="button" onClick={onRetry} className="btn btn-dark mt-4">{t('common.retry')}</button>
    </div>
  );
}
