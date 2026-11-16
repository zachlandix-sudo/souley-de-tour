import { useI18n } from '../../i18n/I18nContext';

// The bar above the journey: All / Places / Food, a town picker and a search box. Counts come from the whole list, not just what is shown.
export default function JourneyFilters({ kind, onKind, town, onTown, q, onQ, towns, counts, shown, total, loadingAll, failed, onRetry }) {
  const { t } = useI18n();
  const tabs = [['all', t('exp.all'), counts.all], ['places', t('exp.places'), counts.places], ['food', t('exp.food'), counts.food]];
  return (
    <div className="xp-filters" role="search" aria-label={t('exp.filters')}>
      <div className="xp-tabs" role="group" aria-label={t('exp.kind')}>
        {tabs.map(([k, label, n]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => onKind(k)} className="xp-tab">
            {label}<b>{n}</b>
          </button>
        ))}
      </div>
      <label className="xp-field">
        <span className="sr-only">{t('exp.town')}</span>
        <select value={town} onChange={(e) => onTown(e.target.value)}>
          <option value="">{t('exp.allTowns')}</option>
          {towns.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <label className="xp-field xp-field-q">
        <span className="sr-only">{t('exp.search')}</span>
        <input type="search" value={q} onChange={(e) => onQ(e.target.value)} placeholder={t('exp.search')} />
      </label>
      <p className="xp-count" aria-live="polite">
        {loadingAll ? t('exp.loadingAll') : t('exp.count', { n: shown, m: total })}
        {failed && <> <button type="button" onClick={onRetry} className="xp-link">{t('exp.retry')}</button></>}
      </p>
    </div>
  );
}
