import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService';

// One favourites lookup for the whole Food page (FavoriteButton asks once per button, which is too many for a grid of cards).
// `saved(id)` says whether a place is saved; `toggle(id)` saves or unsaves it right away and puts it back if the server says no.
export function useFavoriteIds() {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [failedId, setFailedId] = useState(null);

  const uid = user ? user._id || user.id || 'me' : null; // depend on who is signed in, not on the object, so a new user object never re-runs the lookup
  useEffect(() => {
    if (!uid) { setIds(new Set()); return undefined; }
    let live = true;
    listFavorites()
      .then((list) => live && setIds(new Set(list.map((s) => String(s._id)))))
      .catch(() => {});
    return () => { live = false; };
  }, [uid]);

  const saved = useCallback((id) => ids.has(String(id)), [ids]);

  const toggle = useCallback(async (id) => {
    const key = String(id);
    const was = ids.has(key);
    setFailedId(null);
    setIds((s) => { const n = new Set(s); if (was) n.delete(key); else n.add(key); return n; });
    try {
      if (was) await removeFavorite(id); else await addFavorite(id);
    } catch {
      setIds((s) => { const n = new Set(s); if (was) n.add(key); else n.delete(key); return n; });
      setFailedId(key);
    }
  }, [ids]);

  return { user, saved, toggle, failedId };
}
