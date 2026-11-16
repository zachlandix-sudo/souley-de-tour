// Refines the town-level pins using OpenStreetMap Nominatim. Run it on your own machine (needs internet):
//   node geocode-spots.mjs southern-leyte-spots.json > southern-leyte-spots.geocoded.json
// A hit is only accepted if it lies within 25 km of the spot's current pin, so a wrong match elsewhere is ignored.
// Always spot-check the results on a map; OSM may name a place differently or not have it at all.
import fs from 'node:fs';

const file = process.argv[2] || 'southern-leyte-spots.json';
const spots = JSON.parse(fs.readFileSync(file, 'utf8'));
const MAX_KM = 25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const km = (a, b, c, d) => {
  const R = 6371, p = Math.PI / 180;
  const x = Math.sin(((c - a) * p) / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(((d - b) * p) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

for (const s of spots) {
  if (!/^(town|approx)/.test(s.coordPrecision)) continue; // keep pins that already came from a source
  const q = `${s.name}, ${s.barangay ? s.barangay + ', ' : ''}${s.municipality}, Southern Leyte, Philippines`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ph&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'souley-de-tour-geocoder/1.0 (personal project)' } });
    const [hit] = res.ok ? await res.json() : [];
    if (hit) {
      const lat = Number(hit.lat), lng = Number(hit.lon);
      if (km(s.latitude, s.longitude, lat, lng) <= MAX_KM) {
        s.latitude = lat; s.longitude = lng; s.coordPrecision = 'OpenStreetMap (Nominatim) - spot-check';
      } else console.error(`far from town, kept: ${s.name}`);
    } else console.error(`no match, kept: ${s.name}`);
  } catch (e) { console.error(`error for ${s.name}: ${e.message}`); }
  await sleep(1100); // Nominatim allows about one request per second
}
console.log(JSON.stringify(spots, null, 2));
