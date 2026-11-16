import Contours from '../Contours';
import { useI18n } from '../../i18n/I18nContext';
import { firstName, greetingKey } from '../../utils/myJourney';
import { RANKS } from '../../utils/passport';

const R = 54;
const RING = 2 * Math.PI * R;

// The top of /journey: a cream boarding pass on a dark map. The left side greets the traveller and shows three plain numbers;
// the torn-off stub on the right holds the passport ring, the rank and the passport number.
export default function Hero({ user, hour, count, total, shown, rankKey, number, since, saved, trips, syncError, onRetrySync, locale }) {
  const { t } = useI18n();
  const pct = total ? Math.round((count / total) * 100) : 0;
  const upcoming = RANKS.find((r) => r.min > count);
  const name = firstName(user?.fullName);
  const greet = t(greetingKey(hour));
  const when = since ? new Date(since) : null;
  const sinceText = when && !Number.isNaN(when.getTime()) ? when.toLocaleDateString(locale, { month: 'long', year: 'numeric' }) : '';
  const stats = [[count, 'journey.stat.stamps'], [saved, 'journey.stat.saved'], [trips, 'journey.stat.trips']];

  return (
    <section className="jr-hero surface-dark">
      <Contours seed="panaon" width={1600} height={600} levels={12} cell={28} align="xMidYMid" className="absolute inset-0 -z-10 h-full w-full opacity-40" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <div className="jr-ticket">
          <div className="jr-main">
            <p className="jr-kicker">{t('journey.kicker')}</p>
            <h1 className="jr-hello">{name ? t('journey.hello', { greeting: greet, name }) : greet}</h1>
            <p className="jr-lead">{t('journey.lead')}</p>
            <dl className="jr-nums">
              {stats.map(([n, key]) => (
                <div key={key}>
                  <dd>{n}</dd>
                  <dt>{t(key)}</dt>
                </div>
              ))}
            </dl>
            {sinceText && <p className="jr-since">{t('journey.since', { d: sinceText })}</p>}
          </div>
          <div className="jr-stub">
            <div className="jr-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('journey.ring', { n: count, total })}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r={R} className="jr-ring-track" />
                <circle cx="60" cy="60" r={R} className="jr-ring-fill" strokeDasharray={RING} strokeDashoffset={RING * (1 - pct / 100)} />
              </svg>
              <p className="jr-ring-num"><span>{shown}</span><small>/ {total}</small></p>
            </div>
            <p className="jr-rank">{t(rankKey)}</p>
            <p className="jr-rank-sub">{upcoming ? t('passport.nextRank', { rank: t(upcoming.key), n: upcoming.min }) : t('passport.topRank')}</p>
            {number && <p className="jr-number">{t('journey.passNo', { n: number })}</p>}
            {syncError && (
              <p className="jr-sync" role="status">
                {t('journey.syncError')}{' '}
                <button type="button" onClick={onRetrySync} className="underline">{t('journey.retry')}</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
