import { useMemo } from 'react';
import { contourPaths } from '../utils/contours';

// Decorative depth lines. Pass a seed for a repeatable map; `ripple` fades the lines in from the deep end once.
// `accent` = the index of ONE line to highlight (it gets a soft halo line underneath and the classes .accent-glow / .accent; the look is in index.css).
// Lines come out in a fixed order for a given seed/size/levels/cell, so the index is stable: if you change those, pick the index again.
export default function Contours({ seed = 'souley', width = 1600, height = 900, levels = 14, cell, ripple = false, align = 'xMidYMid', terrain = false, draw = false, accent = -1, className = '' }) {
  const paths = useMemo(() => contourPaths({ seed, width, height, levels, cell, terrain }), [seed, width, height, levels, cell, terrain]);
  const max = levels;
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio={`${align} slice`}
      className={`contours ${ripple ? 'contours-ripple' : ''} ${draw ? 'contours-draw' : ''} ${className}`}>
      {paths.map((p, i) => {
        const style = ripple ? { '--i': max - p.level } : draw ? { '--i': p.level } : undefined;
        const line = <path key={i} d={p.d} className={[p.major ? 'major' : '', i === accent ? 'accent' : ''].filter(Boolean).join(' ') || undefined} pathLength={draw ? 1 : undefined} style={style} />;
        return i === accent
          ? [<path key={`${i}-glow`} d={p.d} className="accent-glow" pathLength={draw ? 1 : undefined} style={style} />, line]
          : line;
      })}
    </svg>
  );
}
