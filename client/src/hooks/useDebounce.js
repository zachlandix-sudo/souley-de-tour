import { useEffect, useRef, useState } from 'react';

export function useDebounce(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Event-driven debounce: avoids effect loops when the value also lives in the URL.
export function useDebouncedCallback(fn, ms = 400) {
  const timer = useRef(null);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => () => clearTimeout(timer.current), []);
  const call = (...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(...args), ms);
  };
  call.cancel = () => clearTimeout(timer.current);
  return call;
}

export default useDebounce;
