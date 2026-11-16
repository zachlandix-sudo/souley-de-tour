import { useEffect, useRef, useState } from 'react';
import StampMark from '../passport/StampMark';

// A passport page on the home page. When it scrolls into view, four stamps slam down one after another
// (ink ring, flying specks, a little thud). The card tilts toward the pointer, and a click stamps it all again.
const STAMPS = [
  { town: 'Maasin', day: 12, mon: 'Oct', tilt: -8, shape: 'round', ink: '#b53f08', method: 'gps' },
  { town: 'Sogod', day: 3, mon: 'Nov', tilt: 6, shape: 'scallop', ink: '#0e6b7a', method: 'gps' },
  { town: 'Limasawa', day: 21, mon: 'Oct', tilt: -4, shape: 'octagon', ink: '#3d3f94', method: 'manual' },
  { town: 'Silago', day: 28, mon: 'Dec', tilt: 9, shape: 'rect', ink: '#2e6b3b', method: 'gps' },
];
const STEP = 0.6;

export default function PassportPage() {
  const root = useRef(null);
  const card = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle (hidden) -> play (slamming) | static (reduce motion / no observer)
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') { setPhase('static'); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPhase('play'); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(root.current);
    return () => io.disconnect();
  }, []);

  const canTilt = () => phase === 'play' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => {
    if (!canTilt()) return;
    const b = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
    card.current.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg)`;
    card.current.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
    card.current.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => { if (card.current) card.current.style.transform = ''; };
  const restamp = () => { if (phase !== 'static') { setRun((r) => r + 1); setPhase('play'); } };

  return (
    <div ref={root} aria-hidden="true" onPointerMove={onMove} onPointerLeave={onLeave} onClick={restamp} className="w-72 shrink-0 select-none [perspective:900px]">
      <div ref={card} className="relative border border-line bg-white p-5 shadow-[0_18px_40px_-18px_rgba(0,0,0,.35)] transition-transform duration-200 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
        <span className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 25%), rgba(255, 106, 19, .12), transparent 55%)' }} />
        <div className="flex items-center justify-between border-b border-dashed border-line pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          <span>Passport</span><span className="text-ember">SOULEY</span>
        </div>
        <div key={run} className="mt-4 grid grid-cols-2 place-items-center gap-x-2 gap-y-5">
          {STAMPS.map(({ town, day, mon, tilt, shape, ink, method }, i) => {
            const delay = `${0.25 + i * STEP}s`;
            const play = phase === 'play';
            return (
              <span key={town} className={`relative h-[7.4rem] w-[7.4rem] ${play ? 'stamp-thud' : ''}`} style={play ? { animationDelay: delay } : undefined}>
                <span
                  style={{ '--tilt': `${tilt}deg`, transform: 'rotate(var(--tilt))', opacity: phase === 'idle' ? 0 : undefined, animationDelay: play ? delay : undefined }}
                  className={`pp-ink-mark block h-full w-full ${play ? 'stamp-slam' : ''}`}>
                  <StampMark shape={shape} ink={ink} seed={i * 11 + 5} town={town} day={day} mon={mon} year="2026" method={method} />
                </span>
                {play && (
                  <>
                    <span style={{ borderColor: ink, animationDelay: delay }} className="stamp-ink pointer-events-none absolute inset-0 rounded-full border-2" />
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <span key={k} className="stamp-speck pointer-events-none absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full" style={{ '--a': `${k * 60 + i * 17}deg`, animationDelay: delay, background: ink }} />
                    ))}
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
