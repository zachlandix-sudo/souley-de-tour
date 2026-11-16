import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrip, listTrips, removeTrip } from '../services/itineraryService';
import ShareTripButton from '../components/ShareTripButton';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useI18n } from '../i18n/I18nContext';

function Trip({ trip, onDelete }) {
  const { t } = useI18n();
  const when = trip.updatedAt ? new Date(trip.updatedAt).toLocaleDateString() : '';
  return (
    <li className="border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">{trip.title}</h2>
          <p className="mt-1 text-sm text-muted">{trip.days?.length === 1 ? t('trips.dayOne') : t('trips.days', { n: trip.days?.length || 0 })}{when && ` · ${t('trips.savedOn', { d: when })}`}{trip.generatedByAI ? ` · ${t('trips.byAI')}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareTripButton trip={trip} />
          <button type="button" onClick={() => onDelete(trip)} className="btn btn-outline btn-sm">{t('common.delete')}</button>
        </div>
      </div>
      <ol className="mt-4 space-y-4">
        {(trip.days || []).map((d) => (
          <li key={d.dayNumber} className="border-l-2 border-orange pl-4">
            <p className="font-display text-xl">{t('trips.day', { n: d.dayNumber })}</p>
            <ul className="mt-1 space-y-1">
              {[...(d.items || [])].sort((a, b) => (a.visitOrder || 0) - (b.visitOrder || 0)).map((it, i) => {
                const s = it.touristSpotId && typeof it.touristSpotId === 'object' ? it.touristSpotId : null;
                return (
                  <li key={`${d.dayNumber}-${i}`}>
                    {i + 1}. {s?.slug ? <Link className="underline hover:text-ember" to={`/spots/${s.slug}`}>{s.name}</Link> : t('trips.gone')}
                    {s?.municipality ? <span className="text-muted"> · {s.municipality}</span> : null}
                    {it.notes ? <span className="text-muted"> — {it.notes}</span> : null}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </li>
  );
}

export default function Trips() {
  const { t } = useI18n();
  const [trips, setTrips] = useState(null);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    listTrips()
      .then((list) => Promise.all(list.map((t) => getTrip(t._id).catch(() => t))))
      .then(setTrips)
      .catch(() => setError(true));
  };
  useEffect(load, []);

  const remove = async (trip) => {
    if (!window.confirm(t('trips.confirm', { t: trip.title }))) return;
    try {
      await removeTrip(trip._id);
      setTrips((t) => t.filter((x) => x._id !== trip._id));
    } catch {
      setError(true);
    }
  };

  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={load} /></div>;
  if (!trips) return <Loading label={t('trips.loading')} />;

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-5xl">{t('trips.title')}</h1>
      <p className="mt-3 text-muted">{t('common.saved', { n: trips.length })}</p>
      {trips.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={t('trips.empty')} />
          <p className="mt-4 text-center"><Link to="/ask" className="btn btn-dark">{t('trips.plan')}</Link></p>
        </div>
      ) : (
        <ul className="mt-8 space-y-6">{trips.map((t) => <Trip key={t._id} trip={t} onDelete={remove} />)}</ul>
      )}
    </section>
  );
}
