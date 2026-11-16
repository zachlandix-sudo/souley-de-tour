import { useEffect, useRef } from 'react';

// A thin depth gauge on the right edge. Scroll down the page and the marker sinks, like a dive.
export default function DepthGauge() {
  const dot = useRef(null);
  const label = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (dot.current) dot.current.style.transform = `translateY(${p * 100}%)`;
      if (label.current) label.current.textContent = `${Math.round(p * 60)} m`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed right-4 top-1/2 z-40 hidden h-[36vh] -translate-y-1/2 lg:block">
      <div className="absolute inset-y-0 right-[3px] w-px bg-white mix-blend-difference" />
      <div className="absolute inset-y-0 right-0 w-[7px] opacity-70 mix-blend-difference" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #fff 0 1px, transparent 1px 12px)' }} />
      <div ref={dot} className="absolute right-[-3px] top-0 flex items-center gap-2 will-change-transform" style={{ marginTop: '-6px' }}>
        <span ref={label} className="font-sans text-[11px] font-semibold tabular-nums text-orange mix-blend-normal [text-shadow:0_0_6px_rgba(0,0,0,.35)]">0 m</span>
        <span className="h-3 w-3 rounded-full bg-orange ring-2 ring-white/70" />
      </div>
    </div>
  );
}
