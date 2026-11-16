import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Contours from '../Contours';
import { useI18n } from '../../i18n/I18nContext';
import { JOURNEY, STAGE, activeIndex, cameraAt, headAt, journeyT, progressForStep, progressFromScroll, projectTowns, segmentFill, segmentPath } from '../../utils/townRoute';

const BLEED = 520; // extra chart around the stage, in px
const STEP_VH = 50; // screens of scrolling between one town and the next, in percent of the screen height
const pad2 = (n) => String(n).padStart(2, '0');
const stateOf = (i, active) => (i === active ? 'active' : i < active ? 'passed' : 'ahead');

// Town names rise word by word out of a mask whenever the town changes.
function RisingName({ text }) {
  const words = text.split(' ');
  return (
    <span>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.14em] align-bottom" style={{ marginBottom: '-0.14em' }}>
          <span className="journey-word inline-block" style={{ animationDelay: `${i * 0.08}s` }}>{w}{i < words.length - 1 ? ' ' : ''}</span>
        </span>
      ))}
    </span>
  );
}

// The pinned journey (laptops and desktops). While you scroll the section stays on the screen: an orange line draws itself from
// town to town over a depth chart, the camera follows its tip, and the current town's name and spots appear on the left.
// Scrolling back up undoes the line. Only transforms and line offsets change while scrolling, so it stays light.
export default function TownJourney({ towns, spotsIn, Arrow }) {
  const { t } = useI18n();
  const n = JOURNEY.length;
  const points = useMemo(() => projectTowns(JOURNEY, STAGE), []);
  const legs = useMemo(() => points.slice(0, -1).map((a, i) => segmentPath(a, points[i + 1], i)), [points]);
  const info = useMemo(() => JOURNEY.map((id) => towns.find((x) => x[1] === id)), [towns]);
  const [active, setActive] = useState(0);
  const sec = useRef(null), cam = useRef(null), tip = useRef(null), bar = useRef(null), drawn = useRef([]);

  useEffect(() => {
    const el = sec.current;
    let raf = 0, live = false, last = -1;
    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const tt = journeyT(progressFromScroll(r.top, r.height, window.innerHeight), n);
      drawn.current.forEach((p, i) => { if (p) p.style.strokeDashoffset = String(1 - segmentFill(tt, i)); });
      const c = cameraAt(points, tt), h = headAt(points, tt);
      cam.current.style.transform = `translate3d(${(-c.x * c.scale).toFixed(1)}px, ${(-c.y * c.scale).toFixed(1)}px, 0) scale(${c.scale.toFixed(4)})`;
      tip.current.setAttribute('cx', h.x.toFixed(1)); tip.current.setAttribute('cy', h.y.toFixed(1));
      bar.current.style.transform = `scaleX(${(tt / (n - 1)).toFixed(4)})`;
      const idx = activeIndex(tt, n);
      if (idx !== last) { last = idx; setActive(idx); }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    if (typeof IntersectionObserver === 'undefined') return () => cancelAnimationFrame(raf);
    // Listen to the scroll only while the section is on (or near) the screen.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !live) { live = true; window.addEventListener('scroll', kick, { passive: true }); window.addEventListener('resize', kick); kick(); }
      else if (!e.isIntersecting && live) { live = false; window.removeEventListener('scroll', kick); window.removeEventListener('resize', kick); }
    }, { rootMargin: '150px 0px' });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('scroll', kick); window.removeEventListener('resize', kick); };
  }, [points, n]);

  // The little numbered ticks double as navigation (and as the way in for keyboard users).
  const go = (i) => {
    const r = sec.current.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top + progressForStep(i, n) * (r.height - window.innerHeight), behavior: 'smooth' });
  };
  const [name, id, picks] = info[active];

  return (
    <section ref={sec} aria-labelledby="towns-title" className="surface-dark relative border-t border-white/15 bg-night text-white" style={{ height: `calc(100svh + ${(n - 1) * STEP_VH}svh)` }}>
      <div className="sticky top-0 grid h-svh min-h-[620px] overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative z-10 flex flex-col justify-between px-8 pb-10 pt-24 xl:pl-[max(2rem,calc((100vw_-_80rem)/2_+_1.5rem))]">
          <div>
            <h2 id="towns-title" className="text-2xl sm:text-3xl">{t('hp.towns.title')}</h2>
            <p className="mt-2 max-w-sm text-sm text-white/65">{t('hp.towns.lead')}</p>
          </div>

          <div key={active} aria-live="polite">
            <h3 className="font-display text-[clamp(3.4rem,7.4vw,7.2rem)] leading-[0.95] tracking-[-0.03em]"><RisingName text={name} /></h3>
            <p className="journey-fade mt-5 text-lg font-semibold text-orange">{t(`hp.towns.${id}`)}</p>
            <p className="journey-fade mt-2 max-w-md text-white/70">{picks}</p>
            <Link to={spotsIn(name)} className="journey-fade btn btn-primary mt-7 inline-flex items-center gap-2">{t('hp.towns.see')} <Arrow /></Link>
          </div>

          <nav aria-label={t('hp.towns.title')}>
            <p className="font-display text-3xl tabular-nums" aria-hidden="true">{pad2(active + 1)} <span className="text-white/35">/ {pad2(n)}</span></p>
            <ol className="mt-4 flex gap-1">
              {info.map(([tn], i) => (
                <li key={tn} className="flex-1">
                  <button type="button" onClick={() => go(i)} aria-label={tn} aria-current={i === active ? 'step' : undefined} className="group block w-full py-2">
                    <span className={`block h-px transition-colors ${i === active ? 'bg-white' : 'bg-white/25 group-hover:bg-white/60'}`} />
                  </button>
                </li>
              ))}
            </ol>
            <span aria-hidden="true" className="mt-1 block h-0.5 bg-white/15"><span ref={bar} className="block h-0.5 origin-left bg-orange" style={{ transform: 'scaleX(0)' }} /></span>
          </nav>
        </div>

        <div className="relative hidden overflow-hidden lg:block" aria-hidden="true">
          <div ref={cam} className="journey-cam">
            {/* much bigger than the stage, so the chart never runs out wherever the camera goes */}
            <div className="journey-layer absolute" style={{ '--contour': '#9a4210', left: -BLEED, top: -BLEED, width: STAGE.width + 2 * BLEED, height: STAGE.height + 2 * BLEED }}>
              <Contours seed="sogod-bay" width={STAGE.width + 2 * BLEED} height={STAGE.height + 2 * BLEED} levels={14} cell={26} terrain className="absolute inset-0 h-full w-full" />
            </div>
            <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} className="journey-layer absolute inset-0 h-full w-full" fill="none">
              {legs.map((d, i) => <path key={`g${i}`} d={d} className="jghost" />)}
              {legs.map((d, i) => <path key={`l${i}`} ref={(el) => { drawn.current[i] = el; }} d={d} pathLength="1" className="jroute" style={{ strokeDashoffset: 1 }} />)}
              {points.map((p, i) => (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r="8" className="jd" data-state={stateOf(i, active)} />
                  <text x={p.x + 18} y={p.y + 7} className="jl" data-state={stateOf(i, active)}>{info[i][0]}</text>
                </g>
              ))}
              <circle ref={tip} cx={points[0].x} cy={points[0].y} r="6" className="jtip" />
            </svg>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-night to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-night to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-night to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-night to-transparent" />
        </div>
      </div>
    </section>
  );
}

