import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import SpotCard from '../SpotCard';
import Loading from '../Loading';
import ErrorState from '../ErrorState';
import { useSpots } from '../../hooks/useSpots';
import { finderLink, finderQuery } from '../../utils/homeFinder';
import { useI18n } from '../../i18n/I18nContext';

export default function FinderResults({ answers, onReset }) {
  const { t } = useI18n();
  const query = useMemo(() => finderQuery(answers), [answers.energy, answers.budget]); // eslint-disable-line react-hooks/exhaustive-deps
  const { spots, loading, error, retry } = useSpots(query);
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); }, [answers.energy, answers.budget]);

  return (
    <section ref={ref} aria-labelledby="finder-results" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <div className="fr-in mb-10 flex flex-wrap items-end justify-between gap-3" style={{ '--i': 0 }}>
        <h2 id="finder-results" className="text-4xl">{t('results.title')}</h2>
        <button type="button" onClick={onReset} className="text-sm font-semibold text-ember underline">{t('results.reset')}</button>
      </div>
      {loading && <Loading label={t('results.loading')} />}
      {!loading && error && <ErrorState onRetry={retry} />}
      {!loading && !error && spots.length === 0 && (
        <p className="border border-dashed border-line p-8 text-center">{t('results.none')}</p>
      )}
      {!loading && !error && spots.length > 0 && (
        <>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{spots.map((s, i) => <div key={s._id} className="fr-in" style={{ '--i': i + 1 }}><SpotCard spot={s} /></div>)}</div>
          <p className="mt-8"><Link to={finderLink(answers)} className="font-semibold text-ember underline">{t('results.all')}</Link></p>
        </>
      )}
    </section>
  );
}
