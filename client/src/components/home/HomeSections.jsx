import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import CalmTitle from '../CalmTitle';
import { easeOutQuart } from '../../utils/motion';
import TripCard from './TripCard';
import LiveContours from '../LiveContours';
import { Link } from 'react-router-dom';
import ScrollLitText from '../ScrollLitText';
import ScrollMarquee from '../ScrollMarquee';
import PassportPage from './PassportPage';
import Reveal from '../Reveal';
import FeatureShowcase from './FeatureShowcase';
import TownsExplorer from './TownsExplorer';
import TravelJourney from './TravelJourney';
import { useI18n } from '../../i18n/I18nContext';

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
    <path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const spotsIn = (town) => `/spots?municipality=${encodeURIComponent(town)}`;


// Numbers count up once, when they scroll into view.
// The layout effect sets the start value (0) before the first paint, so the final number never flashes and then drops to 0.
// The count waits until the number is well inside the screen (the Reveal around it fades in at about the same moment),
// uses a long soft landing, and skips frames whose rounded value did not change. tabular-nums keeps the digits from
// jittering sideways while they change.
function CountUp({ to, suffix = '' }) {
  const ref = useRef(null);
  const [v, setV] = useState(to);
  const [done, setDone] = useState(false);
  useLayoutEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    setV(0);
    let raf = 0, shown = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / 1700, 1);
        const next = Math.round(to * easeOutQuart(p));
        if (next !== shown) { shown = next; setV(next); }
        if (p < 1) raf = requestAnimationFrame(step); else setDone(true);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  // data-to lets the CSS reserve the width of the final number, so the plus sign never slides while the digits count.
  return <span ref={ref} className={`tabular-nums ${done ? 'hp-done' : ''}`}><span className="hp-num" data-to={to}>{v}</span>{suffix && <span className="hp-stat-plus">{suffix}</span>}</span>;
}

/* ---------- numbers strip ---------- */
const STATS = [['100', 'hp.stat.spots'], ['200', 'hp.stat.food'], ['18', 'hp.stat.towns'], ['3', 'hp.stat.langs']];

// The card's light follows the pointer (CSS reads --mx / --my).
const glow = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

// Floating embers: position and timing only; the motion itself is CSS (transform + opacity).
const EMBERS = [[8, 0, 14], [19, 3.2, 18], [31, 1.4, 16], [44, 5.1, 20], [57, 2.2, 15], [68, 6.3, 19], [79, 0.8, 17], [91, 4.0, 14]];

export function StatsStrip() {
  const { t } = useI18n();
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  // One observer for the whole section: it starts the background, the light trail and the beacon together.
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} aria-labelledby="stats-title" className={`hp-sec border-b border-line ${seen ? 'is-seen' : ''}`}>
      <div className="hp-sec-bg" aria-hidden="true">
        <svg className="hp-routes" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" fill="none">
          <path d="M-20 330C140 280 230 360 380 300S600 150 760 210 1010 330 1230 190" />
          <path d="M-20 120C110 160 250 70 420 110S690 250 860 150 1100 60 1230 100" />
          <g className="hp-nodes"><circle cx="380" cy="300" r="3.5" /><circle cx="760" cy="210" r="3.5" /><circle cx="420" cy="110" r="3.5" /><circle cx="860" cy="150" r="3.5" /></g>
        </svg>
        <span className="hp-aura" />
        {EMBERS.map(([x, d, dur], i) => <i key={i} className="hp-ember" style={{ '--x': `${x}%`, '--d': `${d}s`, '--t': `${dur}s` }} />)}
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 id="stats-title" className="sr-only">{t('hp.stat.title')}</h2>
        <dl className="hp-stats">
          {STATS.map(([n, key], i) => (
            <Reveal key={key} delay={i * 0.14} className="hp-stat" onPointerMove={glow}>
              <dt>{t(key)}</dt>
              <dd className="font-display leading-none"><CountUp to={Number(n)} suffix={n !== '3' && n !== '18' ? '+' : ''} /></dd>
            </Reveal>
          ))}
        </dl>
        <p className="hp-note mt-8 max-w-2xl text-sm text-muted">{t('hp.stat.note')}</p>
        <div className="hp-beacon" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}

