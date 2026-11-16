import { categoryGlyph, isEmoji } from './categoryGlyph.js';

describe('categoryGlyph', () => {
  it('keeps an emoji', () => { expect(categoryGlyph('🏝️')).toBe('🏝️'); expect(isEmoji('💧')).toBe(true); });
  it('drops icon names such as the seed data uses', () => {
    for (const n of ['leaf', 'waves', 'map-pin', 'landmark', 'utensils', 'masks']) expect(categoryGlyph(n)).toBe('');
  });
  it('drops empty and missing values', () => { expect(categoryGlyph('')).toBe(''); expect(categoryGlyph(undefined)).toBe(''); });
});
