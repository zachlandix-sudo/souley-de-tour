import { useEffect, useState } from 'react';
import { getSpot } from '../services/spotService';
import { isCanceled } from '../services/api';

export function useSpot(slug) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ spot: null, loading: true, error: null, notFound: false });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ spot: null, loading: true, error: null, notFound: false });
    getSpot(slug, ctrl.signal)
      .then((spot) => {
        if (!ctrl.signal.aborted) setState({ spot, loading: false, error: null, notFound: false });
      })
      .catch((e) => {
        if (isCanceled(e) || ctrl.signal.aborted) return;
        const status = e.response?.status;
        if (status === 404 || status === 400 || e instanceof URIError) setState({ spot: null, loading: false, error: null, notFound: true });
        else setState({ spot: null, loading: false, error: e, notFound: false });
      });
    return () => ctrl.abort();
  }, [slug, tick]);

  return { ...state, retry: () => setTick((t) => t + 1) };
}

export default useSpot;
