import { useCallback, useEffect, useState } from 'react';
import { parseDuration, DEFAULT_MINUTES } from '../utils/timeline';

const KEY = 'souley.tripCanvas.v1';
const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((s) => s && s.id && s.name) : [];
  } catch {
    return [];
  }
};

export const toSnapshot = (spot) => ({
  id: spot._id,
  slug: spot.slug,
  name: spot.name,
  municipality: spot.municipality,
  image: spot.images?.[0] || '',
  minutes: parseDuration(spot.recommendedDuration) ?? DEFAULT_MINUTES,
});

export function useTripCanvas() {
  const [stops, setStops] = useState(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(stops)); } catch { /* storage unavailable: keep in memory */ }
  }, [stops]);

  const has = useCallback((id) => stops.some((s) => s.id === id), [stops]);
  const toggle = useCallback((spot) => setStops((l) => (l.some((s) => s.id === spot._id) ? l.filter((s) => s.id !== spot._id) : [...l, toSnapshot(spot)])), []);
  const remove = useCallback((id) => setStops((l) => l.filter((s) => s.id !== id)), []);
  const move = useCallback((from, to) => setStops((l) => {
    if (from === to || from < 0 || to < 0 || from >= l.length || to >= l.length) return l;
    const next = [...l];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }), []);
  const setMinutes = useCallback((id, minutes) => setStops((l) => l.map((s) => (s.id === id ? { ...s, minutes } : s))), []);
  const clear = useCallback(() => setStops([]), []);
  return { stops, has, toggle, remove, move, setMinutes, clear };
}
