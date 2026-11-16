import { Link } from 'react-router-dom';
import CalmTitle from '../CalmTitle';
import Reveal from '../Reveal';
import { useI18n } from '../../i18n/I18nContext';

// "Everything for your trip, in one place": a six-tool bento on black.
// Each card carries its own small animated picture (all SVG / CSS, no images, no libraries):
//   map: contour lines draw themselves, pins pulse, a scan line sweeps   food: steam over a turning plate
//   experience: a sun slides over the sea and turns into the moon       ask: a chat that types out a plan
//   trips: a saved route that draws itself                              reviews: stars light up, photos fan out
// Cards follow the pointer (rim light, soft glow, a few degrees of tilt). Everything stops for "reduce motion".
// Words live in i18n (hp.feat.*), so the section follows the language switch.

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
    <path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/* ---------- contour lines: wobbly closed curves, built once ---------- */
const f = (n) => n.toFixed(1);
function blob(cx, cy, rx, ry, k) {
  const n = 14;
  const p = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const w = 1 + 0.13 * Math.sin(3 * a + k) + 0.07 * Math.sin(5 * a + k * 1.7) + 0.04 * Math.sin(8 * a + k * 0.6);
    return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w];
  });
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const [p0, p1, p2, p3] = [p[(i + n - 1) % n], p[i], p[(i + 1) % n], p[(i + 2) % n]];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}
const CONTOURS = [0, 1, 2, 3, 4, 5, 6].map((i) => blob(300, 170, 250 - i * 34, 140 - i * 19, i * 0.45));
const PINS = [[210, 118], [318, 92], [392, 168], [292, 214], [196, 232]];
const WAVE = 'q20 -7 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0';

/* ---------- the six little pictures ---------- */
function MapArt() {
  return (
    <>
    <svg viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice" className="tk-svg" focusable="false">
      <defs>
        <linearGradient id="tk-scan-g" x1="0" x2="1">
          <stop offset="0" stopColor="#ff6a13" stopOpacity="0" />
          <stop offset="1" stopColor="#ff6a13" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <g className="tk-breathe" fill="none" stroke="#fff">
        {CONTOURS.map((d, i) => (
          <path key={d} d={d} pathLength="1" className="tk-draw" style={{ '--i': i }} strokeOpacity={0.1 + i * 0.05} strokeWidth={i === 6 ? 1.6 : 1} />
        ))}
      </g>
      <path className="tk-route" d={`M${PINS.map((p) => p.join(' ')).join(' L')}`} fill="none" stroke="#ff6a13" strokeWidth="1.5" strokeLinejoin="round" />
      {PINS.map(([x, y], i) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <circle className="tk-pulse" style={{ '--i': i }} r="5" fill="none" stroke="#ff6a13" />
          <circle r="4.5" fill="#ff6a13" />
          <circle r="1.6" fill="#000" />
        </g>
      ))}
      <g className="tk-scan"><rect x="-120" width="120" height="340" fill="url(#tk-scan-g)" /><rect x="-1" width="1.5" height="340" fill="#ff6a13" opacity=".55" /></g>
    </svg>
    <span className="tk-coord-html">10.13° N · 124.84° E</span>
    </>
  );
}

function FoodArt() {
  return (
    <>
      <svg viewBox="0 0 160 160" className="tk-svg tk-svg--food" focusable="false">
        <g fill="none" stroke="#fff">
          <circle cx="80" cy="96" r="52" strokeOpacity=".5" />
          <circle cx="80" cy="96" r="40" strokeOpacity=".22" />
          <circle cx="80" cy="96" r="26" strokeOpacity=".14" fill="rgba(255,106,19,.08)" />
        </g>
        <g className="tk-spin"><circle cx="80" cy="96" r="64" fill="none" stroke="#ff6a13" strokeOpacity=".7" strokeDasharray="2 9" strokeLinecap="round" /><circle cx="144" cy="96" r="3.5" fill="#ff6a13" /></g>
        {[64, 80, 96].map((x, i) => (
          <path key={x} className="tk-steam" style={{ '--i': i }} d={`M${x} 62c-7-8 7-13 0-22s7-12 0-20`} fill="none" stroke="#fff" strokeOpacity=".7" strokeLinecap="round" />
        ))}
      </svg>
      <span className="tk-chip">0.4 km</span>
    </>
  );
}

function ExpArt() {
  const { t } = useI18n();
  const still = calm();
  const arc = 'M20 112 Q120 -34 220 112';
  return (
    <svg viewBox="0 0 240 160" className="tk-svg tk-svg--exp" focusable="false">
      <path d={arc} fill="none" stroke="#fff" strokeOpacity=".22" strokeDasharray="2 6" strokeLinecap="round" />
      <g className="tk-waves" fill="none" stroke="#fff">
        {[116, 124, 133].map((y, i) => (
          <path key={y} className="tk-wave" style={{ '--i': i }} d={`M-80 ${y} ${WAVE}`} strokeOpacity={0.4 - i * 0.1} />
        ))}
      </g>
      <g color="#ff6a13" transform={still ? 'translate(120 28)' : undefined}>
        <circle r="20" fill="currentColor" opacity=".16" />
        <circle r="9" fill="currentColor" />
        {!still && (
          <>
            <animateMotion dur="9s" repeatCount="indefinite" path={arc} />
            <animate attributeName="color" dur="9s" repeatCount="indefinite" values="#ff6a13;#ff6a13;#f2f2f2;#f2f2f2" keyTimes="0;.4;.6;1" />
            <animate attributeName="opacity" dur="9s" repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.08;.92;1" />
          </>
        )}
      </g>
      <line x1="20" y1="148" x2="220" y2="148" stroke="#fff" strokeOpacity=".25" />
      <circle r="4" fill="#fff" cx={still ? 120 : 20} cy="148">
        {!still && <animate attributeName="cx" dur="9s" repeatCount="indefinite" values="20;220" />}
      </circle>
      <text x="20" y="143" className="tk-coord">{t('hp.feat.exp.day')}</text>
      <text x="220" y="143" className="tk-coord" textAnchor="end">{t('hp.feat.exp.night')}</text>
    </svg>
  );
}

