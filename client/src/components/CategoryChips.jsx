import { useI18n } from '../i18n/I18nContext';
import { categoryGlyph } from '../utils/categoryGlyph';
export default function CategoryChips({ categories = [], active = '', onSelect }) {
  const { t } = useI18n();
  const chip = (on) => `rounded-full border px-4 py-1.5 text-sm transition-colors ${on ? 'border-night bg-night text-white' : 'border-line bg-white text-ink hover:border-orange hover:text-ember'}`;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('chips.label')}>
      <button type="button" style={{ '--i': 0 }} aria-pressed={!active} className={chip(!active)} onClick={() => onSelect('')}>{t('chips.all')}</button>
      {categories.map((c, i) => (
        <button key={c._id || c.slug} type="button" style={{ '--i': i + 1 }} aria-pressed={active === c.slug} className={chip(active === c.slug)} onClick={() => onSelect(c.slug)}>
          {categoryGlyph(c.icon) ? <span className="grayscale">{categoryGlyph(c.icon)} </span> : null}{c.name}
        </button>
      ))}
    </div>
  );
}
