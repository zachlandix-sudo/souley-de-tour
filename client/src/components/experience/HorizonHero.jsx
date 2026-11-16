import { useEffect, useRef, useState } from 'react';
import Contours from '../Contours';
import { useI18n } from '../../i18n/I18nContext';
import { PRESETS, clamp, fmt, mix, nowHour, rgb, scene } from './skyScene';

// The Experience hero and the day/night simulation as ONE section.
// The whole hero is the horizon: sky, sun, moon, stars, sea and the map's depth lines follow the hour,
// the headline sits on the sky and the clock + scrubber sit on the sea. It opens at the visitor's own time of day.
// Only gradients, opacity and transforms are used while the hour changes (no blur, no big shadows).
const STARS = Array.from({ length: 46 }, (_, i) => [(i * 97 + 13) % 100, (i * 53 + 7) % 58, 0.6 + ((i * 31) % 10) / 10, (i % 7) * 0.4]);
const WAVE = 'M0 22 Q50 0 100 22 T200 22 T300 22 T400 22 V80 H0Z';
const HORIZON = 70; // % from the top where sky meets sea

// true on phone-width screens (re-checked if the window is resized or rotated)
function useNarrow() {
  const [narrow, setNarrow] = useState(() => !!window.matchMedia?.('(max-width: 767px)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 767px)');
    if (!mq?.addEventListener) return undefined;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export default function HorizonHero() {
  const { t } = useI18n();
  const narrow = useNarrow();
  const [hour, setHour] = useState(nowHour);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const glide = (to) => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setHour(to); return; }
    const from = hour, t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 1100), e = 1 - (1 - p) ** 3;
      setHour(from + (to - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const s = scene(hour, narrow);
  const body = s.sunAlt > 0 ? { x: s.sunX, c: s.sun, a: s.sunAlt } : { x: s.moonX, c: [220, 230, 255], a: s.moonAlt * 0.45 };
  const seaTop = rgb(s.sea), seaDeep = rgb(mix(s.sea, [0, 0, 0], 0.55));

  return (
    <section aria-labelledby="exp-title" className="surface-dark relative isolate flex min-h-[46rem] flex-col overflow-hidden bg-night text-white lg:min-h-[48rem]">
      {/* the scene: decorative, follows the hour */}
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `linear-gradient(to bottom, ${rgb(s.top)}, ${rgb(s.bottom)} ${HORIZON}%)` }}>
        <svg className="absolute inset-0 h-full w-full" style={{ opacity: s.night }}>
          {STARS.map(([x, y, r, d], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="#fff" className="star" style={{ animationDelay: `${d}s` }} />)}
        </svg>

        {/* the map's depth lines: faint by day, bright at night */}
        <div className="horizon-contours absolute inset-0" style={{ opacity: 0.1 + 0.55 * s.night }}>
          <Contours seed="sacred-coasts" width={1600} height={900} levels={15} cell={28} ripple align="xMaxYMid" className="h-full w-full" />
        </div>

        <div className="absolute h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72"
          style={{ left: `${s.sunX}%`, top: `${HORIZON - 54 * s.sunAlt}%`, opacity: clamp(s.sunAlt * 4), background: `radial-gradient(circle closest-side, ${rgb(mix(s.sun, [255, 246, 208], 0.4))} 0, ${rgb(mix(s.sun, [255, 246, 208], 0.4))} 20%, ${rgb(s.sun, 0.32)} 34%, ${rgb(s.sun, 0)} 100%)` }} />
        <div className="absolute h-36 w-36 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s.moonX}%`, top: `${HORIZON - 54 * s.moonAlt}%`, opacity: clamp(s.moonAlt * 4), background: 'radial-gradient(circle closest-side, rgba(220,230,255,.5) 0, rgba(220,230,255,.5) 26%, rgba(220,230,255,.14) 40%, rgba(220,230,255,0) 100%)' }}>
          <span className="absolute inset-[34%] rounded-full bg-[#e8edf7]" style={{ boxShadow: 'inset -8px -4px 0 rgba(120,135,175,.35)' }} />
        </div>

        <div className="absolute inset-x-0 bottom-0" style={{ height: `${100 - HORIZON}%`, background: `linear-gradient(to bottom, ${seaTop}, ${seaDeep})` }}>
          <div className="absolute inset-y-0 w-[16%] -translate-x-1/2" style={{ left: `${body.x}%`, opacity: clamp(body.a * 2.2), background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${rgb(body.c, 0.6)}, ${rgb(body.c, 0)})` }} />
        </div>
        {[['top-[66%]', 9, 0.5, 0.0], ['top-[73%]', 6.5, 0.7, 0.2], ['top-[82%]', 4.5, 0.9, 0.35]].map(([pos, dur, a, fade], i) => (
          <svg key={i} viewBox="0 0 400 80" preserveAspectRatio="none" className={`wave absolute left-0 h-[30%] w-[200%] ${pos}`} style={{ animationDuration: `${dur}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
            <path d={WAVE} fill={rgb(mix(s.sea, [0, 0, 0], fade), a)} />
          </svg>
        ))}
        {/* keeps the white headline readable at noon and sunset; the strip below keeps the controls readable */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(3,8,20,.5), rgba(3,8,20,.16) 55%, rgba(3,8,20,0)), linear-gradient(to top, rgba(3,8,20,.55), rgba(3,8,20,0) 30%)' }} />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-10 pt-20 sm:px-6 sm:pt-28">
        <h1 id="exp-title" className="max-w-3xl text-[clamp(2.5rem,6vw,5.25rem)] leading-[1.03] tracking-[-0.025em] [text-shadow:0_2px_28px_rgba(0,0,0,.35)]">{t('exp.title')}</h1>
        <p className="mt-6 max-w-xl text-lg text-white/85 [text-shadow:0_1px_18px_rgba(0,0,0,.4)]">{t('exp.lead')}</p>
        <div>
          <a href="#journey" className="btn btn-primary mt-9 px-7 py-3.5">{t('exp.start')}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M12 4v16m-6-6 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>

      {/* clock and scrubber on the sea */}
      <div className="border-t border-white/15 bg-night/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-4 px-4 py-5 sm:px-6">
          <p className="font-display text-5xl leading-none tabular-nums sm:text-6xl" aria-live="off">{fmt(hour)}</p>
          <div className="min-w-[14rem] flex-1">
            <input type="range" min="0" max="23.75" step="0.25" value={Math.min(hour, 23.75)} onChange={(e) => { cancelAnimationFrame(raf.current); setHour(Number(e.target.value)); }}
              aria-label={t('dn.slide')} aria-valuetext={fmt(hour)} className="w-full accent-[#ff6a13]" />
            <div className="mt-1 flex justify-between text-xs text-white/70"><span>{t('dn.night')}</span><span>{t('dn.day')}</span><span>{t('dn.night')}</span></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(([h, label]) => <button key={label} type="button" onClick={() => glide(h)} className="btn btn-outline btn-sm tabular-nums">{label}</button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
