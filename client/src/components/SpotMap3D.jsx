import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { isFoodSpot, toLatLng } from '../utils/geo';
import { foodPinSvg, pinSvg } from '../utils/pinHtml';
import { SATELLITE, STREETS, dress, still } from '../utils/map3d';
import { useMapExpand } from '../hooks/useMapExpand';

// The coloured 3D map of the Experience page, for the Spots and Food lists: real terrain you can tilt, a Map / Satellite switch,
// an Expand button, and the same orange (spot) and black (food) pins as the flat map. Hover a row and its pin lifts and shows its name;
// click a pin for its card; the visitor's own position shows as a pulsing dot when "Near me" is on.
// Travel time from the visitor and the opening animation live in the flat map (SpotMap), reachable with the 3D / Flat switch (ExploreMap).
const START = { center: [125.0, 10.35], zoom: 9.4, pitch: 50, bearing: -10 };

// Frames the pins. Returns false when the map has no size yet (hidden phone tab), so the caller can try again when it appears.
function frame(map, lnglats) {
  const el = map.getContainer?.();
  if (el && (!el.clientWidth || !el.clientHeight)) return false;
  const duration = still() ? 0 : 1400;
  if (lnglats.length === 1) map.flyTo({ center: lnglats[0], zoom: 12.6, pitch: 55, duration, essential: true });
  else if (lnglats.length > 1) {
    const b = new maplibregl.LngLatBounds(lnglats[0], lnglats[0]);
    lnglats.forEach((l) => b.extend(l));
    map.fitBounds(b, { padding: 60, maxZoom: 13, pitch: 48, duration, essential: true });
  }
  return true;
}

// The card that opens on a pin. Built with textContent (names come from the database), the link goes through the router.
function popupNode(spot, go) {
  const box = document.createElement('div');
  box.className = 'm3-pop';
  const name = document.createElement('strong');
  name.textContent = spot.name;
  box.appendChild(name);
  if (spot.municipality) { const town = document.createElement('span'); town.textContent = spot.municipality; box.appendChild(town); }
  const link = document.createElement('a');
  link.href = `/spots/${spot.slug}`;
  link.textContent = 'View details';
  link.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(`/spots/${spot.slug}`); });
  box.appendChild(link);
  return box;
}

