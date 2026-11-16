import { useEffect, useState } from 'react';

// "Expand map": the map fills the screen. While it is open the canvas is resized, plain scroll zooms (no Ctrl needed),
// Esc closes it, the page behind stops scrolling, and every positioned ancestor (sticky side panels) is lifted above the
// page header, because a sticky panel is its own stacking context and would otherwise keep the full-screen map under the header.
export function useMapExpand(rootRef, mapRef) {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    const lifted = [];
    if (full) {
      document.body.classList.add('xp-map-lock');
      for (let el = rootRef.current?.parentElement; el && el !== document.body; el = el.parentElement) {
        if (getComputedStyle(el).position !== 'static') { el.classList.add('xp-lift'); lifted.push(el); }
      }
    }
    const kick = requestAnimationFrame(() => map?.resize());
    if (map?.cooperativeGestures) { if (full) map.cooperativeGestures.disable(); else map.cooperativeGestures.enable(); }
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    if (full) window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(kick);
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('xp-map-lock');
      lifted.forEach((el) => el.classList.remove('xp-lift'));
    };
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps
  return [full, setFull];
}
