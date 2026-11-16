import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { useAllSpots } from '../hooks/useAllSpots';
import { useLoader } from '../hooks/useLoader';
import { useLocalList } from '../hooks/useLocalList';
import { useCountTo } from '../hooks/useCountTo';
import { usePassportStamps } from '../hooks/usePassportStamps';
import { getMyOverview } from '../services/journeyService';
import { listFavorites } from '../services/favoriteService';
import { TRIED } from '../components/food/FoodFun';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import Hero from '../components/journey/Hero';
import NextStep from '../components/journey/NextStep';
import { AsksPanel, FoodPanel, PassportPanel, ReviewsPanel, SavedPanel, TripsPanel } from '../components/journey/Panels';
import { countStamps, groupByTown, passportNumber, rankFor, stampable } from '../utils/passport';
import { nextStep, recentStamps, townProgress, unreviewedStamp, upcomingTrip } from '../utils/myJourney';

const QUERY = { sort: 'name' };
const LOCALES = { en: 'en-PH', fil: 'fil-PH', ceb: 'en-PH' };

// "My journey" (/journey): the signed-in visitor's own page. It is NOT the admin dashboard: no site-wide numbers, no tables,
// just this person's passport, saved places, trips, reviews and questions, and one suggestion for what to do next.
// Stamps come from usePassportStamps (account), the rest from GET /users/me/overview and /users/me/favorites; the food log stays on this device.
export default function Journey() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const locale = LOCALES[lang] || 'en-PH';
  const { spots, loading, error, retry } = useAllSpots(QUERY);
  const { stamps, ready, sync, retry: retrySync } = usePassportStamps();
  const ov = useLoader(getMyOverview, []);
  const fav = useLoader(listFavorites, []);
  const food = useLocalList(TRIED);

  const groups = useMemo(() => groupByTown(spots, stamps), [spots, stamps]);
  const count = useMemo(() => countStamps(spots, stamps), [spots, stamps]);
  const total = useMemo(() => stampable(spots).length, [spots]);
  const towns = useMemo(() => townProgress(groups), [groups]);
  const latest = useMemo(() => recentStamps(stamps, 4), [stamps]);
  const upcoming = useMemo(() => upcomingTrip(ov.data?.trips), [ov.data]);
  const calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shown = Math.round(useCountTo(count, { firstMs: 1200, moreMs: 700, animate: !calm }));

  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={retry} /></div>;
  if (loading || !ready) return <Loading label={t('journey.loading')} />;

  const counts = ov.data?.counts || {};
  const saved = fav.data ? fav.data.length : counts.favorites || 0;
  // Only suggest a review once the overview has loaded, or we could nudge about a spot that is already reviewed.
  const unreviewed = ov.data ? unreviewedStamp(stamps, ov.data.reviewedSpotIds) : null;
  const step = nextStep({ stamps: count, saved, trips: counts.trips || 0, asks: counts.asks || 0, food: food.list.length, soon: upcoming, unreviewed });

  return (
    <>
      <Hero
        user={user}
        hour={new Date().getHours()}
        count={count}
        total={total}
        shown={shown}
        rankKey={rankFor(count).key}
        number={passportNumber(user)}
        since={ov.data?.memberSince || user?.createdAt}
        saved={saved}
        trips={counts.trips || 0}
        syncError={sync === 'error'}
        onRetrySync={retrySync}
        locale={locale}
      />
      <div className="jr-body mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <NextStep step={step} />
        <div className="jr-grid">
          <PassportPanel towns={towns} latest={latest} count={count} locale={locale} />
          <TripsPanel ov={ov} upcoming={upcoming} locale={locale} />
          <SavedPanel fav={fav} />
          <ReviewsPanel ov={ov} locale={locale} />
          <AsksPanel ov={ov} locale={locale} />
          <FoodPanel count={food.list.length} />
        </div>
      </div>
    </>
  );
}
