import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { toLatLng } from '../../utils/geo';
import { SATELLITE, STREETS, dress, routeData, still } from '../../utils/map3d';
import { isFood, spreadPins } from '../../utils/journey';

// A coloured 3D map (MapLibre GL): real terrain you can tilt, hillshading, 3D buildings, an orange route draped over the land.
// Styles, terrain and the sky live in utils/map3d.js (shared with the Spots and Food maps). The browser needs internet for tiles; nothing needs a key.
const START = { center: [125.0, 10.35], zoom: 9.6, pitch: 58, bearing: -16 };

export default function ExperienceMap({ stops, activeId, onSelect }) {
  const root = useRef(null);
  const box = useRef(null);
  const mapRef = useRef(null);
  const pinsRef = useRef([]);
  const live = useRef({});
  const [big, setBig] = useState(false); // Expand = the map grows taller where it is (never a full-screen overlay, so the page title stays visible)
  const [kind, setKind] = useState('streets');
  const [failed, setFailed] = useState(false);
  const base = stops.map((s, i) => ({ s, i, pos: toLatLng(s) })).filter((p) => p.pos).map((p) => ({ ...p, lnglat: [p.pos[1], p.pos[0]], food: isFood(p.s) }));
  const spread = spreadPins(base.map((p) => ({ id: p.s._id, lnglat: p.lnglat }))); // places that share one town-centre point are fanned out a little
  const pins = base.map((p) => ({ ...p, lnglat: spread[p.s._id] || p.lnglat }));
  const line = pins.filter((p) => !p.food).map((p) => p.lnglat); // the orange route joins the places; food stops are pins only
  const lastFly = useRef(null);
  live.current = { kind, line, onSelect };

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({ container: box.current, style: STREETS, ...START, maxPitch: 78, cooperativeGestures: true, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
    } catch { setFailed(true); return undefined; }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('style.load', () => dress(map, live.current.kind, live.current.line, { keepRoute: true }));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => { // Map <-> Satellite
    const map = mapRef.current;
    if (map) map.setStyle(kind === 'satellite' ? SATELLITE : STREETS);
  }, [kind]);

  useEffect(() => { // the box changed height: resize the canvas as it grows (and once more when the animation has surely ended)
    const map = mapRef.current;
    if (!map) return undefined;
    const t1 = requestAnimationFrame(() => map.resize());
    const t2 = setTimeout(() => { map.resize(); if (big) root.current?.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' }); }, 420);
    const grow = () => map.resize();
    const el = root.current;
    el?.addEventListener('transitionend', grow);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); el?.removeEventListener('transitionend', grow); };
  }, [big]);

  const key = pins.map((p) => `${p.s._id}`).join(',');
  useEffect(() => { // numbered orange pins
    const map = mapRef.current;
    if (!map) return undefined;
    pinsRef.current = pins.map(({ s, i, lnglat, food }) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = food ? 'xp-pin is-food' : 'xp-pin';
      el.title = `${food ? 'Food stop' : 'Stop'} ${i + 1}: ${s.name}`;
      el.setAttribute('aria-label', el.title);
      el.innerHTML = `<span>${i + 1}</span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); live.current.onSelect?.(s._id); });
      return { id: s._id, el, marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lnglat).addTo(map) };
    });
    const src = map.getSource?.('route');
    if (src) src.setData(routeData(line));
    return () => pinsRef.current.forEach((p) => p.marker.remove());
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // the camera flies to the active stop, tilted, turning a little each time
    const map = mapRef.current;
    pinsRef.current.forEach((p) => p.el.classList.toggle('is-active', p.id === activeId));
    const at = pins.findIndex((p) => p.s._id === activeId);
    if (!map) return;
    if (at >= 0) {
      if (lastFly.current === activeId) return; // "Show more" added pins: the camera stays where it is
      lastFly.current = activeId;
      map.flyTo({ center: pins[at].lnglat, zoom: 12.6, pitch: 64, bearing: at % 2 ? 30 : -26, duration: still() ? 0 : 2400, essential: true });
    } else if (pins.length > 1) {
      lastFly.current = null;
      const pts = pins.map((p) => p.lnglat);
      const bounds = pts.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0]));
      map.fitBounds(bounds, { padding: 50, pitch: 50, duration: 0, maxZoom: 13 });
    }
  }, [activeId, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={root} className={`xp-map${big ? ' is-big' : ''}`}>
      <div ref={box} className="xp-map-canvas" role="region" aria-label="3D map of the journey stops. Drag to look around; use two fingers or Ctrl and scroll to zoom." />
      <div className="xp-map-tools" role="group" aria-label="Map style">
        {[['streets', 'Map'], ['satellite', 'Satellite']].map(([k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}
      </div>
      <p className="xp-map-key" aria-hidden="true"><i />Places <i className="is-food" />Food</p>
      <button type="button" className="xp-map-expand" aria-pressed={big} onClick={() => setBig((b) => !b)}>{big ? 'Shrink map' : 'Expand map'}</button>
      {failed && <p className="xp-map-fail">The 3D map needs WebGL. Try another browser or turn on hardware acceleration.</p>}
      {!failed && pins.length === 0 && <p className="xp-map-fail">No map locations for these stops</p>}
    </div>
  );
}
