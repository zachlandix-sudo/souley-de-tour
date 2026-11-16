import { Link } from 'react-router-dom';
import SpotImage from '../SpotImage';
import { useI18n } from '../../i18n/I18nContext';
import { ago, REVIEW_TONE, tripWhen } from '../../utils/myJourney';

// The cards on /journey. Each one owns its words, its empty state and its "could not load" state, so one failing request never blanks the page.

export function Card({ id, title, action, children, className = '' }) {
  return (
    <section aria-labelledby={id} className={`jr-card ${className}`}>
      <div className="jr-card-head">
        <h2 id={id}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const More = ({ to, children }) => <Link to={to} className="jr-more">{children} <span aria-hidden="true">→</span></Link>;

// Loading / failed / ready, the same for every card that waits on a request.
function Wait({ state, children }) {
  const { t } = useI18n();
  if (state.loading && !state.data) return <p className="jr-soft" role="status">{t('common.loading')}…</p>;
  if (state.error) return <p className="jr-soft" role="alert">{t('journey.loadError')} <button type="button" className="jr-link" onClick={state.reload}>{t('journey.retry')}</button></p>;
  return children;
}

const Empty = ({ text, to, cta }) => (
  <div className="jr-empty">
    <p>{text}</p>
    {to && <Link to={to} className="btn btn-outline btn-sm">{cta}</Link>}
  </div>
);

const date = (iso, locale, opts = { month: 'short', day: 'numeric' }) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(locale, opts) : '';
};

// When something happened, in words for the last two weeks and as a date after that.
function useWhen(locale) {
  const { t } = useI18n();
  return (iso) => {
    const a = ago(iso);
    if (!a) return '';
    return a.key ? t(a.key, { n: a.n }) : date(iso, locale);
  };
}

export function PassportPanel({ towns, latest, count, locale }) {
  const { t } = useI18n();
  const when = useWhen(locale);
  return (
    <Card id="jr-pass-h" title={t('journey.pass.title')} className="jr-span-7" action={<More to="/passport">{t('journey.pass.open')}</More>}>
      {count === 0 ? <Empty text={t('journey.pass.empty')} to="/passport" cta={t('journey.q.passport')} /> : (
        <div className="jr-two">
          <div>
            <h3 className="jr-sub">{t('journey.pass.towns')}</h3>
            <ul className="jr-bars">
              {towns.map((g) => (
                <li key={g.town}>
                  <div><span>{g.town}{g.badge && <em title={t('journey.pass.badge')}> ★ {t('journey.pass.badge')}</em>}</span><b>{t('journey.pass.of', { n: g.collected, total: g.total })}</b></div>
                  <div className="jr-track" role="img" aria-label={`${g.town}: ${g.pct}%`}><i style={{ width: `${g.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="jr-sub">{t('journey.pass.recent')}</h3>
            <ol className="jr-stamps">
              {latest.map((s) => (
                <li key={s.id}>
                  <span aria-hidden="true" className="jr-seal">✓</span>
                  <span className="min-w-0">
                    {s.slug ? <Link to={`/spots/${s.slug}`}>{s.name}</Link> : s.name}
                    <small>{[s.municipality, when(s.at)].filter(Boolean).join(' · ')}</small>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
}

export function TripsPanel({ ov, upcoming, locale }) {
  const { t } = useI18n();
  const trips = ov.data?.trips || [];
  const label = (trip) => {
    const w = tripWhen(trip);
    if (w.state === 'now') return { text: t('journey.trips.now'), tone: 'hot' };
    if (w.state === 'soon') return { text: w.days === 1 ? t('journey.trips.tomorrow') : t('journey.trips.soon', { n: w.days }), tone: 'hot' };
    if (w.state === 'past') return { text: t('journey.trips.past'), tone: '' };
    return { text: t('journey.trips.open'), tone: '' };
  };
  // the trip that is on or coming up goes first
  const sorted = upcoming ? [upcoming.trip, ...trips.filter((x) => x._id !== upcoming.trip._id)] : trips;
  return (
    <Card id="jr-trips-h" title={t('journey.trips.title')} className="jr-span-5" action={<More to="/trips">{t('journey.trips.all')}</More>}>
      <Wait state={ov}>
        {sorted.length === 0 ? <Empty text={t('journey.trips.empty')} to="/ask" cta={t('journey.trips.plan')} /> : (
          <ul className="jr-list">
            {sorted.slice(0, 3).map((trip) => {
              const l = label(trip);
              const dates = trip.startDate ? date(trip.startDate, locale) : '';
              return (
                <li key={trip._id}>
                  <div className="min-w-0">
                    <p className="jr-title">{trip.title}</p>
                    <p className="jr-meta">
                      {trip.days === 1 ? t('trips.dayOne') : t('trips.days', { n: trip.days })} · {trip.stops === 1 ? t('journey.stop1') : t('journey.stops', { n: trip.stops })}
                      {dates && ` · ${dates}`}{trip.generatedByAI ? ` · ${t('journey.trips.ai')}` : ''}
                    </p>
                  </div>
                  <span className={`jr-tag ${l.tone === 'hot' ? 'jr-tag-hot' : ''}`}>{l.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Wait>
    </Card>
  );
}

export function SavedPanel({ fav }) {
  const { t } = useI18n();
  const spots = fav.data || [];
  return (
    <Card id="jr-saved-h" title={t('journey.saved.title')} className="jr-span-5" action={<More to="/saved">{spots.length > 4 ? t('journey.saved.all', { n: spots.length }) : t('journey.saved.open')}</More>}>
      <Wait state={fav}>
        {spots.length === 0 ? <Empty text={t('journey.saved.empty')} to="/spots" cta={t('journey.saved.browse')} /> : (
          <ul className="jr-tiles">
            {spots.slice(0, 4).map((s) => (
              <li key={s._id}>
                <Link to={`/spots/${s.slug}`}>
                  <SpotImage src={s.images?.[0]} fallbacks={s.images?.slice(1)} slug={s.slug} alt={s.name} className="aspect-square w-full" />
                  <span><b>{s.name}</b><small>{s.municipality}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Wait>
    </Card>
  );
}

export function ReviewsPanel({ ov, locale }) {
  const { t } = useI18n();
  const reviews = ov.data?.reviews || [];
  const waiting = ov.data?.counts?.pendingReviews || 0;
  return (
    <Card id="jr-rev-h" title={t('journey.reviews.title')} className="jr-span-7">
      <Wait state={ov}>
        {reviews.length === 0 ? <Empty text={t('journey.reviews.empty')} to="/spots" cta={t('journey.saved.browse')} /> : (
          <>
            {waiting > 0 && <p className="jr-note">{t('journey.reviews.waiting', { n: waiting })}</p>}
            <ul className="jr-list">
              {reviews.slice(0, 4).map((r) => (
                <li key={r._id}>
                  <div className="min-w-0">
                    <p className="jr-title">{r.spot?.slug ? <Link to={`/spots/${r.spot.slug}`}>{r.spot.name}</Link> : t('journey.reviews.gone')}</p>
                    <p className="jr-meta">
                      <span className="jr-stars" role="img" aria-label={t('journey.reviews.stars', { n: r.rating })}>{'★'.repeat(r.rating)}<i>{'★'.repeat(5 - r.rating)}</i></span>
                      {r.title ? ` · ${r.title}` : ''} · {date(r.createdAt, locale)}
                    </p>
                  </div>
                  <span className={`jr-tag jr-tag-${REVIEW_TONE[r.status] || 'warn'}`}>{t(`journey.reviews.status.${r.status}`)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Wait>
    </Card>
  );
}

export function AsksPanel({ ov, locale }) {
  const { t } = useI18n();
  const when = useWhen(locale);
  const asks = ov.data?.asks || [];
  return (
    <Card id="jr-asks-h" title={t('journey.asks.title')} className="jr-span-7" action={<More to="/ask">{t('journey.asks.open')}</More>}>
      <Wait state={ov}>
        {asks.length === 0 ? <Empty text={t('journey.asks.empty')} to="/ask" cta={t('journey.asks.open')} /> : (
          <ul className="jr-list">
            {asks.map((a) => (
              <li key={a._id}>
                <div className="min-w-0">
                  <p className="jr-title jr-clip">“{a.question}”</p>
                  <p className="jr-meta">{when(a.at)}</p>
                </div>
                <Link className="jr-link" to={`/ask?q=${encodeURIComponent(a.question)}`}>{t('journey.asks.again')}</Link>
              </li>
            ))}
          </ul>
        )}
      </Wait>
    </Card>
  );
}

export function FoodPanel({ count }) {
  const { t } = useI18n();
  return (
    <Card id="jr-food-h" title={t('journey.food.title')} className="jr-span-5" action={<More to="/food">{t('journey.food.open')}</More>}>
      {count === 0 ? <Empty text={t('journey.food.empty')} to="/food" cta={t('journey.food.open')} /> : (
        <div className="jr-big">
          <p className="jr-bignum">{count}</p>
          <p>{count === 1 ? t('journey.food.line1') : t('journey.food.line', { n: count })}</p>
        </div>
      )}
      <p className="jr-fine">{t('journey.food.note')}</p>
    </Card>
  );
}
