import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSpot } from '../hooks/useSpot';
import { listReviews } from '../services/spotService';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import ImageGallery from '../components/ImageGallery';
import SpotMap from '../components/SpotMap';
import SpotCard from '../components/SpotCard';
import FavoriteButton from '../components/FavoriteButton';
import SpotDock, { jumpTo } from '../components/SpotDock';
import EatNearby from '../components/EatNearby';
import ReviewForm from '../components/ReviewForm';
import Rating from '../components/Rating';
import Reveal from '../components/Reveal';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import NotFound from './NotFound';
import { useIntroDelay } from '../components/IntroSplash';
import { toLatLng } from '../utils/geo';
import { goodFor } from '../utils/fun';
import { CostSplitter, GoodFor, LiveStrip, TickList } from '../components/spot/SpotFun';

const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DIFFICULTY = { easy: 1, moderate: 2, hard: 3 };

function Head({ n, title, id }) {
  return (
    <div className="sd-head">
      <span className="sd-n" aria-hidden="true">{pad(n)}</span>
      <h2 id={id}>{title}</h2>
      <span className="sd-rule" aria-hidden="true" />
    </div>
  );
}
function Fact({ label, children }) {
  return <div className="sd-aside-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}
function ListCard({ title, items, warn = false }) {
  if (!has(items)) return null;
  return (
    <section className={`sd-card ${warn ? 'is-warn' : ''}`}>
      <h2>{title}</h2>
      <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </section>
  );
}
const Pin = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
);

// The title rises once the page has data; it waits only for whatever is left of the first-visit intro.
function SpotTitle({ name }) {
  const introDelay = useIntroDelay();
  return <h1 className="sd-title"><span className="block overflow-hidden pb-[0.12em]" style={{ marginBottom: '-0.12em' }}><span className="reveal-word block" style={{ animationDelay: `${introDelay + 0.45}s` }}>{name}</span></span></h1>;
}

