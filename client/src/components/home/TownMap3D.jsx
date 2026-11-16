import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import data from '../../data/townMap.json';
import { COLORS, NEAR_ZOOM, MAJOR, cameraPadding } from '../../utils/townMap';
import { SATELLITE, STREETS, dress } from '../../utils/map3d';

// The real ground under the town borders: satellite photos (or the street map) draped over 3D terrain, the same base the Experience,
// Spots and Food maps use (utils/map3d.js: Esri imagery, OpenFreeMap streets, AWS elevation tiles, no API key).
// On top of it we only draw our own data: a bright outline for each Southern Leyte town, a faint dashed one for the Leyte towns around
// it, a glow on the hovered town, and, when a town is picked, an orange outline with everything else dimmed (the "spotlight").
const IS_SL = ['==', ['get', 'sl'], true];
const IS_NB = ['==', ['get', 'sl'], false];
const idIs = (id) => ['==', ['get', 'id'], id];
const HOME_VIEW = { pitch: 58, bearing: -16 };
const byId = Object.fromEntries(data.towns.features.map((f) => [f.properties.id, f.properties]));
const EMPTY = { type: 'FeatureCollection', features: [] };

// The spotlight: one big rectangle with the picked town cut out of it, drawn as a dark veil over the rest of the world.
const WORLD = [[118, 2], [132, 2], [132, 18], [118, 18], [118, 2]];
const outerRings = (f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]));
const veilFor = (id) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [WORLD, ...data.towns.features.filter((f) => f.properties.id === id).flatMap(outerRings)] } });

