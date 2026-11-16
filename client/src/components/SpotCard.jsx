import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Rating from './Rating';
import SpotImage from './SpotImage';
import PhotoReveal from './PhotoReveal';
import { formatKm } from '../utils/geo';

export default function SpotCard({ spot }) {
  const photo = useRef(null);
  // On a normal click, tag this card's photo so the browser can morph it into the spot page's hero photo.
  const tag = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !photo.current) return;
    photo.current.style.viewTransitionName = 'spot-photo';
    setTimeout(() => { if (photo.current) photo.current.style.viewTransitionName = ''; }, 1200);
  };
  return (
    <Link to={`/spots/${spot.slug}`} viewTransition state={{ vt: true }} onClick={tag} className="group block">
      <div ref={photo} className="relative overflow-hidden bg-graphite">
        <PhotoReveal seed={spot.slug || spot.name}>
          <SpotImage src={spot.images?.[0]} fallbacks={spot.images?.slice(1)} slug={spot.slug} alt={spot.name} className="aspect-[4/5] w-full transition-transform duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.07]" />
        </PhotoReveal>
        <span aria-hidden="true" className="lux-sheen" />
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-2xl leading-tight text-ink transition-colors group-hover:text-ember">{spot.name}</h3>
          <p className="mt-1 text-sm text-muted">{spot.municipality}{spot.distanceKm != null && <span className="font-medium text-ink"> · {formatKm(spot.distanceKm)}</span>}</p>
        </div>
        <div className="shrink-0 pt-1"><Rating value={spot.averageRating} count={spot.reviewCount} /></div>
      </div>
      {spot.shortDescription && <p className="mt-3 line-clamp-2 text-sm text-muted">{spot.shortDescription}</p>}
      <span aria-hidden="true" className="mt-4 block h-px bg-line"><span className="block h-px w-0 bg-orange transition-all duration-500 group-hover:w-full" /></span>
    </Link>
  );
}
