import { lazy, Suspense, useState } from 'react';
import SpotMap from './SpotMap';
import { canUse3D } from '../utils/map3d';

// The map beside the Spots and Food lists. Default: the coloured 3D map (SpotMap3D, loaded on demand because MapLibre is large).
// "Flat" is the classic map with the opening animation and travel time from you. Browsers without WebGL get the flat map and no switch.
const SpotMap3D = lazy(() => import('./SpotMap3D'));
const KEY = 'souley.mapMode';
const read = () => { try { return localStorage.getItem(KEY) === 'flat' ? 'flat' : '3d'; } catch { return '3d'; } };

export default function ExploreMap(props) {
  const [mode, setMode] = useState(read);
  const [broken, setBroken] = useState(false);
  const can3D = canUse3D() && !broken;
  const pick = (m) => { setMode(m); try { localStorage.setItem(KEY, m); } catch { /* private mode: the choice just lasts for this visit */ } };
  if (!can3D) return <SpotMap {...props} />;
  const flat = mode === 'flat';
  const { spots, activeId, focusActive, visible, nearMe, onPinClick, onPinHover } = props;
  return (
    <div className="flex h-full flex-col">
      <div className="map-mode" role="group" aria-label="Map view">
        <span>Map view</span>
        <div>
          {[['3d', '3D'], ['flat', 'Flat']].map(([m, label]) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => pick(m)}>{label}</button>)}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          {flat ? <SpotMap {...props} /> : (
            <Suspense fallback={<p className="grid h-full place-items-center bg-paper text-sm text-muted">Loading the 3D map…</p>}>
              <SpotMap3D spots={spots} activeId={activeId} focusActive={focusActive} visible={visible} nearMe={nearMe} onPinClick={onPinClick} onPinHover={onPinHover} onFail={() => setBroken(true)} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
