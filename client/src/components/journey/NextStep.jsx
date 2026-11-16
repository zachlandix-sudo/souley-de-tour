import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';

const QUICK = [
  ['/ask', 'journey.q.ask'],
  ['/spots', 'journey.q.spots'],
  ['/food', 'journey.q.food'],
  ['/passport', 'journey.q.passport'],
];

// "Up next": one suggestion picked from what the visitor has already done (utils/myJourney.js nextStep), and four quick links.
export default function NextStep({ step }) {
  const { t } = useI18n();
  const { id, to, vars } = step;
  const bodyKey = id === 'tripSoon' && vars.n === 1 ? 'journey.next.tripSoon.body1' : `journey.next.${id}.body`;
  return (
    <div className="jr-next-wrap">
      <section aria-labelledby="jr-next-h" className="jr-next surface-dark">
        <p className="jr-eyebrow">{t('journey.next')}</p>
        <h2 id="jr-next-h">{t(`journey.next.${id}.title`, vars)}</h2>
        <p>{t(bodyKey, vars)}</p>
        <Link to={to} className="btn btn-primary btn-sm">{t(`journey.next.${id}.cta`)}</Link>
      </section>
      <nav aria-label={t('journey.quick.aria')} className="jr-quick">
        {QUICK.map(([path, key]) => (
          <Link key={path} to={path}><span>{t(key)}</span><i aria-hidden="true">→</i></Link>
        ))}
      </nav>
    </div>
  );
}