/* ---------- about / why ---------- */
export function WhySouthernLeyte() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="why-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr]">
        <Reveal>
          <p className="lux-shimmer text-sm font-semibold uppercase tracking-widest text-ember">{t('hp.why.kicker')}</p>
          <CalmTitle as="h2" id="why-title" className="mt-3 text-4xl sm:text-5xl" text={t('hp.why.title')} />
        </Reveal>
        <div className="space-y-5 text-lg text-muted">
          <ScrollLitText text={t('hp.why.p1')} className="font-display text-3xl leading-snug text-ink sm:text-4xl" />
          <Reveal as="p" delay={0.1}>{t('hp.why.p2')}</Reveal>
          <Reveal as="p" delay={0.2}>{t('hp.why.p3')}</Reveal>
          <Link to="/spots" className="btn btn-dark mt-2 inline-flex items-center gap-2">{t('hp.why.cta')} <Arrow /></Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- how it works: scroll-pinned dive, see HowItWorks.jsx ---------- */
export { default as HowItWorks } from './HowItWorks';

/* ---------- feature grid: "Everything for your trip, in one place" (see FeatureShowcase.jsx) ---------- */
export function FeatureGrid() {
  return <FeatureShowcase />;
}

/* ---------- towns ---------- */
const TOWNS = [
  ['Maasin City', 'maasin', 'Maasin Cathedral · Monte Cueva Shrine · Camp Danao Forest Park'],
  ['Padre Burgos', 'burgos', "Tangka-an Point · Adrien's Cove · Likay-Likay Beach"],
  ['Limasawa', 'limasawa', 'First Cross Monument · Dakdak Beach · Limasawa Island Lagoon'],
  ['Silago', 'silago', 'Kagut-an Falls · Tubod Falls and Cave · Silago Beach'],
  ['Macrohon', 'macrohon', 'Seven Falls · Cambaro Cave · Florencia Island'],
  ['Pintuyan', 'pintuyan', 'Son-ok Marine Sanctuary · Dan-an Falls · Caningag Viewpoint'],
  ['Sogod', 'sogod', 'Sogod Bay · Agas-Agas Bridge · Lum-an Falls'],
  ['Hinunangan', 'hinunangan', 'San Pedro Island · Mount Nacolod · Golden Sand Beach'],
];

// "Explore by town": the 3D map of Southern Leyte (see TownsExplorer.jsx). The "See spots" button lives in the box that opens when a town is picked.
export function TownsGrid() {
  return <TownsExplorer spotsIn={spotsIn} Arrow={Arrow} />;
}

/* ---------- trip ideas ---------- */
const TRIPS = [
  ['maasin', 'Maasin City', 'Maasin Cathedral → Monte Cueva Shrine → Camp Danao Forest Park → Bogo Bird Paradise'],
  ['dive', 'Padre Burgos', "Tangka-an Point Dive Site → Adrien's Cove and Gunter's Wall → Santa Sofia Dive Site → Son-ok Marine Sanctuary"],
  ['island', 'Limasawa', 'National Shrine of the First Mass → First Cross Monument → Dakdak Beach → Limasawa Island Lagoon'],
  ['falls', 'Silago', 'Kagut-an Falls → Tubod Falls and Cave → Silago Beach → Seven Falls (Macrohon)'],
];

