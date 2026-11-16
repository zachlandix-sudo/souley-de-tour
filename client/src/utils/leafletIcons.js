import L from 'leaflet';
import { pinSvg, foodPinSvg, beaconHtml, livePinHtml } from './pinHtml.js';

// Orange pin with a black centre. The active pin is drawn larger and inverted (see .souley-pin--active in index.css).
const base = { iconSize: [30, 42], iconAnchor: [15, 41], popupAnchor: [0, -38] };

// Food places: black pin with an orange centre, so they read apart from orange spot pins.
export const foodIcon = L.divIcon({ ...base, html: foodPinSvg, className: 'souley-pin souley-pin--food' });
export const defaultIcon = L.divIcon({ ...base, html: pinSvg, className: 'souley-pin' });
export const activeIcon = L.divIcon({ ...base, html: pinSvg, className: 'souley-pin souley-pin--active' });

// The spotlight pin on the Spots map: same inverted pin, but wrapped so it can lift and carry the orbit ring.
export const liveActiveIcon = L.divIcon({ ...base, html: livePinHtml, className: 'souley-pin souley-pin--active' });

// The pin for the map's opening sequence: the pin drops into place after `delay` seconds.
const beacons = new Map();
export function beaconIcon(kind, delay) {
  const key = `${kind}:${Number(delay).toFixed(2)}`;
  if (!beacons.has(key)) beacons.set(key, L.divIcon({ ...base, html: beaconHtml(kind, delay), className: `souley-pin${kind === 'food' ? ' souley-pin--food' : ''}` }));
  return beacons.get(key);
}

export default function configureLeafletIcons() {
  L.Marker.prototype.options.icon = defaultIcon;
}

// Runs when a map component first imports this file (main.jsx used to call it, which put Leaflet in the first bundle of every page).
configureLeafletIcons();
