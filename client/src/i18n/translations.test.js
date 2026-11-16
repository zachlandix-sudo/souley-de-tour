import { describe, it, expect } from 'vitest';
import { translations, LANGUAGES } from './translations';
import { translate } from './I18nContext';

const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');

describe('translations', () => {
  const enKeys = Object.keys(translations.en);

  it('every language has every English key', () => {
    for (const { code } of LANGUAGES) {
      const missing = enKeys.filter((k) => !(k in translations[code]));
      expect(missing, `${code} is missing keys`).toEqual([]);
    }
  });

  it('keeps {placeholders} identical across languages', () => {
    for (const code of ['fil', 'ceb']) {
      for (const k of enKeys) expect(placeholders(translations[code][k]), `${code}:${k}`).toBe(placeholders(translations.en[k]));
    }
  });

  it('translate() fills variables and falls back to English, then to the key', () => {
    expect(translate('en', 'common.page', { p: 2, n: 5 })).toBe('Page 2 of 5');
    expect(translate('ceb', 'common.page', { p: 2, n: 5 })).toBe('Panid 2 sa 5');
    expect(translate('fil', 'no.such.key')).toBe('no.such.key');
  });

  it('x: keys exist in fil and ceb for the data/util strings', () => {
    const x = Object.keys(translations.fil).filter((k) => k.startsWith('x:'));
    expect(x.length).toBeGreaterThan(30);
    for (const k of x) expect(translations.ceb[k], k).toBeTruthy();
  });
});
