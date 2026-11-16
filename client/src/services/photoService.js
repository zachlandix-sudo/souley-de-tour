import api from './api';

// One real photo for a few words, found by the server (GET /api/photos?q=...). Answers are remembered for this visit,
// so a card that re-renders never asks twice. Resolves to { url, credit, creditUrl, source } or null; never rejects.
const seen = new Map();

export function findPhoto(query, signal) {
  const q = String(query || '').trim();
  if (q.length < 2) return Promise.resolve(null);
  if (!seen.has(q)) {
    const job = api.get('/photos', { params: { q }, signal })
      .then(({ data }) => data?.data || null)
      .catch(() => { seen.delete(q); return null; }); // a failed or cancelled try may be repeated later
    seen.set(q, job);
  }
  return seen.get(q);
}