// Phones, tablets and "reduce motion": the same route as a small picture that draws itself once when it scrolls into view.
export function RouteSketch({ towns }) {
  const points = useMemo(() => projectTowns(JOURNEY, STAGE), []);
  const legs = useMemo(() => points.slice(0, -1).map((a, i) => segmentPath(a, points[i + 1], i)), [points]);
  const names = useMemo(() => JOURNEY.map((id) => towns.find((x) => x[1] === id)[0]), [towns]);
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className={`route-sketch ${shown ? 'is-in' : ''} surface-dark relative mx-auto mt-10 aspect-[5/6] w-full max-w-md overflow-hidden bg-night`} style={{ '--contour': '#9a4210' }}>
      <Contours seed="sogod-bay" width={STAGE.width} height={STAGE.height} levels={14} cell={26} terrain className="absolute inset-0 h-full w-full" />
      <svg viewBox="100 120 800 860" className="absolute inset-0 h-full w-full" fill="none">
        {legs.map((d, i) => <path key={i} d={d} pathLength="1" className="jroute seg" style={{ '--i': i }} />)}
        {points.map((p, i) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r="9" className="sketch-dot" style={{ '--i': i }} />
            <text x={p.x + 20} y={p.y + 8} className="sketch-label" style={{ '--i': i }}>{names[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
