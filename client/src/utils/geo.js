// API stores [lng, lat]; Leaflet wants [lat, lng]. Returns null for anything unusable.
export function toLatLng(spot) {
  const c = spot?.location?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const [lng, lat] = c;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lat, lng];
}

// Readable coordinates for lists: { lat: '9.91000° N', lng: '125.07000° E', decimal: '9.91000, 125.07000' }. null when unusable.
export function formatCoord(spot) {
  const p = toLatLng(spot);
  if (!p) return null;
  const [lat, lng] = p;
  return {
    lat: `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`,
    lng: `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`,
    decimal: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

// Straight-line (haversine) distance in km between two [lat, lng] points.
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Adds `distanceKm` to each spot (null when it has no usable coordinates) and sorts nearest first. Unusable spots go last.
export function sortByDistance(spots, origin) {
  return spots
    .map((s) => {
      const p = toLatLng(s);
      return { ...s, distanceKm: p && origin ? distanceKm(origin, p) : null };
    })
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

export function formatKm(km) {
  if (km == null || !Number.isFinite(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;
}

// True when the spot belongs to the "food" category (categories come populated from the API).
export function isFoodSpot(spot) {
  return Array.isArray(spot?.categoryIds) && spot.categoryIds.some((c) => c?.slug === 'food');
}
