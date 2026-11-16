import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAllSpots } from '../hooks/useAllSpots';
import { useNearMe } from '../hooks/useNearMe';
import Loading from '../components/Loading';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Contours from '../components/Contours';
import StampCard from '../components/passport/StampCard';
import PassportCover from '../components/passport/PassportCover';
import Seal from '../components/passport/Seal';
import { useCountTo } from '../hooks/useCountTo';
import { usePassportStamps } from '../hooks/usePassportStamps';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { canStamp, countStamps, formatDistance, groupByTown, nextStamp, passportNumber, passportToText, RANKS, rankFor, stampable } from '../utils/passport';
import { downloadBlob, passportCardBlob } from '../utils/passportCard';

const QUERY = { sort: 'name' };
const LOC_MESSAGE = { denied: 'passport.denied', error: 'passport.locError', unsupported: 'passport.unsupported' };
const LOCALES = { en: 'en-PH', fil: 'fil-PH', ceb: 'en-PH' };

export default function Passport() {
  const { t, lang } = useI18n();
  const { user, updatePassport } = useAuth();
  const { spots, loading, error, retry } = useAllSpots(QUERY);
  const nearMe = useNearMe();
  // stamps live in this browser for a guest and on the account when signed in (hooks/usePassportStamps.js)
  const { stamps, ready, sync, add, remove, retry: retrySync } = usePassportStamps();
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all'); // all | done | todo

  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(id);
  }, [msg]);

  const origin = nearMe.origin;
  const list = useMemo(() => stampable(spots), [spots]);
  const groups = useMemo(() => groupByTown(spots, stamps), [spots, stamps]);
  const count = useMemo(() => countStamps(spots, stamps), [spots, stamps]);
  const next = useMemo(() => nextStamp(spots, stamps, origin), [spots, stamps, origin]);
  const rank = rankFor(count);
  const badgeTowns = groups.filter((g) => g.badge).map((g) => g.town);
  const pct = list.length ? Math.round((count / list.length) * 100) : 0;
  const calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const shownCount = Math.round(useCountTo(count, { firstMs: 1200, moreMs: 700, animate: !calm }));
  const townsVisited = groups.filter((g) => g.collected > 0).length;
  const upcoming = RANKS.find((r) => r.min > count);
  const RING = 2 * Math.PI * 54;
  const shownGroups = groups
    .map((g) => ({ ...g, shown: g.spots.filter((sp) => (filter === 'done' ? stamps[sp._id] : filter === 'todo' ? !stamps[sp._id] : true)) }))
    .filter((g) => g.shown.length > 0);

  const give = async (spot, method) => {
    try { navigator.vibrate?.(35); } catch { /* not supported */ }
    setMsg(t('passport.justStamped', { name: spot.name }));
    if (!(await add(spot, method))) setMsg(t('passport.saveFail'));
  };
  const unstamp = async (id) => { if (!(await remove(id))) setMsg(t('passport.removeFail')); };

  const holder = user ? { name: user.fullName, number: passportNumber(user), since: user.createdAt, homeTown: user.passport?.homeTown || '', color: user.passport?.color || 'black' } : null;

  const share = async () => {
    const text = passportToText({ count, total: list.length, rankLabel: t(rank.key), badgeTowns, stamps }, window.location.origin);
    try {
      if (navigator.share) { await navigator.share({ title: t('passport.title'), text }); return; }
      await navigator.clipboard.writeText(text);
      setMsg(t('passport.copied'));
    } catch (e) {
      if (e?.name !== 'AbortError') setMsg(t('passport.shareFail'));
    }
  };

  // A picture of the passport to post or send: shared as a file where the phone allows it, otherwise saved as a download.
  const shareImage = async () => {
    setMsg(t('passport.cardMaking'));
    const known = new Set(list.map((sp) => sp._id));
    const blob = await passportCardBlob({
      color: holder?.color || 'black',
      title: t('passport.title'),
      rankLabel: t(rank.key),
      count, total: list.length, townsVisited, badgeTowns,
      stamps: Object.entries(stamps).filter(([id]) => known.has(id)).map(([id, st]) => ({ id, name: st.name, municipality: st.municipality, at: st.at })).sort((a, b) => String(b.at).localeCompare(String(a.at))),
      holder: holder && { name: holder.name, homeTown: holder.homeTown, number: holder.number },
      origin: `${window.location.host}/passport`,
      locale: LOCALES[lang] || 'en-PH',
      labels: { stamps: t('passport.stat.stamps'), towns: t('passport.stat.towns'), badges: t('passport.stat.badges'), guest: t('passport.holder.guest') },
    });
    if (!blob) { setMsg(t('passport.cardFail')); return; }
    const file = new File([blob], 'souley-passport.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: t('passport.title') }); setMsg(''); return; }
    } catch (e) {
      if (e?.name === 'AbortError') { setMsg(''); return; }
    }
    downloadBlob(blob, 'souley-passport.png');
    setMsg(t('passport.cardSaved'));
  };

  if (error) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorState onRetry={retry} /></div>;
  if (loading || !ready) return <Loading label={t('passport.loading')} />;

  const FILTERS = [['all', 'passport.filter.all'], ['done', 'passport.filter.done'], ['todo', 'passport.filter.todo']];

  return (
    <>
      <section className="surface-dark pp-hero relative isolate overflow-hidden bg-night text-white">
        <Contours seed="limasawa" width={1600} height={600} levels={12} cell={28} align="xMaxYMid" className="absolute inset-0 -z-10 h-full w-full opacity-50" />
        <div aria-hidden="true" className="pp-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-14 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <div>
            <h1 className="text-[clamp(2.6rem,6vw,5rem)] leading-[1.04] tracking-[-0.02em]">{t('passport.title')}</h1>
            <p className="mt-5 max-w-lg text-lg text-white/75">{t('passport.lead')}</p>
            <p className="mt-3 text-sm text-white/60" data-sync={sync} aria-live="polite">
              {sync === 'local' && <><span>{t('passport.deviceNote')}</span>{' '}<Link to="/login" className="underline hover:text-white">{t('passport.signInKeep')}</Link></>}
              {sync === 'syncing' && <span>{t('passport.syncing')}</span>}
              {sync === 'synced' && <span>{t('passport.synced')}</span>}
              {sync === 'error' && <><span>{t('passport.syncError')}</span>{' '}<button type="button" onClick={retrySync} className="underline hover:text-white">{t('passport.retrySync')}</button></>}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-8">
              <div className="pp-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('passport.progress', { n: count, total: list.length })}>
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="54" className="pp-ring-track" />
                  <circle cx="60" cy="60" r="54" className="pp-ring-fill" strokeDasharray={RING} strokeDashoffset={RING * (1 - pct / 100)} />
                </svg>
                <p className="pp-ring-num font-display"><span>{shownCount}</span><small>/ {list.length}</small></p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg">{t(rank.key)} · {t('passport.progress', { n: count, total: list.length })}</p>
                <p className="mt-1 text-sm text-white/60">{upcoming ? t('passport.nextRank', { rank: t(upcoming.key), n: upcoming.min }) : t('passport.topRank')}</p>
                <ol className="pp-ladder mt-4" aria-hidden="true">
                  {RANKS.map((r) => (
                    <li key={r.key} className={count >= r.min ? 'is-on' : ''}><span>{r.min}</span></li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={share} disabled={count === 0} className="btn btn-primary btn-sm">{t('passport.share')}</button>
              <button type="button" onClick={shareImage} disabled={count === 0} className="btn btn-sm border-white text-white hover:bg-white hover:text-black">{t('passport.shareImage')}</button>
              <button type="button" onClick={nearMe.enable} disabled={nearMe.status === 'locating'} className="btn btn-sm border-white text-white hover:bg-white hover:text-black">
                {nearMe.status === 'locating' ? t('passport.locating') : nearMe.active ? t('passport.located') : t('passport.locate')}
              </button>
            </div>
            <p role="status" className="mt-3 min-h-[1.25rem] text-sm text-white/80">{msg}</p>
            {LOC_MESSAGE[nearMe.status] && <p role="alert" className="mt-1 text-sm text-danger-light">{t(LOC_MESSAGE[nearMe.status])}</p>}
          </div>
          <PassportCover count={count} total={list.length} holder={holder} rankLabel={t(rank.key)} onSaveProfile={user ? updatePassport : undefined} />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <dl className="pp-stats relative z-10 -mt-12 grid grid-cols-3 border border-line bg-white sm:-mt-14">
          {[[count, 'passport.stat.stamps'], [townsVisited, 'passport.stat.towns'], [badgeTowns.length, 'passport.stat.badges']].map(([n, key]) => (
            <div key={key} className="pp-stat px-4 py-5 text-center sm:py-6">
              <dd className="font-display text-4xl leading-none sm:text-5xl">{n}</dd>
              <dt className="mt-2 text-[.7rem] font-semibold uppercase tracking-[.2em] text-muted">{t(key)}</dt>
            </div>
          ))}
        </dl>

        {list.length === 0 ? (
          <div className="mt-12"><EmptyState title={t('passport.empty')} /></div>
        ) : (
          <>
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <section aria-labelledby="pp-next" className="pp-next surface-dark relative overflow-hidden bg-night p-7 text-white sm:p-9">
                <h2 id="pp-next" className="text-3xl text-white">{t('passport.next.title')}</h2>
                {next ? (
                  <div className="mt-5 border-l-2 border-orange pl-5">
                    <p className="font-display text-3xl">{next.spot.name}</p>
                    <p className="mt-1 text-white/65">{next.spot.municipality} · {t('passport.next.away', { d: formatDistance(next.distanceKm) })}</p>
                    <Link to={`/spots/${next.spot.slug}`} className="btn btn-primary btn-sm mt-5 inline-block">{t('passport.next.view')}</Link>
                  </div>
                ) : (
                  <p className="mt-5 text-white/65">{origin ? t('passport.next.none') : t('passport.needLoc')}</p>
                )}
              </section>
              <section aria-labelledby="pp-badges" className="pp-badges border border-line p-7 sm:p-9">
                <h2 id="pp-badges" className="text-3xl">{t('passport.badges.title')}</h2>
                {badgeTowns.length ? (
                  <ul className="mt-5 flex flex-wrap gap-5">
                    {badgeTowns.map((town) => (
                      <li key={town} className="pp-badge-item flex w-24 flex-col items-center text-center">
                        <Seal town={town} />
                        <span className="mt-2 text-sm font-semibold text-ember">{town}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 flex items-center gap-5">
                    <span className="pp-ghost-seals" aria-hidden="true"><Seal town="" earned={false} size={56} /><Seal town="" earned={false} size={56} /><Seal town="" earned={false} size={56} /></span>
                    <p className="text-muted">{t('passport.badges.none')}</p>
                  </div>
                )}
              </section>
            </div>

            <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl">{t('passport.towns')}</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('passport.towns')}>
                {FILTERS.map(([id, key]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className="food-chip">{t(key)}</button>
                ))}
              </div>
            </div>
            {count === 0 && <p className="mt-2 text-muted">{t('passport.empty')}</p>}
            {shownGroups.length === 0 && <p className="mt-6 text-muted">{t('passport.filter.none')}</p>}
            <div className="mt-6 space-y-4">
              {shownGroups.map((g, i) => (
                <details key={`${filter}-${g.town}`} open={filter !== 'all' || i < 2 || g.collected > 0} className="pp-town group">
                  <summary className="pp-town-sum flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="pp-chev" />
                      <span className="font-display text-2xl">{g.town}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      {g.badge && <span className="border-2 border-ember px-2 py-0.5 font-semibold text-ember">{t('passport.badge')}</span>}
                      <span>{t('passport.townCount', { n: g.collected, total: g.total })}</span>
                      <span aria-hidden="true" className="pp-mini"><span style={{ width: `${(g.collected / g.total) * 100}%` }} /></span>
                    </span>
                  </summary>
                  <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {g.shown.map((s, k) => (
                      <StampCard key={s._id} index={k} spot={s} stamp={stamps[s._id]} origin={origin} check={canStamp(s, origin)}
                        onStamp={(sp) => give(sp, 'gps')} onManual={(sp) => give(sp, 'manual')} onRemove={unstamp} />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
