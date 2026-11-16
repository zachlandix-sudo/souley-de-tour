import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listFavorites, removeFavorite } from '../services/favoriteService';
import SpotCard from '../components/SpotCard';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useI18n } from '../i18n/I18nContext';

export default function Saved() {
  const { t } = useI18n();
  const [spots, setSpots] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    listFavorites().then(setSpots).catch(() => setError(true));
  };
  useEffect(load, []);

  const remove = async (id) => {
    await removeFavorite(id);
    setSpots((s) => s.filter((x) => x._id !== id));
  };

  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={load} /></div>;
  if (!spots) return <Loading label={t('saved.loading')} />;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-5xl">{t('saved.title')}</h1>
      <p className="mt-3 text-muted">{t('common.saved', { n: spots.length })}</p>
      {spots.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t('saved.empty')} />
          <p className="mt-4 text-center"><Link to="/spots" className="btn btn-dark">{t('saved.browse')}</Link></p>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((s) => (
            <div key={s._id}>
              <SpotCard spot={s} />
              <button type="button" onClick={() => remove(s._id)} className="btn btn-outline btn-sm mt-3">{t('common.remove')}</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
