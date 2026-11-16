import { useEffect, useState } from 'react';
import { listSpots } from '../services/spotService';
import { isCanceled } from '../services/api';

const PAGE_SIZE = 50; // the API's maximum
const MAX_PAGES = 20; // safety stop

// Loads every page of a spot query, for screens that need the whole list (the map page).
export function useAllSpots(query = {}, { enabled = true } = {}) {
  const key = JSON.stringify(query);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ spots: [], loading: enabled, error: null });

  useEffect(() => {
    if (!enabled) {
      setState({ spots: [], loading: false, error: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      const all = [];
      let page = 1;
      let pages = 1;
      do {
        // eslint-disable-next-line no-await-in-loop
        const r = await listSpots({ ...JSON.parse(key), limit: PAGE_SIZE, page }, ctrl.signal);
        all.push(...r.data);
        pages = r.pagination?.pages || 1;
        page += 1;
      } while (page <= pages && page <= MAX_PAGES);
      if (!ctrl.signal.aborted) setState({ spots: all, loading: false, error: null });
    })().catch((e) => {
      if (isCanceled(e) || ctrl.signal.aborted) return;
      setState((s) => ({ ...s, loading: false, error: e }));
    });
    return () => ctrl.abort();
  }, [key, tick, enabled]);

  return { ...state, retry: () => setTick((t) => t + 1) };
}

export default useAllSpots;
