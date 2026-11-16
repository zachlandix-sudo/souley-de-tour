import { passwordStrength, isEmail } from './passwordStrength';

describe('passwordStrength', () => {
  it('is empty for no input', () => expect(passwordStrength('')).toEqual({ score: 0, label: '' }));
  it('flags short passwords as weak', () => expect(passwordStrength('abc').score).toBe(1));
  it('flags common passwords', () => expect(passwordStrength('password1').label).toBe('Too common'));
  it('rewards length, case, digits and symbols', () => {
    expect(passwordStrength('Sogod-Bay-2026!').score).toBe(4);
    expect(passwordStrength('sogodbayleyte').score).toBeLessThan(4);
  });
});

describe('isEmail', () => {
  it('accepts normal addresses', () => expect(isEmail(' a@b.co ')).toBe(true));
  it('rejects broken ones', () => { expect(isEmail('a@b')).toBe(false); expect(isEmail('nope')).toBe(false); });
});
