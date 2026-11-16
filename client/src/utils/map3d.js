// Shared by every coloured 3D map (Experience, Spots, Food): the styles, the terrain and what is re-added whenever the base style changes.
// "Map" = OpenFreeMap vector style (no API key). "Satellite" = Esri World Imagery. Terrain = AWS open elevation tiles.
export const STREETS = 'https://tiles.openfreemap.org/styles/liberty';
export const SATELLITE = {
  version: 8,
  sources: { sat: { type: 'raster', tileSize: 256, maxzoom: 18, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' } },
  layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
};
export const DEM = { type: 'raster-dem', encoding: 'terrarium', tileSize: 256, maxzoom: 15, tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], attribution: 'Terrain: Mapzen, AWS Open Data' };

export const still = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// GeoJSON for the route: a line when there are two or more points, otherwise nothing.
export const routeData = (line) => (line.length > 1 ? { type: 'Feature', geometry: { type: 'LineString', coordinates: line } } : { type: 'FeatureCollection', features: [] });

// Everything that must be re-added whenever the base style changes (terrain, hills, sky and, when given, the orange route).
export function dress(map, kind, line = [], { keepRoute = false } = {}) {
  if (!map.getSource('dem')) map.addSource('dem', DEM);
  map.setTerrain({ source: 'dem', exaggeration: 1.7 });
  if (kind === 'streets' && !map.getLayer('hills')) {
    const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    map.addLayer({ id: 'hills', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.5, 'hillshade-shadow-color': '#26301f', 'hillshade-highlight-color': '#fff', 'hillshade-accent-color': '#4d6b3a' } }, firstLabel);
  }
  try { map.setSky({ 'sky-color': '#8fc8ff', 'horizon-color': '#fff1dc', 'fog-color': '#fff1dc', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.25 }); } catch { /* older engines: no sky */ }
  if (line.length > 1 || keepRoute) { // keepRoute: add the (maybe empty) route now so it can be filled in later
    map.addSource('route', { type: 'geojson', data: routeData(line) });
    map.addLayer({ id: 'route-case', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 } });
    map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ff6a13', 'line-width': 3.5, 'line-dasharray': [1.2, 1.6] } });
  }
}

// WebGL is needed for the 3D map. Browsers that lack it (and the test runner) keep the flat map.
export const canUse3D = () => typeof window !== 'undefined' && 'WebGLRenderingContext' in window;
