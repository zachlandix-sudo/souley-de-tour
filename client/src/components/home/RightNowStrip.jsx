import { useConditions } from '../../hooks/useConditions';
import { dayHint, describeWeather, waveLabel } from '../../utils/conditions';
import { useI18n } from '../../i18n/I18nContext';

const LAT = 10.35; // roughly the middle of Sogod Bay
const LNG = 125.0;
const TONE = { good: 'text-orange', warn: 'text-danger-light', neutral: 'text-white' };

export default function RightNowStrip() {
  const { t, tx } = useI18n();
  const c = useConditions(LAT, LNG);
  const hint = dayHint(c);
  return (
    <section aria-labelledby="now-title" className="surface-dark border-t border-white/15 bg-night text-white/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4 text-sm sm:px-6">
        <h2 id="now-title" className="flex items-center gap-2 font-sans text-sm font-semibold tracking-normal text-white">
          <span aria-hidden="true" data-live={!c.loading && !c.error} className="rn-dot h-2 w-2 rounded-full bg-orange" />{t('now.title')}
        </h2>
        {c.loading && <p className="rn-wait">{t('now.loading')}</p>}
        {!c.loading && c.error && <p>{t('now.error')}</p>}
        {!c.loading && !c.error && (
          <>
            <ul className="flex flex-wrap gap-x-7 gap-y-1">
              {Number.isFinite(c.temp) && <li className="rn-in" style={{ '--i': 0 }}><span className="font-semibold text-white">{Math.round(c.temp)}°C</span> {tx(describeWeather(c.code))}</li>}
              {Number.isFinite(c.wind) && <li className="rn-in" style={{ '--i': 1 }}><span className="font-semibold text-white">{Math.round(c.wind)} km/h</span> {t('now.wind')}</li>}
              {Number.isFinite(c.wave) && <li className="rn-in" style={{ '--i': 2 }}>{tx(waveLabel(c.wave))}</li>}
            </ul>
            {hint && <p className={`rn-in font-semibold ${TONE[hint.tone]}`} style={{ '--i': 3 }}>{tx(hint.text)}</p>}
          </>
        )}
      </div>
    </section>
  );
}
