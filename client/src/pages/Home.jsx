import { useRef, useState } from 'react';
import CalmTitle from '../components/CalmTitle';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import CategoryChips from '../components/CategoryChips';
import { useSpots } from '../hooks/useSpots';
import { useCategories } from '../hooks/useCategories';
import { useScrollDive } from '../hooks/useScrollDive';
import { useInViewOnce } from '../hooks/useInViewOnce';
import { buildSearchParams } from '../utils/query';
import { isComplete } from '../utils/homeFinder';
import GuidedFinder from '../components/home/GuidedFinder';
import FinderResults from '../components/home/FinderResults';
import FeaturedSpots from '../components/home/FeaturedSpots';
import RightNowStrip from '../components/home/RightNowStrip';
import MoodTiles from '../components/home/MoodTiles';
import LiveContours from '../components/LiveContours';
import DepthGauge from '../components/DepthGauge';
import RevealText from '../components/RevealText';
import GlowFollow from '../components/GlowFollow';
import { StatsStrip, WhySouthernLeyte, HowItWorks, TownsMarquee, FeatureGrid, TownsGrid, TripIdeas, TravelTips, PassportTeaser } from '../components/home/HomeSections';
import { useI18n } from '../i18n/I18nContext';

const FEATURED = { featured: 'true', limit: 5 };

export default function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { spots, loading, error, retry } = useSpots(FEATURED);
  const { categories } = useCategories();
  const [answers, setAnswers] = useState({});
  const hero = useRef(null);
  useScrollDive(hero);
  const [chipsRef, chipsPhase] = useInViewOnce({ rootMargin: '0px' }); // no bottom margin: the chips are near the end of the page and must stay reachable

  return (
    <>
      <DepthGauge />
      <section ref={hero} className="hero-dive surface-dark relative isolate overflow-hidden bg-night text-white">
        <LiveContours seed="sogod-bay" width={1600} height={900} levels={15} cell={24} alignX={1} depthLabel className="hero-contours absolute inset-0 -z-10 h-full w-full" />
        <GlowFollow className="-z-10" />
        <span aria-hidden="true" className="hero-dive-shade -z-10" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
          <div className="hero-dive-copy">
            <h1 className="text-[clamp(2.9rem,7.2vw,6.5rem)] leading-[1.02] tracking-[-0.025em]"><RevealText text={t('home.title')} /></h1>
            <p className="mt-7 max-w-lg text-lg text-white/75">{t('home.lead')}</p>
          </div>
          <div className="hero-dive-card"><GuidedFinder answers={answers} onChange={setAnswers} /></div>
        </div>
        <div className="hero-dive-card mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="flex flex-col gap-3 border-t border-white/15 pt-7 md:flex-row md:items-center md:gap-10">
            <p className="text-sm text-white/75 md:w-64 md:shrink-0">{t('home.specific')}</p>
            <div className="max-w-2xl flex-1">
              <SearchBar large onSubmit={(text) => navigate(`/spots${text ? `?${buildSearchParams({ search: text })}` : ''}`)} />
            </div>
          </div>
        </div>
      </section>

      <RightNowStrip />
      <StatsStrip />
      {isComplete(answers) && <FinderResults answers={answers} onReset={() => setAnswers({})} />}
      <MoodTiles />
      <WhySouthernLeyte />
      <HowItWorks />
      <TownsMarquee />
      <PassportTeaser />

      <FeaturedSpots spots={spots} loading={loading} error={error} retry={retry} />

      <FeatureGrid />
      <TownsGrid />
      <TripIdeas />
      <TravelTips />

      <section className="bg-paper" aria-labelledby="browse-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <CalmTitle as="h2" id="browse-title" className="mb-6 text-3xl sm:text-4xl" text={t('home.browse')} />
          <div ref={chipsRef} className={`chips-stagger ${chipsPhase === 'armed' ? 'is-armed' : chipsPhase === 'in' ? 'is-in' : ''}`}>
            <CategoryChips categories={categories} onSelect={(slug) => navigate(slug ? `/spots?category=${encodeURIComponent(slug)}` : '/spots')} />
          </div>
        </div>
      </section>

    </>
  );
}
