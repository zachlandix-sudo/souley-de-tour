import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService';

export default function FavoriteButton({ spotId, className = 'btn btn-outline btn-sm' }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user || !spotId) return undefined;
    let live = true;
    listFavorites()
      .then((list) => live && setSaved(list.some((s) => String(s._id) === String(spotId))))
      .catch(() => {});
    return () => { live = false; };
  }, [user, spotId]);

  if (!user) return <Link to="/login" className={className}>Save to favorites</Link>;

  const toggle = async () => {
    setBusy(true);
    setFailed(false);
    try {
      if (saved) await removeFavorite(spotId); else await addFavorite(spotId);
      setSaved(!saved);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className={className}>
      {failed ? 'Try again' : saved ? '♥ Saved' : '♡ Save to favorites'}
    </button>
  );
}
