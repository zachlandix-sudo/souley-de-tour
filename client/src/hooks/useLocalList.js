import { useCallback, useEffect, useRef, useState } from 'react';
import { readList, writeList } from '../utils/fun';

const EVENT = 'souley:list-changed';

// A list kept on this device (localStorage) that stays in step across every component using the same key, and across tabs.
// Used by the food log ("I ate here") and the food trip. `toggle(x)` adds or removes; adding is ignored once `max` is reached.
export function useLocalList(key, { max = Infinity } = {}) {
  const [list, setListState] = useState(() => readList(key));
  const latest = useRef(list); // the newest list, so two quick taps in a row never work from a stale one
  const me = useRef(Symbol('list')); // so a component ignores its own change events

  const setList = useCallback((next) => { latest.current = next; setListState(next); }, []);

  useEffect(() => {
    const onEvent = (e) => { if (e.detail?.key === key && e.detail.from !== me.current) setList(readList(key)); };
    const onStorage = (e) => { if (e.key === key) setList(readList(key)); };
    window.addEventListener(EVENT, onEvent);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(EVENT, onEvent); window.removeEventListener('storage', onStorage); };
  }, [key, setList]);

  const commit = useCallback((next) => {
    writeList(key, next);
    setList(next);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, from: me.current } }));
  }, [key, setList]);

  const toggle = useCallback((item) => {
    const cur = latest.current;
    if (cur.includes(item)) commit(cur.filter((x) => x !== item));
    else if (cur.length < max) commit([...cur, item]);
  }, [commit, max]);

  const remove = useCallback((item) => commit(latest.current.filter((x) => x !== item)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);
  const has = useCallback((item) => list.includes(item), [list]);

  return { list, has, toggle, remove, clear, set: commit, full: list.length >= max };
}

export default useLocalList;
