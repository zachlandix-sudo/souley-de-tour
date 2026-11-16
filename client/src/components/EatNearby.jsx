import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SpotCard from './SpotCard';
import { useAllSpots } from '../hooks/useAllSpots';
import { sortByDistance, toLatLng } from '../utils/geo';

const FOOD_QUERY = { category: 'food' };
const MAX_KM = 25;

// Nearest food places to a spot. Renders nothing while loading, on error, or when nothing is close enough.
export default function EatNearby({ spot, limit = 3 }) {
  const origin = toLatLng(spot);
  const { spots, loading, error } = useAllSpots(FOOD_QUERY, { enabled: !!origin });
  const near = useMemo(
    () => (origin ? sortByDistance(spots.filter((s) => s._id !== spot._id), origin).filter((s) => s.distanceKm != null && s.distanceKm <= MAX_KM).slice(0, limit) : []),
    [spots, origin, spot._id, limit]
  );
  if (!origin || loading || error || near.length === 0) return null;
  return (
    <section className="mt-20" aria-label="Eat nearby">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-3xl">Eat nearby</h2>
        <Link to="/food" className="text-sm underline hover:text-ember">All food places</Link>
      </div>
      <p className="-mt-4 mb-8 text-sm text-muted">Straight-line distance. Many food locations are approximate, so confirm hours and address before you go.</p>
      <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{near.map((s) => <SpotCard key={s._id} spot={s} />)}</div>
    </section>
  );
}
