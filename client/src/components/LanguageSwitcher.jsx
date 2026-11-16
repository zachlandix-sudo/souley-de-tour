import { LANGUAGES } from '../i18n/translations';
import { useI18n } from '../i18n/I18nContext';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('nav.language')}
      className="nav-lang cursor-pointer rounded-full border border-white/20 bg-transparent px-3 py-1.5 text-xs uppercase tracking-[.14em] text-white/75 transition-colors hover:border-orange hover:text-white">
      {LANGUAGES.map((l) => <option key={l.code} value={l.code} className="text-black">{l.label}</option>)}
    </select>
  );
}
