import Rating from '../Rating';
import SpotImage from '../SpotImage';
import SaveHeart from './SaveHeart';
import { directionsUrl, typeLabel, visitorBlurb } from '../../utils/food';
import { formatKm } from '../../utils/geo';

// One place in the magazine grid. The big button opens the quick view; Save and Directions sit beside it
// (never inside it, so each stays a real control for keyboards and screen readers).
// `feature` makes it the large 2 x 2 cell with the "Chef's pick" mark and a line of text.
// `tried` shows the "Ate here" stamp; `trip` (the food-trip list) adds a small button to put the place on the trip.
export default function FoodCard({ spot, index = 0, feature = false, active = false, fav, onOpen, tried = false, trip = null }) {
  const kind = typeLabel(spot);
  const blurb = feature ? visitorBlurb(spot) : '';
  return (
    <article
      id={`food-card-${spot._id}`}
      style={{ '--n': Math.min(index, 14) }}
      className={`fcard fcard-in group ${feature ? 'is-feature' : ''} ${active ? 'is-active' : ''}`}
    >
      <button type="button" onClick={() => onOpen(spot)} aria-label={`Quick view: ${spot.name}`} className="fcard-open">
        <SpotImage src={spot.images?.[0]} fallbacks={spot.images?.slice(1)} slug={spot.slug} alt="" className="fcard-photo" />
        <span aria-hidden="true" className="fcard-shade" />
        <span aria-hidden="true" className="lux-sheen" />
        <span className="fcard-text">
          {feature && <span className="fcard-pick">Chef&apos;s pick</span>}
          <span className="fcard-name">{spot.name}</span>
          <span className="fcard-meta">
            <span>{spot.municipality}{spot.distanceKm != null && <b> · {formatKm(spot.distanceKm)}</b>}</span>
            {spot.reviewCount > 0 && <span className="fcard-rate"><Rating value={spot.averageRating} count={spot.reviewCount} /></span>}
          </span>
          {blurb && <span className="fcard-blurb">{blurb}</span>}
        </span>
      </button>
      {kind && <span className="fcard-type">{kind}</span>}
      {tried && <span className="fcard-ate"><span aria-hidden="true">✓</span> Ate here</span>}
      <SaveHeart spot={spot} fav={fav} className="fcard-save" />
      {trip && (
        <button
          type="button"
          className={`fcard-trip ${trip.has(spot.slug) ? 'is-on' : ''}`}
          aria-pressed={trip.has(spot.slug)}
          disabled={!trip.has(spot.slug) && trip.full}
          aria-label={trip.has(spot.slug) ? `Remove ${spot.name} from your food trip` : `Add ${spot.name} to your food trip`}
          title={trip.has(spot.slug) ? 'On your food trip' : trip.full ? 'Your food trip is full' : 'Add to your food trip'}
          onClick={() => trip.toggle(spot.slug)}
        >
          <span aria-hidden="true">{trip.has(spot.slug) ? '✓' : '+'}</span>
        </button>
      )}
      <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="fcard-go" aria-label={`Directions to ${spot.name} (opens Google Maps)`}>
        Directions <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
