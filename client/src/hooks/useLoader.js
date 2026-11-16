import { useCallback, useEffect, useState } from 'react';

// Small loader for admin pages: runs fn(), ignores stale results, exposes reload().
export function useLoader(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    run()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState((s) => ({ ...s, loading: false, error })));
    return () => { live = false; };
  }, [run, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export default useLoader;
