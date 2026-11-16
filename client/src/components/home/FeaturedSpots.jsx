import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CalmTitle from '../CalmTitle';
import Contours from '../Contours';
import Reveal from '../Reveal';
import Loading from '../Loading';
import ErrorState from '../ErrorState';
import EmptyState from '../EmptyState';
import SpotImage from '../SpotImage';
import PhotoReveal from '../PhotoReveal';
import { useI18n } from '../../i18n/I18nContext';

// Homepage "Featured spots": a dark gallery. The first spot is the big lead card, the rest tile around it
// (layout adapts to 1-5 spots, see .fs-grid[data-n] in index.css). On a mouse the cards tilt toward the pointer and an
// ember light follows it; the short description of the small cards opens on hover. On touch / reduce-motion nothing
// tilts and everything stays visible. All look lives in index.css, block "featured spots gallery".

const Arrow = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
);
const Pin = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
);

const pad = (n) => String(n).padStart(2, '0');
const canTilt = () => typeof window !== 'undefined'
  && !!window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function FeaturedCard({ spot, index }) {
  const { t } = useI18n();
  const card = useRef(null);
  const photo = useRef(null);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const move = (e) => {
    const el = card.current;
    if (!el || e.pointerType !== 'mouse' || !canTilt()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      el.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
    });
  };
  const leave = () => {
    cancelAnimationFrame(raf.current);
    card.current?.style.setProperty('--rx', '0deg');
    card.current?.style.setProperty('--ry', '0deg');
  };
  // Same photo morph into the spot page as the normal SpotCard.
  const tag = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !photo.current) return;
    photo.current.style.viewTransitionName = 'spot-photo';
    setTimeout(() => { if (photo.current) photo.current.style.viewTransitionName = ''; }, 1200);
  };

  const cat = spot.categoryIds?.find((c) => c && typeof c === 'object' && c.name)?.name;
  const rated = spot.reviewCount > 0 && Number(spot.averageRating) > 0;
  const meta = [spot.difficulty && t(`hp.fs.${spot.difficulty}`), spot.recommendedDuration, spot.entranceFee].filter(Boolean).slice(0, 3);

  return (
    <Link ref={card} to={`/spots/${spot.slug}`} viewTransition state={{ vt: true }} onClick={tag} onPointerMove={move} onPointerLeave={leave} className={`fs-card ${index === 0 ? 'is-lead' : ''}`}>
      <div ref={photo} className="fs-photo">
        <PhotoReveal seed={spot.slug || spot.name}>
          <SpotImage src={spot.images?.[0]} fallbacks={spot.images?.slice(1)} slug={spot.slug} alt={spot.name} className="h-full w-full" />
        </PhotoReveal>
      </div>
      <span aria-hidden="true" className="fs-shade" />
      <span aria-hidden="true" className="fs-glow" />
      <span aria-hidden="true" className="fs-ring" />
      <span aria-hidden="true" className="fs-num">{pad(index + 1)}</span>
      <div className="fs-top">
        <span className="fs-pill"><Pin />{spot.municipality}</span>
        {rated && <span className="fs-pill fs-rate"><b aria-hidden="true">★</b>{Number(spot.averageRating).toFixed(1)}</span>}
      </div>
      <div className="fs-body">
        {cat && <span className="fs-cat">{cat}</span>}
        <h3 className="fs-name">{spot.name}</h3>
        {spot.shortDescription && <p className="fs-desc">{spot.shortDescription}</p>}
        <div className="fs-foot">
          <ul className="fs-meta">{meta.map((m) => <li key={m}>{m}</li>)}</ul>
          <span aria-hidden="true" className="fs-go"><Arrow /></span>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedSpots({ spots = [], loading, error, retry }) {
  const { t } = useI18n();
  const n = Math.min(spots.length, 5);
  return (
    <section className="fs surface-dark relative isolate overflow-hidden bg-night text-white" aria-labelledby="featured-title">
      <Contours seed="featured-gallery" width={1600} height={1000} levels={13} cell={26} className="fs-contours absolute inset-0 -z-10 h-full w-full" />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="fs-head">
          <div>
            <p className="fs-kicker">{t('hp.fs.kicker')}</p>
            <CalmTitle as="h2" id="featured-title" className="mt-4 text-4xl sm:text-6xl" text={t('home.featured')} />
            <p className="mt-5 max-w-xl text-white/70">{t('hp.fs.lead')}</p>
          </div>
          <Link to="/spots" className="fs-all">{t('hp.fs.all')}<Arrow /></Link>
        </Reveal>
        {loading && <div className="fs-state text-white"><Loading label={t('home.featuredLoading')} /></div>}
        {!loading && error && <div className="fs-state bg-white p-8 text-ink"><ErrorState onRetry={retry} /></div>}
        {!loading && !error && spots.length === 0 && <div className="fs-state bg-white p-8 text-ink"><EmptyState title={t('home.featuredEmpty')} /></div>}
        {!loading && !error && n > 0 && (
          <div className="fs-grid" data-n={n}>
            {spots.slice(0, 5).map((s, i) => (
              <Reveal key={s._id} className="fs-item" delay={i * 0.12}><FeaturedCard spot={s} index={i} /></Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
