// Helpers for the Experience > Journey section, which lists every place AND every food stop. No React in here so they are easy to test.

// A food stop is anything imported with an entryType (restaurant, cafe, bakery...) or filed under the Food category.
export function isFood(spot) {
  if (!spot) return false;
  if (spot.entryType) return true;
  return (spot.categoryIds || []).some((c) => c && (c.slug === 'food' || c.name === 'Food'));
}

// kind: 'all' | 'places' | 'food'. town: exact municipality ('' = all towns). q: text in the name, town, barangay or address.
export function filterStops(list, { kind = 'all', town = '', q = '' } = {}) {
  const needle = String(q).trim().toLowerCase();
  return list.filter((s) => {
    if (kind === 'food' && !isFood(s)) return false;
    if (kind === 'places' && isFood(s)) return false;
    if (town && s.municipality !== town) return false;
    if (needle) {
      const hay = [s.name, s.municipality, s.barangay, s.address].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

export const townsOf = (list) => [...new Set(list.map((s) => s.municipality).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Many imported places share one town-centre coordinate, so their pins would sit exactly on top of each other.
// Pins that share a spot are fanned out in a small spiral (same order every time). Returns { [id]: [lng, lat] }.
export function spreadPins(items) {
  const seen = {};
  const out = {};
  items.forEach(({ id, lnglat }) => {
    const key = `${lnglat[0].toFixed(4)},${lnglat[1].toFixed(4)}`;
    const k = seen[key] || 0;
    seen[key] = k + 1;
    const r = 0.0028 * Math.sqrt(k);
    const a = k * 2.399963; // golden angle: neighbours never line up
    out[id] = [lnglat[0] + r * Math.cos(a), lnglat[1] + r * Math.sin(a)];
  });
  return out;
}
