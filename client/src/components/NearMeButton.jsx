const MESSAGES = {
  denied: 'Location is blocked. Allow it in your browser settings to sort by distance.',
  unsupported: 'Your browser cannot share its location.',
  error: 'Could not get your location. Please try again.',
};

import { useI18n } from '../i18n/I18nContext';

// Toggle for "sort by distance from me". `nearMe` is the object returned by useNearMe.
export default function NearMeButton({ nearMe }) {
  const { status, active, enable, disable } = nearMe;
  const { t } = useI18n();
  return (
    <div className="flex flex-col">
      <button type="button" aria-pressed={active} disabled={status === 'locating'} onClick={active ? disable : enable}
        className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline'}`}>
        {status === 'locating' ? t('near.locating') : active ? t('near.on') : t('near.off')}
      </button>
      {MESSAGES[status] && <p role="alert" className="mt-1 max-w-xs text-xs text-danger">{MESSAGES[status]}</p>}
    </div>
  );
}
