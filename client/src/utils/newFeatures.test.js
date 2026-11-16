import { isFoodSpot } from './geo';
import { fitSize } from './imageCompress';
import { translate } from '../i18n/I18nContext';
import { translations, LANGUAGES } from '../i18n/translations';

describe('isFoodSpot', () => {
  it('detects the food category', () => {
    expect(isFoodSpot({ categoryIds: [{ slug: 'beach' }, { slug: 'food' }] })).toBe(true);
    expect(isFoodSpot({ categoryIds: [{ slug: 'beach' }] })).toBe(false);
    expect(isFoodSpot({})).toBe(false);
  });
});

describe('fitSize', () => {
  it('scales the long side down and never up', () => {
    expect(fitSize(1800, 900, 900)).toEqual({ width: 900, height: 450 });
    expect(fitSize(400, 300, 900)).toEqual({ width: 400, height: 300 });
  });
});

describe('translate', () => {
  it('fills variables and falls back to English, then to the key', () => {
    expect(translate('en', 'food.count', { n: 5 })).toBe('5 places');
    expect(translate('ceb', 'food.count', { n: 5 })).toBe('5 ka lugar');
    expect(translate('fil', 'does.not.exist')).toBe('does.not.exist');
  });
  it('every language has every English key', () => {
    LANGUAGES.forEach(({ code }) => {
      Object.keys(translations.en).forEach((k) => expect(translations[code][k], `${code}:${k}`).toBeTruthy());
    });
  });
});