const PLAN = ['Sogod Bay', 'Agas-Agas Bridge', 'Lum-an Falls'];
function AskArt() {
  const { t } = useI18n();
  return (
    <div className="tk-chat">
      <p className="tk-bub tk-bub--u">{t('hp.feat.ask.q')}</p>
      <div className="tk-bub tk-bub--a">
        <span className="tk-dots"><i /><i /><i /></span>
        <ol className="tk-plan">
          {PLAN.map((p, i) => (<li key={p} style={{ '--i': i }}><b>{`0${i + 1}`}</b>{p}</li>))}
        </ol>
      </div>
    </div>
  );
}

const STOPS = ['Maasin Cathedral', 'Monte Cueva Shrine', 'Camp Danao Forest Park'];
function TripsArt() {
  return (
    <div className="tk-stops">
      <ol>
        {STOPS.map((s, i) => (<li key={s} style={{ '--i': i }}><i />{s}</li>))}
      </ol>
      <span className="tk-runner" />
    </div>
  );
}

const STAR = 'M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.5l-6.4 3.6L7 14l-5.3-5 7.2-.9z';
function ReviewsArt() {
  return (
    <div className="tk-rev">
      <svg viewBox="0 0 130 24" className="tk-stars" focusable="false">
        {[0, 1, 2, 3, 4].map((i) => (<g key={i} transform={`translate(${i * 26} 0)`}><path className="tk-star" style={{ '--i': i }} d={STAR} fill="#ff6a13" /></g>))}
      </svg>
      <div className="tk-photos">
        {[['-62px', '-9deg'], ['0px', '0deg'], ['62px', '9deg']].map(([x, r], i) => (
          <span key={x} className={`tk-photo tk-photo--${i}`} style={{ '--x': x, '--r': r }}>
            <svg viewBox="0 0 60 40" focusable="false"><circle cx="46" cy="12" r="5" /><path d="M0 40 18 14l10 12L40 8l20 32z" /></svg>
          </span>
        ))}
      </div>
    </div>
  );
}

const TOOLS = [
  { id: 'map', to: '/spots', Art: MapArt, cls: 'map' },
  { id: 'food', to: '/food', Art: FoodArt, cls: 'food' },
  { id: 'experience', to: '/experience', Art: ExpArt, cls: 'exp' },
  { id: 'ask', to: '/ask', Art: AskArt, cls: 'ask' },
  { id: 'trips', to: '/trips', Art: TripsArt, cls: 'trips' },
  { id: 'reviews', to: '/spots', Art: ReviewsArt, cls: 'reviews' },
];

// Rim light + glow follow the mouse; the card leans a few degrees toward it. Straight style writes: no re-render per move.
function track(e) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);
  if (calm()) return;
  el.style.setProperty('--ry', `${(x / r.width - 0.5) * 5}deg`);
  el.style.setProperty('--rx', `${(0.5 - y / r.height) * 4}deg`);
}
function settle(e) {
  e.currentTarget.style.removeProperty('--rx');
  e.currentTarget.style.removeProperty('--ry');
}

// A slowly turning ring of place names around a big 06.
function Ring() {
  return (
    <div className="tk-ring" aria-hidden="true">
      <svg viewBox="0 0 200 200" focusable="false">
        <defs><path id="tk-ring-path" d="M100 100m-82 0a82 82 0 1 1 164 0a82 82 0 1 1-164 0" /></defs>
        <text className="tk-ring-text"><textPath href="#tk-ring-path" textLength="510" lengthAdjust="spacing">SOULEY DE TOUR · SOUTHERN LEYTE · PHILIPPINES · </textPath></text>
      </svg>
      <span>06</span>
    </div>
  );
}

export default function FeatureShowcase() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="features-title" className="tk surface-dark">
      <div className="tk-aurora" aria-hidden="true" />
      <div className="tk-grain" aria-hidden="true" />
      <div className="tk-wrap">
        <Reveal className="tk-head">
          <div>
            <p className="tk-kicker">{t('hp.feat.kicker')} · 01—06</p>
            <CalmTitle as="h2" id="features-title" className="tk-h2" text={t('hp.feat.title')} />
            <p className="tk-lead">{t('hp.feat.lead')}</p>
          </div>
          <Ring />
        </Reveal>
        <ul className="tk-grid">
          {TOOLS.map(({ id, to, Art, cls }, i) => (
            <Reveal as="li" key={id} delay={[0, 0.12, 0.24, 0, 0.12, 0.24][i]} className={`tk-cell tk-cell--${cls}`}>
              <Link to={to} className="tk-card" onPointerMove={track} onPointerLeave={settle}>
                <span className="tk-num" aria-hidden="true">{`0${i + 1}`}</span>
                <div className="tk-art" aria-hidden="true"><Art /></div>
                <div className="tk-copy">
                  <h3 className="tk-title">{t(`hp.feat.${id}.title`)}</h3>
                  <p className="tk-text">{t(`hp.feat.${id}.body`)}</p>
                  <span className="tk-cta">{t(`hp.feat.${id}.cta`)}<span className="tk-go"><Arrow /></span></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
