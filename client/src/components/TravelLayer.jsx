import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { CAMERA_S, ROUTE_DELAY_MS, ROUTE_DRAW_MS, arcPoints, easeOutCubic, loopMs, pathUpTo, pointAlong } from '../utils/travel';

const ORANGE = '#ff6a13';
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const frame = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16));
const unframe = (id) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));

// Icons are made on use, so importing this file never touches Leaflet. Their look is in index.css, block "map: travel time".
const youIcon = () => L.divIcon({ className: 'you-pin', html: '<span class="you-ring"></span><span class="you-dot"></span>', iconSize: [26, 26], iconAnchor: [13, 13] });
const travelerIcon = () => L.divIcon({ className: 'trav-pin', html: '<span class="trav-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
const rippleIcon = () => L.divIcon({ className: 'arrive-pin', html: '<span class="arrive-ring"></span><span class="arrive-ring arrive-ring--late"></span>', iconSize: [56, 56], iconAnchor: [28, 28] });

// "From you to this spot", drawn on the map. It owns the Leaflet bits only; the numbers live in TravelPanel.
//   you      a pulsing dot (with a small "You" label) at the visitor's location
//   camera   glides so both ends are in view, leaving room at the top for the card
//   route    once the camera has landed, a glowing line grows from you to the spot (ROUTE_DRAW_MS)
//   arrival  the spot pin sends out two ripples and a light starts travelling the route, faster by car than on foot
// onPhase(routeKey, 'flying' | 'drawing' | 'done') lets the card count up in step with the line.
// With `motion` false (reduced motion) the whole route is simply there at once and nothing moves.
export default function TravelLayer({ origin, dest, routeKey, modeId, motion = true, youLabel = '', onPhase }) {
  const map = useMap();
  const modeRef = useRef(modeId);
  modeRef.current = modeId;
  const phaseRef = useRef(onPhase);
  phaseRef.current = onPhase;
  const oLat = origin?.[0], oLng = origin?.[1];
  const dLat = dest?.[0], dLng = dest?.[1];

  // You are here.
  useEffect(() => {
    if (!Number.isFinite(oLat) || !Number.isFinite(oLng)) return undefined;
    const you = L.marker([oLat, oLng], { icon: youIcon(), interactive: false, keyboard: false, zIndexOffset: 900 }).addTo(map);
    if (youLabel) you.bindTooltip(`<span class="pin-name-in">${youLabel}</span>`, { permanent: true, direction: 'top', offset: [0, -12], className: 'pin-name' });
    return () => { you.remove(); };
  }, [map, oLat, oLng, youLabel]);

  // The route to the chosen spot.
  useEffect(() => {
    if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) return undefined;
    const from = [oLat, oLng];
    const to = [dLat, dLng];
    const pts = arcPoints(from, to);
    const layers = [];
    const timers = [];
    let raf = 0, stopped = false, started = false;
    const report = (name) => phaseRef.current?.(routeKey, name);
    const add = (layer) => { layer.addTo(map); layers.push(layer); return layer; };
    const line = (opts) => add(L.polyline([from, from], { interactive: false, lineCap: 'round', lineJoin: 'round', ...opts }));
    const glow = line({ className: 'route-glow', color: ORANGE, weight: 13, opacity: 0.2 });
    const main = line({ className: 'route-line', color: ORANGE, weight: 4, opacity: 1 });
    const setPath = (path) => { glow.setLatLngs(path); main.setLatLngs(path); };

    // The line has landed: ripple at the spot, marching light on the line, and a dot that travels it for as long as the route stays.
    const arrived = () => {
      report('done');
      if (!motion) return;
      add(L.marker(to, { icon: rippleIcon(), interactive: false, keyboard: false, zIndexOffset: -100 }));
      add(L.polyline(pts, { interactive: false, className: 'route-flow', color: '#fff', weight: 2, opacity: 0.9, dashArray: '1 13', lineCap: 'round' }));
      const rider = add(L.marker(pts[0], { icon: travelerIcon(), interactive: false, keyboard: false, zIndexOffset: 800 }));
      let phase = 0;
      let last = clock();
      const loop = () => {
        if (stopped) return;
        const now = clock();
        phase = (phase + (now - last) / loopMs(modeRef.current)) % 1; // adds up, so switching mode never makes the dot jump
        last = now;
        rider.setLatLng(pointAlong(pts, phase));
        raf = frame(loop);
      };
      raf = frame(loop);
    };

    // The line grows from you to the spot. Only started once the camera is still: re-drawing a path while the map is
    // flying leaves it out of place until the flight ends.
    const draw = () => {
      if (stopped || started) return;
      started = true;
      report('drawing');
      const t0 = clock();
      const tick = () => {
        if (stopped) return;
        const p = Math.min(1, (clock() - t0) / ROUTE_DRAW_MS);
        setPath(pathUpTo(pts, easeOutCubic(p)));
        if (p < 1) raf = frame(tick); else arrived();
      };
      tick();
    };

    report('flying');
    const size = map.getSize ? map.getSize() : null;
    const sized = !size || (size.x > 0 && size.y > 0); // a hidden map (phone, List tab) has no size: fly maths would break
    if (!motion || !sized) {
      setPath(pts);
      if (sized && map.fitBounds) map.fitBounds(L.latLngBounds([from, to]), { paddingTopLeft: [50, 130], paddingBottomRight: [50, 50], maxZoom: 14, animate: false });
      started = true;
      arrived();
    } else {
      const top = Math.round(Math.min(180, (size?.y || 400) * 0.5)); // room for the travel card at the top of the map
      map.flyToBounds(L.latLngBounds([from, to]), { paddingTopLeft: [50, top], paddingBottomRight: [50, 50], maxZoom: 14, duration: CAMERA_S, easeLinearity: 0.2 });
      map.once('moveend', draw); // after flyToBounds: it stops any earlier glide first, and that glide's own moveend must not start the line
      timers.push(setTimeout(draw, CAMERA_S * 1000 + ROUTE_DELAY_MS)); // in case the map never reports that it arrived
    }

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      unframe(raf);
      map.off('moveend', draw);
      layers.forEach((l) => l.remove());
    };
  }, [map, oLat, oLng, dLat, dLng, routeKey, motion]);

  return null;
}
