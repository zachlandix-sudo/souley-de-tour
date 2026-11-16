import { useEffect, useState } from 'react';
import { listCategories } from '../services/categoryService';
import { isCanceled } from '../services/api';

export function useCategories() {
  const [state, setState] = useState({ categories: [], loading: true, error: null });
  useEffect(() => {
    const ctrl = new AbortController();
    listCategories({}, ctrl.signal)
      .then((categories) => !ctrl.signal.aborted && setState({ categories, loading: false, error: null }))
      .catch((e) => {
        if (isCanceled(e) || ctrl.signal.aborted) return;
        setState({ categories: [], loading: false, error: e });
      });
    return () => ctrl.abort();
  }, []);
  return state;
}

export default useCategories;