export default function SpotDetails() {
  const { slug } = useParams();
  const location = useLocation();
  const morph = !!location.state?.vt && typeof document !== 'undefined' && 'startViewTransition' in document;
  const { spot, loading, error, notFound, retry } = useSpot(slug);
  const { user } = useAuth();
  const { t } = useI18n();
  const [reviews, setReviews] = useState([]);
  const [shared, setShared] = useState(false);
  const hero = useRef(null);

  useEffect(() => {
    setReviews([]);
    if (!spot?._id) return undefined;
    let live = true;
    listReviews(spot._id).then((r) => live && setReviews(r.data || [])).catch(() => {});
    return () => { live = false; };
  }, [spot?._id]);

  if (loading) return <Loading label="Loading spot" />;
  if (notFound) return <NotFound />;
  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={retry} /></div>;
  if (!spot) return null;

  const categories = (spot.categoryIds || []).filter((c) => c && typeof c === 'object');
  const nearby = (spot.nearbySpotIds || []).filter((s) => s && typeof s === 'object' && s.slug);
  const pos = toLatLng(spot);
  const place = [spot.barangay, spot.municipality].filter(Boolean).join(', ');
  const stats = [
    has(spot.entranceFee) && ['Entrance fee', spot.entranceFee],
    has(spot.estimatedBudget) && ['Estimated budget', `₱${Number(spot.estimatedBudget).toLocaleString()}`],
    has(spot.recommendedDuration) && ['Recommended duration', spot.recommendedDuration],
    has(spot.difficulty) && ['Difficulty', cap(spot.difficulty), DIFFICULTY[spot.difficulty] || 0],
  ].filter(Boolean);
  const months = (spot.bestMonths || []).filter((m) => m >= 1 && m <= 12);
  const showAside = has(spot.bestTimeToVisit) || has(spot.accessibility) || months.length > 0 || has(spot.openDays) || !!pos;
  const hasContact = has(spot.contactName) || has(spot.contactPhone) || has(spot.contactEmail);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2200); }
    } catch { /* cancelled or blocked: nothing to do */ }
  };
  const dock = [['sd-about', 'About'], has(spot.activities) && ['sd-do', 'Do'], showAside && ['sd-plan', 'Plan'], pos && ['sd-map', 'Map'], ['reviews', 'Reviews']].filter(Boolean);
  let n = 0;
  const num = () => { n += 1; return n; };

  return (
    <article className="pb-20">
      <div ref={hero} className="sd-hero surface-dark">
        <ImageGallery images={spot.images} alt={spot.name} slug={spot.slug} morph={morph}>
          <div className="sd-shade" aria-hidden="true" />
          <Link to="/spots" className="sd-back">&larr; All spots</Link>
          <div className="sd-copy">
            <div className="sd-copy-in">
              {place && <p className="sd-kicker"><Pin />{place}</p>}
              <SpotTitle name={spot.name} />
              <div className="sd-badges">
                <button type="button" className="sd-pill" onClick={() => jumpTo('reviews')}>
                  {spot.reviewCount > 0 ? <><b aria-hidden="true">★</b>{Number(spot.averageRating).toFixed(1)} <span>({spot.reviewCount})</span></> : 'Be the first to review'}
                </button>
                {categories.map((c) => <span key={c._id} className="sd-pill is-quiet">{c.name}</span>)}
              </div>
              <div className="sd-actions">
                <FavoriteButton spotId={spot._id} className="sd-btn" />
                <button type="button" className="sd-btn" onClick={share}>{shared ? 'Link copied ✓' : 'Share'}</button>
                <Link to={`/ask?q=${encodeURIComponent(`Plan a visit to ${spot.name}`)}`} className="sd-btn">Ask AI</Link>
              </div>
            </div>
          </div>
        </ImageGallery>
      </div>

      <div className="sd-wrap">
        {stats.length > 0 && (
          <dl className="sd-facts" style={{ '--cols': stats.length }}>
            {stats.map(([label, value, level]) => (
              <div key={label} className="sd-fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
                {level > 0 && <span aria-hidden="true" className="sd-meter">{[1, 2, 3].map((i) => <i key={i} className={i <= level ? 'on' : ''} />)}</span>}
              </div>
            ))}
          </dl>
        )}

        <GoodFor tags={goodFor(spot)} />

        <div className="sd-main">
          <div className="sd-col">
            <Reveal as="section" id="sd-about" className="scroll-mt-24">
              <Head n={num()} title="About" />
              <p className="sd-about">{spot.description}</p>
            </Reveal>

            {pos && <LiveStrip pos={pos} name={spot.name} />}

            {has(spot.activities) && (
              <Reveal as="section" id="sd-do" className="scroll-mt-24">
                <Head n={num()} title="Things to do" />
                <p className="sd-hint">Tap an activity to tick it off. Do them all for a surprise.</p>
                <TickList storeKey={`souley:todo:${spot.slug}`} items={spot.activities} label="done" />
              </Reveal>
            )}

            {(has(spot.whatToBring) || has(spot.safetyTips)) && (
              <Reveal className={`sd-two ${has(spot.whatToBring) && has(spot.safetyTips) ? 'is-2' : ''}`}>
                {has(spot.whatToBring) && <TickList variant="card" title="What to bring" storeKey={`souley:bring:${spot.slug}`} items={spot.whatToBring} label="packed" />}
                <ListCard title="Safety tips" items={spot.safetyTips} warn />
              </Reveal>
            )}

            {Number(spot.estimatedBudget) > 0 && <CostSplitter perPerson={Number(spot.estimatedBudget)} title="Plan your budget" />}

            {hasContact && (
              <Reveal as="section">
                <Head n={num()} title="Contact" />
                <dl className="sd-contact">
                  {has(spot.contactName) && <div><dt>Name</dt><dd>{spot.contactName}</dd></div>}
                  {has(spot.contactPhone) && <div><dt>Phone</dt><dd><a href={`tel:${String(spot.contactPhone).replace(/[^\d+]/g, '')}`}>{spot.contactPhone}</a></dd></div>}
                  {has(spot.contactEmail) && <div><dt>Email</dt><dd><a href={`mailto:${spot.contactEmail}`}>{spot.contactEmail}</a></dd></div>}
                </dl>
              </Reveal>
            )}
          </div>

          {showAside && (
            <aside id="sd-plan" className="sd-aside surface-dark scroll-mt-24" aria-label="Plan your visit">
              <h2>Plan your visit</h2>
              <dl>
                {has(spot.bestTimeToVisit) && <Fact label="Best time to visit">{spot.bestTimeToVisit}</Fact>}
                {months.length > 0 && (
                  <Fact label="Best months">
                    <span className="sd-months" role="img" aria-label={months.map((m) => MONTHS[m - 1]).join(', ')}>
                      {MONTHS.map((m, i) => <i key={m} className={months.includes(i + 1) ? 'on' : ''}>{m[0]}</i>)}
                    </span>
                  </Fact>
                )}
                {has(spot.openDays) && <Fact label="Open days">{spot.openDays.join(' · ')}</Fact>}
                {has(spot.accessibility) && <Fact label="Accessibility">{spot.accessibility}</Fact>}
              </dl>
              {pos && <a href={`https://www.google.com/maps/dir/?api=1&destination=${pos[0]},${pos[1]}`} target="_blank" rel="noopener noreferrer" className="sd-btn sd-btn-solid mt-6 w-full justify-center">Get directions <span aria-hidden="true">↗</span></a>}
            </aside>
          )}
        </div>

        {pos && (
          <section id="sd-map" className="mt-20 scroll-mt-24" aria-label="Location">
            <Head n={num()} title="Location" />
            <div className="sd-frame"><SpotMap spots={[spot]} height="360px" travel /></div>
          </section>
        )}

        {nearby.length > 0 && (
          <section className="mt-20">
            <Head n={num()} title="Nearby spots" />
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{nearby.map((s) => <SpotCard key={s._id} spot={s} />)}</div>
          </section>
        )}

        <EatNearby spot={spot} />

        <section id="reviews" className="mt-20 scroll-mt-24" aria-labelledby="reviews-title">
          <Head n={num()} title={t('reviews.title')} id="reviews-title" />
          {reviews.length === 0 ? (
            <p className="text-muted">{t('reviews.none')}</p>
          ) : (
            <ul>
              {reviews.map((r) => (
                <li key={r._id} className="sd-review">
                  <span className="sd-avatar" aria-hidden="true">{(r.userId?.fullName || '★')[0].toUpperCase()}</span>
                  <div>
                    <Rating value={r.rating} count={1} />
                    {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
                    <p className="mt-1 whitespace-pre-line">{r.comment}</p>
                    {r.photos?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.photos.map((src, i) => <img key={i} src={src} alt={`Review photo ${i + 1}`} loading="lazy" className="h-24 w-24 object-cover" />)}
                      </div>
                    )}
                    {r.userId?.fullName && <p className="mt-2 text-sm text-muted">{r.userId.fullName}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <ReviewForm spotId={spot._id} user={user} onCreated={(r) => ['approved'].includes(r?.status) && setReviews((list) => [r, ...list])} />
        </section>
      </div>
      <SpotDock heroRef={hero} items={dock} />
    </article>
  );
}
