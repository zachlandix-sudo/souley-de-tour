import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { isFoodSpot, toLatLng } from '../utils/geo';
import { activeIcon, beaconIcon, defaultIcon, foodIcon, liveActiveIcon } from '../utils/leafletIcons';
import { DIVE_LEAD_MS, DIVE_MS, FLY_FIRST_S, FLY_NEXT_S, WAVE_TOTAL_MS, centerOf, waveDelays } from '../utils/mapIntro';
import { DEFAULT_MODE } from '../utils/travel';
import { useNearMe } from '../hooks/useNearMe';
import { useI18n } from '../i18n/I18nContext';
import TravelLayer from './TravelLayer';
import TravelPanel from './TravelPanel';

const CENTER = [10.35, 125.0]; // Southern Leyte

// `fly` (seconds) makes the camera glide to the pins instead of snapping; 0 keeps the plain fit.
function FitBounds({ points, visible, hold, fly = 0 }) {
  const map = useMap();
  useEffect(() => {
    if (visible) map.invalidateSize();
    if (hold || !points.length) return; // the opening sequence does its own framing
    const size = fly ? map.getSize?.() : null; // a hidden map (phone, List tab) has no size: fly maths would break, so plain fit
    if (fly && map.flyToBounds && (!size || (size.x > 0 && size.y > 0))) {
      if (points.length === 1) map.flyTo(points[0], 13, { duration: fly });
      else map.flyToBounds(points, { padding: [30, 30], duration: fly, easeLinearity: 0.2 });
      return;
    }
    if (points.length === 1) map.setView(points[0], 13);
    else map.fitBounds(points, { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, visible, JSON.stringify(points)]);
  return null;
}

// "Beacons at night": the map opens dark and tilted, dives in to the spots while it levels and brightens,
// then the pins light up as a wave from south to north. Any touch on the map skips straight to the end.
// phase: 'dark' (waiting) -> 'lit' (diving) -> 'wave' (pins lighting up) -> 'done'.
function IntroController({ points, onPhase }) {
  const map = useMap();
  useEffect(() => {
    const timers = [];
    let ended = false, waved = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = () => { if (!ended) { ended = true; onPhase('done'); } };
    const startWave = () => { if (ended || waved) return; waved = true; onPhase('wave'); later(finish, WAVE_TOTAL_MS); };

    map.setView(centerOf(points), Math.max(6, map.getBoundsZoom(points) - 3), { animate: false }); // start high above the coast
    later(() => {
      if (ended) return;
      onPhase('lit');
      map.once('moveend', startWave);
      map.flyToBounds(points, { padding: [30, 30], duration: DIVE_MS / 1000, easeLinearity: 0.2 });
      later(startWave, DIVE_MS + 900); // in case the map never reports that it arrived
    }, DIVE_LEAD_MS);

    const box = map.getContainer();
    const skip = () => {
      if (ended) return;
      map.off('moveend', startWave); map.stop();
      map.fitBounds(points, { padding: [30, 30], animate: false });
      finish();
    };
    box.addEventListener('pointerdown', skip);
    box.addEventListener('wheel', skip, { passive: true });
    return () => {
      ended = true; timers.forEach(clearTimeout);
      map.off('moveend', startWave);
      box.removeEventListener('pointerdown', skip); box.removeEventListener('wheel', skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

// Moves the map to the active pin (only used when focusActive is set, e.g. the map page).
function FocusActive({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (!pos) return;
    const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    map.setView(pos, Math.max(map.getZoom?.() ?? 0, 14), { animate: !calm });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pos?.[0], pos?.[1]]);
  return null;
}

// Spotlight (live map): when the active pin is near or past the edge of the map, nudge the map just enough to bring it in.
// Never zooms. Waits a moment so sweeping the mouse down the list does not make the map chase every row.
function Spotlight({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (!pos || !map.panInside || !map.getBounds) return undefined;
    const t = setTimeout(() => {
      if (!map.getBounds().pad(-0.1).contains(pos)) map.panInside(pos, { padding: [70, 70], duration: 0.6 });
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pos?.[0], pos?.[1]]);
  return null;
}

// Live map: a touch or scroll on the map ends the arrival at once (the pins are already in place).
function SkipOnTouch({ onSkip }) {
  const map = useMap();
  useEffect(() => {
    const box = map.getContainer();
    const go = () => { map.stop?.(); onSkip(); };
    box.addEventListener('pointerdown', go);
    box.addEventListener('wheel', go, { passive: true });
    return () => { box.removeEventListener('pointerdown', go); box.removeEventListener('wheel', go); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

const calmMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// `live` is the "First light" treatment used beside the list on the Spots page (look and timings: index.css, block "map: first light"):
//   arrival  the camera glides in, a warm band of light rises from the south to the north and the pins drop in behind it
//   changes  when the results change (filter, search, page) the camera glides again and the new pins drop in as a wave
//   ambient  a very slow drift of soft cloud-light over the map, so it is never a still picture
//   spotlight hover a row (or a pin): that pin lifts and shows its name, the others dim, the map nudges it into view
// It does nothing with reduced motion. Without `live` the map behaves exactly as before.
//
// `travel` adds "travel time from you" (look and timings: index.css, block "map: travel time"; maths: utils/travel.js):
//   a corner button asks for the visitor's location, then the pin they pick (or the active spot when `focusActive`, or the only spot) gets
//   a route drawn from them to it and an estimated time that counts up, for walking, motorbike or car.
//   `nearMe` (the object from useNearMe) is optional: when the page's own "Near me" is already on it is reused, otherwise the map asks by itself.
// Without `travel` nothing of this is rendered.
export default function SpotMap({ spots = [], activeId = null, onPinClick, onPinHover, height = '100%', visible = true, focusActive = false, dark = false, intro = false, live = false, travel = false, nearMe = null }) {
  const pins = useMemo(() => spots.map((s) => ({ spot: s, pos: toLatLng(s) })).filter((p) => p.pos), [spots]);
  const activePos = focusActive ? pins.find((p) => p.spot._id === activeId)?.pos : null;
  // The opening sequence plays once, when the map first appears with at least two pins (and never with reduced motion).
  const [phase, setPhase] = useState(() => (intro && pins.length > 1 && !calmMotion() ? 'dark' : 'done'));
  const playing = phase !== 'done';
  const delays = useMemo(() => waveDelays(pins.map((p) => ({ id: String(p.spot._id || p.spot.slug), lat: p.pos[0] }))), [pins]);

  // Travel time. The spot is the one clicked on the map (or the active one on the map page, or the only one shown).
  const i18n = useI18n();
  const ownNearMe = useNearMe();
  const near = nearMe?.active ? nearMe : ownNearMe; // the page's "Near me" when it is on already; otherwise ask here, so the list does not re-sort
  const [picked, setPicked] = useState(null);
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [closed, setClosed] = useState(null); // key of the spot whose card was closed
  const [routePhase, setRoutePhase] = useState({ key: '', name: 'flying' });
  const keyOf = (s) => s._id ?? s.slug;
  const wanted = focusActive ? activeId : (picked ?? (pins.length === 1 ? keyOf(pins[0].spot) : null));
  const target = travel && !playing ? pins.find((p) => keyOf(p.spot) === wanted) || null : null;
  const targetKey = target ? String(keyOf(target.spot)) : null;
  useEffect(() => { setClosed(null); }, [targetKey]);
  const origin = travel && near.active ? near.origin : null;
  const route = target && origin && closed !== targetKey ? target : null;
  const routeKey = route ? `${targetKey}|${origin[0].toFixed(4)},${origin[1].toFixed(4)}` : '';
  const onRoutePhase = (key, name) => setRoutePhase((p) => (p.key === key && p.name === name ? p : { key, name }));

  // Live map: `wave` is set while a set of pins is dropping in; `first` marks the very first arrival (adds the light band and push-in).
  const liveOn = live && !calmMotion();
  const [wave, setWave] = useState(null);
  const arrived = useRef(false);
  const sig = pins.map((p) => String(p.spot._id || p.spot.slug)).join('|');
  // Layout effect: the pins are swapped for their dropping versions before the browser paints, so they never flash in place first.
  // The timer is (re)made on every run and `arrived` only flips when it fires, so a repeated run (StrictMode) cannot leave the wave stuck.
  useLayoutEffect(() => {
    if (!liveOn) return undefined;
    if (!sig) { setWave(null); return undefined; }
    setWave({ first: !arrived.current });
    const t = setTimeout(() => { arrived.current = true; setWave(null); }, WAVE_TOTAL_MS);
    return () => clearTimeout(t);
  }, [liveOn, sig]);
  const endArrival = () => { arrived.current = true; setWave(null); };

  const waving = phase === 'wave' || (liveOn && !!wave);
  const focus = liveOn && activeId != null && pins.some((p) => p.spot._id === activeId);
  const iconFor = (spot) => {
    if (activeId === spot._id) return liveOn ? liveActiveIcon : activeIcon;
    const food = isFoodSpot(spot);
    if (waving) return beaconIcon(food ? 'food' : 'spot', delays.get(String(spot._id || spot.slug)) ?? 0);
    return food ? foodIcon : defaultIcon;
  };
  const visiblePins = phase === 'dark' || phase === 'lit' ? [] : pins; // pins wait in the dark until the map lands
  const fly = liveOn ? (arrived.current ? FLY_NEXT_S : FLY_FIRST_S) : 0;
  return (
    <div
      className={`map-stage relative${liveOn ? ' map-live' : ''}`}
      data-intro={playing ? (phase === 'dark' ? 'dark' : 'lit') : undefined}
      data-arrive={liveOn && wave?.first ? 'on' : undefined}
      data-focus={focus ? 'on' : undefined}
      style={{ height }}
    >
      <div className="map-tilt h-full">
        <MapContainer center={CENTER} zoom={10} scrollWheelZoom className={`h-full w-full ${dark ? 'map-dark' : ''}`} aria-label="Map of spots">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={pins.map((p) => p.pos)} visible={visible} hold={playing} fly={fly} />
          {playing && <IntroController points={pins.map((p) => p.pos)} onPhase={setPhase} />}
          {focusActive && <FocusActive pos={activePos} />}
          {liveOn && <Spotlight pos={focus ? pins.find((p) => p.spot._id === activeId)?.pos : null} />}
          {liveOn && wave?.first && <SkipOnTouch onSkip={endArrival} />}
          {travel && origin && !playing && (
            <TravelLayer origin={origin} dest={route ? route.pos : null} routeKey={routeKey} modeId={mode} motion={!calmMotion()} youLabel={i18n.t('travel.you')} onPhase={onRoutePhase} />
          )}
          {visiblePins.map(({ spot, pos }) => (
            <Marker
              key={spot._id || spot.slug}
              position={pos}
              icon={iconFor(spot)}
              zIndexOffset={activeId === spot._id ? 1000 : 0}
              eventHandlers={{ click: () => { setPicked(keyOf(spot)); setClosed(null); onPinClick?.(spot._id); }, mouseover: () => onPinHover?.(spot._id), mouseout: () => onPinHover?.(null) }}
            >
              {liveOn && activeId === spot._id && (
                <Tooltip permanent direction="right" offset={[26, -26]} className="pin-name">
                  <span className="pin-name-in">{spot.name}</span>
                </Tooltip>
              )}
              <Popup>
                <strong>{spot.name}</strong><br />
                <Link to={`/spots/${spot.slug}`}>View details</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {travel && !playing && pins.length > 0 && (
        <TravelPanel
          near={near}
          spot={route ? route.spot : null}
          origin={origin}
          dest={route ? route.pos : null}
          mode={mode}
          onMode={setMode}
          phase={routePhase.key === routeKey ? routePhase.name : 'flying'}
          motion={!calmMotion()}
          onClose={() => setClosed(targetKey)}
        />
      )}
      {playing && <div aria-hidden="true" className="map-fog" />}
      {liveOn && <div aria-hidden="true" className="map-clouds" />}
      {liveOn && wave?.first && <div aria-hidden="true" className="map-dawn" />}
      {pins.length === 0 && (
        <p className="absolute inset-x-4 top-4 z-[500] bg-night px-3 py-2 text-center text-sm text-white">
          No map locations for these results
        </p>
      )}
    </div>
  );
}
