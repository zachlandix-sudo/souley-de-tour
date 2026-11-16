import { BUDGET, ENERGY, MOODS, finderFilters, finderLink, finderQuery, isComplete, moodLink } from './homeFinder';
import { dayHint } from './conditions';

describe('guided finder', () => {
  it('needs both answers', () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete({ energy: 'chill' })).toBe(false);
    expect(isComplete({ energy: 'chill', budget: 'any' })).toBe(true);
    expect(isComplete({ energy: 'nope', budget: 'any' })).toBe(false);
  });
  it('maps answers to API filters', () => {
    expect(finderFilters({ energy: 'chill', budget: 'b500' })).toEqual({ difficulty: 'easy', maxBudget: 500, sort: 'rating' });
    expect(finderFilters({ energy: 'any', budget: 'any' })).toEqual({ sort: 'rating' });
    expect(finderQuery({ energy: 'bold', budget: 'b1500' })).toEqual({ difficulty: 'hard', maxBudget: 1500, sort: 'rating', limit: 3 });
  });
  it('builds the see-all link', () => {
    expect(finderLink({ energy: 'chill', budget: 'b500' })).toBe('/spots?difficulty=easy&maxBudget=500&sort=rating');
    expect(finderLink({ energy: 'any', budget: 'any' })).toBe('/spots?sort=rating');
  });
  it('mood links use only filters /spots understands', () => {
    expect(MOODS.length).toBeGreaterThanOrEqual(6);
    expect(moodLink(MOODS.find((m) => m.id === 'beach'))).toBe('/spots?search=beach&difficulty=easy');
    expect(moodLink(MOODS.find((m) => m.id === 'cheap'))).toBe('/spots?maxBudget=500&sort=rating');
    expect(new Set(MOODS.map((m) => m.id)).size).toBe(MOODS.length);
    expect(ENERGY.length).toBe(4);
    expect(BUDGET.length).toBe(3);
  });
});

describe('dayHint', () => {
  it('no data gives null', () => expect(dayHint({})).toBeNull());
  it('calm and clear is good', () => expect(dayHint({ code: 0, wave: 0.4, wind: 10 })).toMatchObject({ tone: 'good' }));
  it('storms and rough seas warn', () => {
    expect(dayHint({ code: 95 }).tone).toBe('warn');
    expect(dayHint({ code: 1, wave: 3 }).tone).toBe('warn');
    expect(dayHint({ code: 1, wind: 45 }).tone).toBe('warn');
  });
  it('rain is neutral, and missing wave data still works', () => {
    expect(dayHint({ code: 61, wave: 0.3 }).tone).toBe('neutral');
    expect(dayHint({ code: 0, wind: 8 }).tone).toBe('good');
  });
});
