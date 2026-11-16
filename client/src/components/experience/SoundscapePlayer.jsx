import { useI18n } from '../../i18n/I18nContext';

export default function SoundscapePlayer({ sound, card }) {
  const { t } = useI18n();
  return (
    <section aria-label={t('sound.title')} className={`xp-cell ${card || ''}`}>
      <h3 className="xp-cell-title">{t('sound.title')}</h3>
      {!sound.supported ? (
        <p className="xp-note">{t('sound.unsupported')}</p>
      ) : (
        <div className="xp-sound">
          <span className="xp-eq" data-on={sound.playing} aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <p>{t('sound.ambient')}</p>
          <button type="button" onClick={sound.toggle} aria-pressed={sound.playing} className="btn btn-primary btn-sm">
            {sound.playing ? t('sound.pause') : t('sound.play')}
          </button>
        </div>
      )}
    </section>
  );
}
