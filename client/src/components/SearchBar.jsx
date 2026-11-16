import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

// Controlled by `value` from outside; `onSubmit` fires on Enter/button, `onChange` on every keystroke (optional).
// `large` is the dark hero version.
export default function SearchBar({ value = '', onSubmit, onChange, placeholder, large = false }) {
  const { t } = useI18n();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(text.trim());
      }}
      className="flex w-full gap-2"
    >
      <label htmlFor={large ? 'hero-search' : 'spot-search'} className="sr-only">{t('search.label')}</label>
      <input
        id={large ? 'hero-search' : 'spot-search'}
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder={placeholder ?? t('search.placeholder')}
        className={large
          ? 'min-w-0 flex-1 rounded-sm border border-white/30 bg-transparent px-4 py-3 text-lg text-white placeholder:text-white/50 hover:border-white focus:border-orange'
          : 'field min-w-0 flex-1'}
      />
      <button type="submit" className={`btn btn-primary ${large ? 'px-7' : ''}`}>{t('search.btn')}</button>
    </form>
  );
}
