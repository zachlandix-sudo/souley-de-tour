import { useEffect, useRef, useState } from 'react';
import CalmTitle from '../CalmTitle';
import Contours from '../Contours';
import { damp, frameDt } from '../../utils/motion';
import { useI18n } from '../../i18n/I18nContext';

// "How SOULEY de Tour works": the three steps as a dive.
// The section pins to the screen on desktop and scrolling lowers a glowing node down a spine, like the dive gauge on the
// edge of the page. Each step lights up as the node reaches it, the current step's name slides into a quiet readout, and a bloom of light
// follows the node. On phones nothing pins: the same node simply travels down the list as you scroll past it.
// With "reduce motion" (or without IntersectionObserver, as in tests) nothing moves: all three steps are lit and static.
// The words live in i18n (hp.how.*), so the language switch keeps working.
const STEPS = [1, 2, 3];
const THRESHOLDS = [0, 0.5, 1]; // where on the spine each step sits
const MAX_DEPTH = 60; // metres shown beside the node, matching the page's depth gauge
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

const ICONS = {
  1: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M12 8.5l1.6 2.9 2.9 1.6-2.9 1.6L12 17.5l-1.6-2.9L7.5 13l2.9-1.6z" />,
  2: <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zM12 8.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6z" />,
  3: <path d="M6 4h12v17l-6-4.2L6 21zM9.5 9h5" />,
};

export default function HowItWorks() {
  const { t } = useI18n();
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const dotRefs = useRef([]);
  const depthRef = useRef(null);
  const [still] = useState(() => typeof window === 'undefined' || typeof IntersectionObserver === 'undefined' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [lit, setLit] = useState(still ? 3 : 1); // how many steps are lit (the node has reached them)

  useEffect(() => {
    if (still) return undefined;
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return undefined;

    const pinned = () => window.matchMedia?.('(min-width: 768px)').matches;
    let ys = [0, 1, 2]; // centre of each step's dot, measured from the top of the track
    let target = 0;
    let cur = 0;
    let raf = 0;
    let litNow = 1;

    const measure = () => {
      const top = track.getBoundingClientRect().top;
      ys = dotRefs.current.map((el) => (el ? el.getBoundingClientRect().top - top + el.offsetHeight / 2 : 0));
    };
    const read = () => {
      const vh = window.innerHeight;
      if (pinned()) {
        const r = root.getBoundingClientRect();
        target = clamp(-r.top / Math.max(1, r.height - vh));
      } else {
        const tr = track.getBoundingClientRect();
        target = clamp((vh * 0.62 - tr.top - ys[0]) / Math.max(1, ys[2] - ys[0]));
      }
    };
    const apply = (p) => {
      const y = ys[0] + p * (ys[2] - ys[0]);
      root.style.setProperty('--p', p.toFixed(4));
      root.style.setProperty('--y', `${y.toFixed(1)}px`);
      root.style.setProperty('--y0', `${ys[0].toFixed(1)}px`);
      if (depthRef.current) depthRef.current.textContent = `${Math.round(p * MAX_DEPTH)} m`;
      const n = THRESHOLDS.filter((th) => p >= th - 0.04).length;
      if (n !== litNow) { litNow = n; setLit(n); }
    };
    let prev = 0;
    const frame = (now) => {
      raf = 0;
      const dt = frameDt(prev, now); prev = now;
      cur += (target - cur) * damp(0.12, dt); // the node glides after the scroll rather than snapping to it (same pace at any refresh rate)
      if (Math.abs(target - cur) < 0.0006) cur = target;
      apply(cur);
      if (cur !== target) raf = requestAnimationFrame(frame); else prev = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onScroll = () => { read(); kick(); };
    const onResize = () => { measure(); read(); kick(); };

    measure();
    read();
    cur = target;
    apply(cur);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // Fonts and the CalmTitle settling can move the dots a little after mount, so measure once more shortly after.
    const settle = setTimeout(onResize, 600);
    return () => {
      clearTimeout(settle);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [still]);

  const active = Math.max(0, lit - 1);

  return (
    <section ref={rootRef} aria-labelledby="how-title" className={`hw ${still ? 'is-still' : ''}`} style={still ? { '--p': 1 } : undefined}>
      <div className="hw-pin">
        <Contours seed="limasawa" width={1600} height={900} levels={12} cell={26} className="hw-contours" />
        <div className="hw-grain" aria-hidden="true" />

        <div className="hw-wrap">
          <div className="hw-head">
            <span className="hw-kicker">{t('hp.how.kicker')}</span>
            <CalmTitle as="h2" id="how-title" className="hw-title" text={t('hp.how.title')} />
            <p className="hw-lead">{t('hp.how.lead')}</p>

            <div className="hw-now" aria-hidden="true">
              <div className="hw-ticks">
                {STEPS.map((n, i) => <i key={n} className={lit > i ? 'is-on' : ''} />)}
              </div>
              <div className="hw-now-window">
                <div className="hw-now-col" style={{ transform: `translateY(-${(active * 100) / STEPS.length}%)` }}>
                  {STEPS.map((n) => <em key={n}>{t(`hp.how.s${n}.title`)}</em>)}
                </div>
              </div>
            </div>
          </div>

          <div className="hw-track" ref={trackRef}>
            <div className="hw-spine" aria-hidden="true"><i className="hw-fill" /></div>
            <div className="hw-bloom" aria-hidden="true" />
            <div className="hw-node" aria-hidden="true">
              <span className="hw-node-core" />
              <span className="hw-node-depth" ref={depthRef}>0 m</span>
            </div>

            <ol className="hw-steps">
              {STEPS.map((n, i) => (
                <li key={n} className={`hw-step ${lit > i ? 'is-lit' : ''} ${active === i ? 'is-active' : ''}`}>
                  <span className="hw-dot" ref={(el) => { dotRefs.current[i] = el; }} aria-hidden="true" />
                  <div className="hw-card">
                    <span className="hw-medal" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="hw-icon">
                        {ICONS[n] && <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</g>}
                      </svg>
                    </span>
                    <div className="hw-body">
                      <h3>{t(`hp.how.s${n}.title`)}</h3>
                      <p>{t(`hp.how.s${n}.body`)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
