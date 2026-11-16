import { useEffect, useState } from 'react';
import { listSpots } from '../services/spotService';
import { isCanceled } from '../services/api';

export function useSpots(query) {
  const key = JSON.stringify(query);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ spots: [], pagination: null, loading: true, error: null });

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    listSpots(JSON.parse(key), ctrl.signal)
      .then((r) => {
        if (ctrl.signal.aborted) return;
        setState({ spots: r.data, pagination: r.pagination, loading: false, error: null });
      })
      .catch((e) => {
        if (isCanceled(e) || ctrl.signal.aborted) return;
        setState((s) => ({ ...s, loading: false, error: e }));
      });
    return () => ctrl.abort();
  }, [key, tick]);

  return { ...state, retry: () => setTick((t) => t + 1) };
}

export default useSpots;
