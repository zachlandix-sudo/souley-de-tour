import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const KEY = 'souley-lang';
const I18nContext = createContext(null);

export function translate(lang, key, vars) {
  const raw = translations[lang]?.[key] ?? translations.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : raw;
}

function initialLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && translations[saved]) return saved;
  } catch { /* storage blocked */ }
  return 'en';
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang === 'ceb' ? 'ceb' : lang);
    // localStorage.setItem is synchronous disk I/O; INP (update 66): do it when the browser is idle, not inside the language change.
    const save = () => { try { localStorage.setItem(KEY, lang); } catch { /* ignore */ } };
    if (typeof window.requestIdleCallback === 'function') { const id = window.requestIdleCallback(save, { timeout: 2000 }); return () => window.cancelIdleCallback(id); }
    const id = setTimeout(save, 0); return () => clearTimeout(id);
  }, [lang]);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  // tx: translate an English string that lives in a data/util file (looked up as "x:<english>"; unknown text is returned unchanged).
  const tx = useCallback((text) => { const k = `x:${text}`; const r = translate(lang, k); return r === k ? text : r; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t, tx }), [lang, t, tx]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// Outside a provider (e.g. isolated component tests) it falls back to English.
export function useI18n() {
  return useContext(I18nContext) || { lang: 'en', setLang: () => {}, t: (k, v) => translate('en', k, v), tx: (x) => x };
}