// Our layers. They are added again every time the base map is switched, because a new base style wipes whatever was added to the old one.
function addTownLayers(map, kind) {
  if (map.getSource('towns')) return;
  map.addSource('towns', { type: 'geojson', data: data.towns });
  map.addSource('veil', { type: 'geojson', data: EMPTY });
  const fill = (id, filter, color, opacity) => map.addLayer({ id, type: 'fill', source: id === 'veil' ? 'veil' : 'towns', ...(filter ? { filter } : {}), paint: { 'fill-color': color, 'fill-opacity': opacity } });
  const line = (id, filter, color, width, opacity, extra = {}) => map.addLayer({ id, type: 'line', source: 'towns', filter, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity, ...extra } });
  // A little extra relief on top of the satellite photo, so the hills read as hills (the street map adds its own, see dress()).
  if (kind === 'satellite' && map.getSource('dem')) {
    map.addLayer({ id: 'relief', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.32, 'hillshade-shadow-color': '#0b1409', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#26361d' } });
  }
  fill('veil', null, '#05070a', 0);
  map.setPaintProperty('veil', 'fill-opacity-transition', { duration: 600 });
  fill('hit', null, '#ffffff', 0.001); // invisible, but it is what the pointer hits
  fill('hover', idIs(''), '#ffffff', 0.2);
  line('nb-line', IS_NB, '#ffffff', 0.9, 0.4, { 'line-dasharray': [2, 2] });
  line('sl-line', IS_SL, '#ffffff', ['interpolate', ['linear'], ['zoom'], 7, 0.9, 11, 2], 0.9);
  line('sel-glow', idIs(''), COLORS.selected, 12, 0.35, { 'line-blur': 7 });
  fill('sel-fill', idIs(''), COLORS.selected, 0.2);
  line('sel-line', idIs(''), COLORS.selected, ['interpolate', ['linear'], ['zoom'], 7, 2.5, 11, 4], 1);
}

// A name tag. When the map is zoomed out only the biggest towns keep their name; the others show a dot (CSS, data-lod on the map).
function label(p) {
  const pin = document.createElement('div');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.tabIndex = -1;
  btn.className = `tm-label${p.sl ? '' : ' tm-label--nb'}${MAJOR.has(p.id) ? '' : ' tm-label--minor'}`;
  btn.textContent = p.name;
  btn.dataset.id = p.id;
  pin.setAttribute('aria-hidden', 'true'); // the chips under the map are the accessible way to pick a town
  pin.appendChild(btn);
  return pin;
}

// Names of the land around (Leyte, Bohol, Cebu): small, not clickable.
function landName(p) {
  const pin = document.createElement('div');
  pin.className = 'tm-land';
  pin.setAttribute('aria-hidden', 'true');
  const span = document.createElement('span');
  span.textContent = p.name;
  pin.appendChild(span);
  return pin;
}

// The map itself (MapLibre GL). Loaded lazily by TownsExplorer.
//   selectedId: id of the picked town or null; onSelect(id|null): the visitor clicked a town (or empty sea);
//   onReady / onFail: map is drawn / WebGL is not available; coop: text for the touch and scroll hints.
export default function TownMap3D({ selectedId, onSelect, onReady, onFail, resetKey = 0, reduceMotion = false, coop }) {
  const box = useRef(null);
  const api = useRef(null);
  const live = useRef({});
  const styled = useRef(false);
  const [kind, setKind] = useState('satellite');
  live.current = { selectedId, onSelect, onReady, onFail, reduceMotion, kind };

  useEffect(() => {
    const el = box.current;
    let map;
    let hovered = '';
    let current = null;
    let first = true;
    const pins = new Map();
    const dur = (ms) => (live.current.reduceMotion ? 0 : ms);
    const pad = (card) => cameraPadding(el.clientWidth, card);

    try {
      map = new maplibregl.Map({
        container: el, style: SATELLITE, ...HOME_VIEW,
        bounds: data.bounds, fitBoundsOptions: { padding: pad(false), ...HOME_VIEW },
        minZoom: 6.8, maxZoom: 14, maxPitch: 78,
        maxBounds: [[123.9, 9.1], [126.3, 11.4]],
        attributionControl: false, cooperativeGestures: true, locale: coop,
        canvasContextAttributes: { antialias: true },
      });
    } catch {
      live.current.onFail?.();
      return undefined;
    }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Boundaries: NAMRIA / PSA (CC BY-IGO) via faeldon/philippines-json-maps' }), 'bottom-right');

    const lod = () => {
      const v = map.getZoom() >= NEAR_ZOOM ? 'near' : 'far';
      if (el.dataset.lod !== v) el.dataset.lod = v;
    };
    for (const f of data.context.features) {
      const p = f.properties;
      new maplibregl.Marker({ element: landName(p), anchor: 'center' }).setLngLat([p.lx, p.ly]).addTo(map);
    }
    for (const f of data.towns.features) {
      const p = f.properties;
      const pin = label(p);
      pin.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); live.current.onSelect?.(p.id); });
      new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat([p.lx, p.ly]).addTo(map);
      pins.set(p.id, pin);
    }
    map.on('zoom', lod);
    lod();

    // Picked town: orange outline, the rest of the world dimmed, and the camera flies to it. No town: back to the overview.
    const apply = (id, fly = true) => {
      if (!map.getLayer('sel-line')) return;
      if (current && pins.get(current)) pins.get(current).classList.remove('is-sel');
      current = id && byId[id] ? id : null;
      ['sel-fill', 'sel-line', 'sel-glow'].forEach((l) => map.setFilter(l, idIs(current || '')));
      map.getSource('veil').setData(current ? veilFor(current) : EMPTY);
      map.setPaintProperty('veil', 'fill-opacity', current ? 0.6 : 0);
      if (current) {
        pins.get(current).classList.add('is-sel');
        const [w, s, e, n] = byId[current].bbox;
        if (fly) map.fitBounds([[w, s], [e, n]], { padding: pad(true), maxZoom: 11, pitch: 62, bearing: map.getBearing(), duration: dur(1700) });
      } else if (fly) {
        map.fitBounds(data.bounds, { padding: pad(false), ...HOME_VIEW, duration: dur(1400) });
      }
    };
    api.current = { apply, map };

    // Runs for the first style and again whenever the base map is switched (style.load).
    map.on('style.load', () => {
      dress(map, live.current.kind); // terrain, hills, sky
      addTownLayers(map, live.current.kind);
      hovered = '';
      apply(current ?? live.current.selectedId, false);
      if (first) { first = false; live.current.onReady?.(); }
    });

    const hit = (point) => (map.getLayer('hit') ? map.queryRenderedFeatures(point, { layers: ['hit'] })[0]?.properties?.id || '' : '');
    const paintHover = (id) => { if (map.getLayer('hover')) map.setFilter('hover', idIs(id)); pins.forEach((pin, key) => pin.classList.toggle('is-hover', key === id)); };
    map.on('mousemove', (e) => {
      const id = hit(e.point);
      map.getCanvas().style.cursor = id ? 'pointer' : '';
      if (id === hovered) return;
      hovered = id;
      paintHover(id);
    });
    map.on('mouseout', () => { if (!hovered) return; hovered = ''; paintHover(''); });
    map.on('click', (e) => live.current.onSelect?.(hit(e.point) || null));
    map.on('error', (e) => { if (e?.error?.message?.includes('WebGL')) live.current.onFail?.(); });

    return () => { api.current = null; map.remove(); };
    // The map is built once; later changes arrive through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.apply(selectedId); }, [selectedId]);
  // "Reset view" while nothing is selected still has to fly back to the overview.
  useEffect(() => { if (resetKey) api.current?.apply(live.current.selectedId); }, [resetKey]);
  useEffect(() => { // Satellite <-> Map. diff: false makes the style load fresh, so style.load runs and our layers are added again.
    if (!styled.current) { styled.current = true; return; }
    api.current?.map.setStyle(kind === 'satellite' ? SATELLITE : STREETS, { diff: false });
  }, [kind]);

  return (
    <>
      <div ref={box} className="tm-canvas absolute inset-0" />
      <div className="tm-basemap" role="group" aria-label="Base map">
        {[['satellite', 'Satellite'], ['streets', 'Map']].map(([k, text]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{text}</button>
        ))}
      </div>
    </>
  );
}