export function TripIdeas() {
  const { t } = useI18n();
  const root = useRef(null);

  // One passive scroll reader, coalesced into a frame: it writes --p (-1..1, how far each card is from the middle of
  // the screen, for the parallax layers) and --rail (0..1 down the grid, for the thread and its turning marker).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const grid = el.querySelector('.trip-grid');
    const items = [...el.querySelectorAll('.trip-item')];
    let raf = 0;
    const apply = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const g = grid.getBoundingClientRect();
      el.style.setProperty('--rail', Math.min(1, Math.max(0, (vh * 0.55 - g.top) / (g.height + vh * 0.1))).toFixed(4));
      for (const it of items) {
        const r = it.getBoundingClientRect();
        it.style.setProperty('--p', Math.min(1, Math.max(-1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2))).toFixed(3));
      }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); };
  }, []);

  // The ambient loops (orbs, compass, embers, sparks) only run while the section is near the screen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-idle', !e.isIntersecting), { rootMargin: '160px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={root} aria-labelledby="ideas-title" className="ideas">
      <LiveContours seed="ideas-bg" width={1600} height={1100} levels={10} cell={30} alignX={0.5} hoverOnly className="ideas-bg" />
      <span aria-hidden="true" className="ideas-orb ideas-orb--a" />
      <span aria-hidden="true" className="ideas-orb ideas-orb--b" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="ideas-head">
          <div>
            <CalmTitle as="h2" id="ideas-title" className="text-4xl sm:text-6xl" text={t('hp.ideas.title')} />
            <p className="ideas-lead mt-3 max-w-xl">{t('hp.ideas.lead')}</p>
          </div>
          <svg aria-hidden="true" viewBox="0 0 120 120" className="ideas-compass">
            <circle className="ideas-compass-ring" cx="60" cy="60" r="54" />
            <circle cx="60" cy="60" r="40" />
            {Array.from({ length: 16 }, (_, k) => <path key={k} d="M60 8v7" transform={`rotate(${k * 22.5} 60 60)`} />)}
            <g className="ideas-needle"><path d="m60 22 7 38H53Z" className="n" /><path d="m60 98-7-38h14Z" /></g>
            <circle className="ideas-hub" cx="60" cy="60" r="3.2" />
          </svg>
        </Reveal>
        <div className="ideas-track" aria-hidden="true"><i className="ideas-track-run" /><b className="ideas-track-mark" /></div>
        <div className="ideas-stage">
          <span aria-hidden="true" className="ideas-rail"><i className="ideas-rail-fill" /><b className="ideas-rail-mark" /></span>
          <ul className="trip-grid">
            {TRIPS.map(([id, town, route], i) => <TripCard key={id} id={id} index={i} route={route} town={town} to={spotsIn(town)} />)}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- travel tips: "Good to know before you go" (a five-stage trip journey) ---------- */
export function TravelTips() {
  return <TravelJourney />;
}

/* ---------- FAQ ---------- */
const FAQ = ['free', 'account', 'ai', 'food', 'offline', 'lang', 'review'];

export function FaqSection() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="faq-title" className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[4fr_8fr]">
        <Reveal as="h2" id="faq-title" className="text-4xl sm:text-5xl">{t('hp.faq.title')}</Reveal>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((id) => (
            <details key={id} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                {t(`hp.faq.${id}.q`)}
                <span aria-hidden="true" className="text-2xl text-orange transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-muted">{t(`hp.faq.${id}.a`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- closing call to action ---------- */
export function AskCta() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="cta-title" className="surface-dark bg-night text-white">
      <Reveal className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <CalmTitle as="h2" align="center" id="cta-title" className="mx-auto max-w-3xl text-4xl sm:text-6xl" text={t('hp.cta.title')} />
        <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">{t('hp.cta.body')}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link to="/ask" className="btn btn-primary">{t('hp.cta.ask')}</Link>
          <Link to="/register" className="btn btn-outline">{t('hp.cta.join')}</Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Leyte Passport teaser ---------- */
export function PassportTeaser() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="passport-teaser-title" className="border-y border-line bg-paper">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[auto_1fr] md:items-center md:gap-14">
        <PassportPage />
        <div>
          <CalmTitle as="h2" id="passport-teaser-title" className="text-4xl sm:text-5xl" text={t('passport.teaser.title')} />
          <p className="mt-4 max-w-xl text-lg text-muted">{t('passport.teaser.body')}</p>
          <Link to="/passport" className="btn btn-dark mt-6 inline-flex items-center gap-2">{t('passport.teaser.cta')} <Arrow /></Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- giant sliding place names ---------- */
export function TownsMarquee() {
  // Just enough breathing room: a slim strip above the band so it does not fuse with the black "how it works"
  // section (was up to 7rem, which read as a big empty gap), and a small one below before the passport teaser.
  return (
    <div className="bg-paper pb-[clamp(1.5rem,3vw,2.5rem)] pt-[clamp(1rem,2.2vw,1.75rem)]">
      <ScrollMarquee items={TOWNS.map(([name]) => name)} />
    </div>
  );
}