export default function SpotMap3D({ spots = [], activeId = null, focusActive = false, visible = true, nearMe = null, onPinClick, onPinHover, onFail }) {
  const navigate = useNavigate();
  const root = useRef(null);
  const box = useRef(null);
  const mapRef = useRef(null);
  const pinsRef = useRef([]);
  const needFrame = useRef(false);
  const styled = useRef(false);
  const live = useRef({});
  const [kind, setKind] = useState('streets');
  const [failed, setFailed] = useState(false);
  const [full, setFull] = useMapExpand(root, mapRef);
  const pins = useMemo(() => spots.map((spot) => ({ spot, pos: toLatLng(spot) })).filter((p) => p.pos).map((p) => ({ ...p, lnglat: [p.pos[1], p.pos[0]] })), [spots]);
  const sig = pins.map((p) => String(p.spot._id || p.spot.slug)).join('|');
  live.current = { pins, onPinClick, onPinHover, navigate };

  useEffect(() => {
    let map;
    try {
      map = new maplibregl.Map({ container: box.current, style: STREETS, ...START, maxPitch: 78, cooperativeGestures: true, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
    } catch { setFailed(true); return undefined; }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('style.load', () => dress(map, kind));
    mapRef.current = map;
    // A map that was hidden (phone: List tab) or whose box changed size gets its canvas and framing fixed when it has a size.
    const settle = () => { map.resize(); if (needFrame.current) needFrame.current = !frame(map, live.current.pins.map((p) => p.lnglat)); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(settle) : null;
    ro?.observe(box.current);
    return () => { ro?.disconnect(); map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (failed) onFail?.(); }, [failed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // Map <-> Satellite
    const map = mapRef.current;
    if (!styled.current) { styled.current = true; return; }
    if (map) map.setStyle(kind === 'satellite' ? SATELLITE : STREETS);
  }, [kind]);

  useEffect(() => { // the phone's Map tab was opened
    const map = mapRef.current;
    if (!map || !visible) return undefined;
    const t = requestAnimationFrame(() => { map.resize(); if (needFrame.current) needFrame.current = !frame(map, live.current.pins.map((p) => p.lnglat)); });
    return () => cancelAnimationFrame(t);
  }, [visible]);

  useEffect(() => { // one pin per spot, and the camera frames them whenever the results change
    const map = mapRef.current;
    if (!map) return undefined;
    pinsRef.current = pins.map(({ spot, lnglat }) => {
      const food = isFoodSpot(spot);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `m3-pin${food ? ' m3-pin--food' : ''}`;
      el.setAttribute('aria-label', spot.name);
      const art = document.createElement('span');
      art.className = 'm3-pin-art';
      art.innerHTML = food ? foodPinSvg : pinSvg; // fixed markup from utils/pinHtml.js, no data in it
      const label = document.createElement('span');
      label.className = 'm3-name';
      label.textContent = spot.name;
      el.append(art, label);
      el.addEventListener('mouseenter', () => live.current.onPinHover?.(spot._id));
      el.addEventListener('mouseleave', () => live.current.onPinHover?.(null));
      el.addEventListener('click', () => live.current.onPinClick?.(spot._id));
      const popup = new maplibregl.Popup({ offset: 44, maxWidth: '240px' }).setDOMContent(popupNode(spot, (to) => live.current.navigate(to)));
      return { id: spot._id, el, lnglat, marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(lnglat).setPopup(popup).addTo(map) };
    });
    needFrame.current = !frame(map, pins.map((p) => p.lnglat));
    return () => pinsRef.current.forEach((p) => p.marker.remove());
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { // the hovered / selected pin lifts; a selected one is flown to, a hovered one is only nudged into view
    const map = mapRef.current;
    pinsRef.current.forEach((p) => { const on = p.id === activeId; p.el.classList.toggle('is-active', on); p.el.style.zIndex = on ? '5' : ''; });
    const hit = pinsRef.current.find((p) => p.id === activeId);
    if (!map || !hit) return undefined;
    if (focusActive) { map.flyTo({ center: hit.lnglat, zoom: Math.max(map.getZoom?.() ?? 0, 12.6), pitch: 60, duration: still() ? 0 : 1600, essential: true }); return undefined; }
    const t = setTimeout(() => { if (!map.getBounds().contains(hit.lnglat)) map.easeTo({ center: hit.lnglat, duration: still() ? 0 : 600 }); }, 180);
    return () => clearTimeout(t);
  }, [activeId, focusActive, sig]);

  const origin = nearMe?.active ? nearMe.origin : null;
  useEffect(() => { // "Near me": a pulsing dot where the visitor is
    const map = mapRef.current;
    if (!map || !origin) return undefined;
    const el = document.createElement('div');
    el.className = 'm3-you';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'You are here');
    const marker = new maplibregl.Marker({ element: el }).setLngLat([origin[1], origin[0]]).addTo(map);
    return () => marker.remove();
  }, [origin?.[0], origin?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={root} className={`xp-map is-fill${full ? ' is-full' : ''}`}>
      <div ref={box} className="xp-map-canvas" role="region" aria-label="3D map of the places. Drag to look around; use two fingers or Ctrl and scroll to zoom." />
      <div className="xp-map-tools" role="group" aria-label="Map style">
        {[['streets', 'Map'], ['satellite', 'Satellite']].map(([k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}
      </div>
      <button type="button" className="xp-map-expand" aria-pressed={full} onClick={() => setFull((f) => !f)}>{full ? 'Close map' : 'Expand map'}</button>
      {failed && <p className="xp-map-fail">The 3D map needs WebGL. Switching to the flat map.</p>}
      {!failed && pins.length === 0 && <p className="xp-map-fail">No map locations for these results</p>}
    </div>
  );
}
