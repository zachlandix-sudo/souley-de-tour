import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// An orange line sweeps across the top of the screen whenever the page changes.
export default function RouteSweep() {
  const { pathname } = useLocation();
  const first = useRef(true);
  const [n, setN] = useState(0);
  useEffect(() => { if (first.current) { first.current = false; return; } setN((x) => x + 1); }, [pathname]);
  return n ? <div key={n} aria-hidden="true" className="route-sweep" /> : null;
}
