import { Link } from 'react-router-dom';
import Rating from './Rating';
import SpotImage from './SpotImage';
import { formatCoord, formatKm } from '../utils/geo';

export default function SpotRow({ spot, highlighted = false, selected = false, onHover, onSelect, rowId, index = 0 }) {
  const coord = formatCoord(spot);
  return (
    <article
      id={rowId}
      onMouseEnter={() => onHover?.(spot._id)}
      onMouseLeave={() => onHover?.(null)}
      style={{ '--n': Math.min(index, 8) }}
      className={`gal-in group relative border-b border-line py-5 pl-4 pr-2 transition-colors ${highlighted || selected ? 'bg-paper' : 'bg-white'}`}
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 transition-colors ${highlighted || selected ? 'bg-orange' : 'bg-transparent'}`} />
      <div className="flex gap-5">
      <Link to={`/spots/${spot.slug}`} tabIndex={-1} aria-hidden="true" className="relative block h-32 w-40 shrink-0 overflow-hidden bg-graphite sm:h-36 sm:w-52">
        <SpotImage src={spot.images?.[0]} fallbacks={spot.images?.slice(1)} slug={spot.slug} alt={spot.name} className="h-full w-full transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07]" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[.7rem] font-semibold uppercase tracking-[.2em] text-ember">{spot.municipality}{spot.distanceKm != null && <span className="text-ink"> · {formatKm(spot.distanceKm)}</span>}</p>
        <h3 className="mt-1 font-display text-2xl leading-tight text-ink">
          <Link to={`/spots/${spot.slug}`} className="transition-colors hover:text-ember">{spot.name}</Link>
        </h3>
        <div className="mt-1.5"><Rating value={spot.averageRating} count={spot.reviewCount} /></div>
        {spot.shortDescription && <p className="mt-2 line-clamp-2 text-sm text-muted">{spot.shortDescription}</p>}
      </div>
      </div>
      {coord ? (
        <button type="button" aria-pressed={selected} onClick={() => onSelect?.(spot._id)} aria-label={`Show ${spot.name} on the map`}
          className={`mt-3 flex w-full flex-wrap items-center gap-x-6 gap-y-1 border border-l-4 px-4 py-2.5 text-left transition-colors ${selected ? 'border-line border-l-orange bg-white' : 'border-line border-l-line bg-white hover:border-l-orange'}`}>
          <span className="text-[.65rem] font-semibold uppercase tracking-[.2em] text-ember">Coordinates</span>
          <span className="font-mono text-xs text-ink">Lat {coord.lat}</span>
          <span className="font-mono text-xs text-ink">Lng {coord.lng}</span>
        </button>
      ) : (
        <p className="mt-3 border border-dashed border-line px-4 py-2.5 text-xs text-muted">No coordinates yet</p>
      )}
    </article>
  );
}
