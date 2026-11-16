import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as account from '../services/passportService';
import { addStamp, clearStamps, loadStamps, persistStamps, removeStamp, stampsFromList, stampsToList } from '../utils/passport';

// The passport's stamps, wherever they live.
// - Guest: stamps live in this browser (localStorage).
// - Signed in: stamps live on the account. Stamps collected as a guest are moved up once after login, then the browser copy is cleared,
//   so the next person on a shared phone does not inherit them.
// - No signal while signed in: a new stamp stays on the page and waits in the browser copy; it goes up on the next sync
//   (the retry button, or the browser coming back online).
// sync: 'local' (guest) | 'syncing' | 'synced' | 'error' (account not reachable, stamps kept here)
export function usePassportStamps() {
  const { user, loading: authLoading } = useAuth();
  const uid = user ? String(user._id || user.id || 'me') : null;
  // owner says whose stamps `map` holds: 'guest' (saved in the browser) or the account id (saved on the server)
  const [store, setStore] = useState(() => ({ owner: 'guest', map: loadStamps() }));
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState('local');
  const [attempt, setAttempt] = useState(0);
  const ref = useRef(store);
  ref.current = store;

  useEffect(() => {
    if (authLoading) return undefined;
    if (!uid) {
      setStore({ owner: 'guest', map: loadStamps() });
      setSync('local');
      setReady(true);
      return undefined;
    }
    let live = true;
    setSync('syncing');
    const waiting = loadStamps(); // stamps collected as a guest, or while offline
    const hasWaiting = Object.keys(waiting).length > 0;
    (hasWaiting ? account.mergeStamps(stampsToList(waiting)) : account.listStamps())
      .then((list) => {
        if (!live) return;
        if (hasWaiting) clearStamps();
        setStore({ owner: uid, map: stampsFromList(list) });
        setSync('synced');
        setReady(true);
      })
      .catch(() => {
        if (!live) return;
        setStore({ owner: 'guest', map: waiting }); // keep working on this device, upload later
        setSync('error');
        setReady(true);
      });
    return () => { live = false; };
  }, [authLoading, uid, attempt]);

  // stamps held in the browser are written back; stamps owned by an account are not
  useEffect(() => { if (store.owner === 'guest') persistStamps(store.map); }, [store]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (sync !== 'error') return undefined;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [sync, retry]);

  // Both return true when it worked (or there was nothing to do) and false when the account refused it, so the page can say so.
  const add = useCallback(async (spot, method) => {
    const cur = ref.current;
    if (!spot || !spot._id || cur.map[spot._id]) return true;
    const at = new Date();
    const stamp = addStamp({}, spot, method, at)[spot._id];
    setStore((s) => ({ owner: s.owner, map: addStamp(s.map, spot, method, at) }));
    if (cur.owner === 'guest') return true;
    try {
      await account.addStamp(spot._id, { method: stamp.method, at: stamp.at });
      return true;
    } catch (err) {
      if (!err?.response) { // no signal: keep it, upload it next time
        persistStamps({ ...loadStamps(), [spot._id]: stamp });
        setSync('error');
        return true;
      }
      setStore((s) => (s.owner === cur.owner ? { owner: s.owner, map: removeStamp(s.map, spot._id) } : s));
      return false;
    }
  }, []);

  const remove = useCallback(async (id) => {
    const cur = ref.current;
    const was = cur.map[id];
    if (!was) return true;
    setStore((s) => ({ owner: s.owner, map: removeStamp(s.map, id) }));
    if (cur.owner === 'guest') return true;
    try {
      await account.removeStamp(id);
      const waiting = loadStamps();
      if (waiting[id]) persistStamps(removeStamp(waiting, id));
      return true;
    } catch {
      setStore((s) => (s.owner === cur.owner ? { owner: s.owner, map: { ...s.map, [id]: was } } : s));
      return false;
    }
  }, []);

  return { stamps: store.map, ready: authLoading ? false : ready, sync, add, remove, retry };
}
