export const SORTS = ['newest', 'popularity', 'rating', 'name'];
export const DIFFICULTIES = ['easy', 'moderate', 'hard'];

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const posNumber = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseSpotQuery(input) {
  const sp = input instanceof URLSearchParams ? input : new URLSearchParams(input);
  const q = {};
  const search = text(sp.get('search'));
  const municipality = text(sp.get('municipality'));
  const category = text(sp.get('category'));
  if (search) q.search = search;
  if (municipality) q.municipality = municipality;
  if (category) q.category = category;
  const difficulty = text(sp.get('difficulty'));
  if (DIFFICULTIES.includes(difficulty)) q.difficulty = difficulty;
  const minRating = posNumber(sp.get('minRating'));
  if (minRating !== undefined && minRating <= 5) q.minRating = minRating;
  const maxBudget = posNumber(sp.get('maxBudget'));
  if (maxBudget !== undefined) q.maxBudget = maxBudget;
  if (sp.get('featured') === 'true') q.featured = 'true';
  const sort = text(sp.get('sort'));
  if (SORTS.includes(sort)) q.sort = sort;
  const page = parseInt(sp.get('page'), 10);
  q.page = Number.isInteger(page) && page >= 1 ? page : 1;
  const limit = parseInt(sp.get('limit'), 10);
  if (Number.isInteger(limit) && limit >= 1) q.limit = Math.min(limit, 50);
  return q;
}

export function buildSearchParams(q = {}) {
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (k === 'page' && Number(v) <= 1) return;
    sp.set(k, String(v));
  });
  return sp;
}
