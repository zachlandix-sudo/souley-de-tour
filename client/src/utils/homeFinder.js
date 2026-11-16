import { buildSearchParams } from './query';

export const ENERGY = [
  { id: 'chill', label: 'Chill', difficulty: 'easy' },
  { id: 'active', label: 'Active', difficulty: 'moderate' },
  { id: 'bold', label: 'Adventurous', difficulty: 'hard' },
  { id: 'any', label: 'Surprise me' },
];

export const BUDGET = [
  { id: 'b500', label: 'Up to ₱500', maxBudget: 500 },
  { id: 'b1500', label: 'Up to ₱1,500', maxBudget: 1500 },
  { id: 'any', label: 'No limit' },
];

// Mood tiles are saved filters on /spots.
export const MOODS = [
  { id: 'waterfall', emoji: '💧', title: 'Chase a waterfall', blurb: 'Cool water at the end of a walk', query: { search: 'falls' }, tone: 'from-sea to-lagoon' },
  { id: 'beach', emoji: '🏖️', title: 'Slow beach day', blurb: 'Sand, shade, no schedule', query: { search: 'beach', difficulty: 'easy' }, tone: 'from-lagoon to-sea' },
  { id: 'cheap', emoji: '🪙', title: 'Cheap and cheerful', blurb: 'Good days for up to ₱500', query: { maxBudget: 500, sort: 'rating' }, tone: 'from-deep to-sea' },
  { id: 'rain', emoji: '🌧️', title: 'Rainy-day ideas', blurb: 'Caves and short stops', query: { search: 'cave' }, tone: 'from-deep to-lagoon' },
  { id: 'top', emoji: '⭐', title: 'Local favourites', blurb: 'The best rated by visitors', query: { minRating: 4.5, sort: 'rating' }, tone: 'from-sea to-deep' },
  { id: 'adventure', emoji: '🧗', title: 'Go on an adventure', blurb: 'Hard trails, big views', query: { difficulty: 'hard' }, tone: 'from-lagoon to-deep' },
];

const find = (list, id) => list.find((o) => o.id === id);

export const isComplete = (a) => !!a && !!find(ENERGY, a.energy) && !!find(BUDGET, a.budget);

// Answers -> the API query for the top matches, and the same filters for the full /spots page.
export function finderFilters({ energy, budget }) {
  const f = {};
  const e = find(ENERGY, energy);
  const b = find(BUDGET, budget);
  if (e?.difficulty) f.difficulty = e.difficulty;
  if (b?.maxBudget !== undefined) f.maxBudget = b.maxBudget;
  f.sort = 'rating';
  return f;
}
export const finderQuery = (a) => ({ ...finderFilters(a), limit: 3 });
export const finderLink = (a) => `/spots?${buildSearchParams(finderFilters(a)).toString()}`;
export const moodLink = (m) => `/spots?${buildSearchParams(m.query).toString()}`;
