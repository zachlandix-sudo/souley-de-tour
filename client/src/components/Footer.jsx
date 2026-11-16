import { useI18n } from '../i18n/I18nContext';

export default function Footer() {
  const { t } = useI18n();
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <p className="font-display text-4xl tracking-[0.04em] text-white">SOULEY <span className="italic text-orange">de Tour</span></p>
        <p className="mt-3 max-w-md text-white/70">{t('footer.tagline')}</p>
      </div>
      <p className="text-sm text-white/50">{t('footer.map')}</p>
    </div>
  );
}
