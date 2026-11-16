import { Link } from 'react-router-dom';

// The ♡ on a food card and in the quick view. `fav` comes from useFavoriteIds (one lookup for the whole page).
// Signed-out visitors get a link to the login page instead of a button, same as the Save button on a spot page.
export default function SaveHeart({ spot, fav, withLabel = false, className = '' }) {
  const isSaved = fav.saved(spot._id);
  const failed = fav.failedId === String(spot._id);
  const label = fav.user ? (isSaved ? `Remove ${spot.name} from favorites` : `Save ${spot.name} to favorites`) : `Sign in to save ${spot.name}`;
  const text = failed ? 'Try again' : isSaved ? 'Saved' : 'Save';
  const inner = (
    <>
      <span aria-hidden="true" className="fheart-icon">{isSaved ? '♥' : '♡'}</span>
      {withLabel && <span>{text}</span>}
    </>
  );
  const cls = `fheart ${isSaved ? 'is-saved' : ''} ${withLabel ? 'has-label' : ''} ${className}`;
  if (!fav.user) return <Link to="/login" aria-label={label} className={cls}>{inner}</Link>;
  return <button type="button" aria-label={label} aria-pressed={isSaved} onClick={() => fav.toggle(spot._id)} className={cls}>{inner}</button>;
}
