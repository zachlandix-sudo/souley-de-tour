import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const WEATHER = (c) => (c === 0 ? 'Clear' : c <= 3 ? 'Partly cloudy' : c <= 48 ? 'Foggy' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunderstorms');
const WAVES = (h) => (h < 0.5 ? 'Calm waves' : h < 1.25 ? 'Slight waves' : h < 2.5 ? 'Moderate waves' : 'Rough waves');

// Live weather and sea state from Open-Meteo (free, no key). Shows a quiet fallback if offline.
export default function LiveStatus({ position, name, card }) {
  const { t, tx } = useI18n();
  const [s, setS] = useState({ loading: true, error: false });
  const key = position.join(',');

  useEffect(() => {
    const [lat, lng] = key.split(',').map(Number);
    const ctrl = new AbortController();
    setS({ loading: true, error: false });
    const weather = fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather'))));
    const marine = fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Promise.all([weather, marine])
      .then(([w, m]) => {
        if (ctrl.signal.aborted) return;
        setS({ loading: false, error: false, temp: w.current?.temperature_2m, code: w.current?.weather_code, wind: w.current?.wind_speed_10m, wave: m?.current?.wave_height });
      })
      .catch(() => { if (!ctrl.signal.aborted) setS({ loading: false, error: true }); });
    return () => ctrl.abort();
  }, [key]);

  return (
    <section aria-label={t('live.near', { name })} className={`xp-cell ${card || ''}`}>
      <h3 className="xp-cell-title">{t('live.title')}</h3>
      {s.loading && <p className="xp-note">{t('live.checking')}</p>}
      {s.error && <p className="xp-note">{t('live.unavailable')}</p>}
      {!s.loading && !s.error && (
        <ul className="xp-read">
          {Number.isFinite(s.temp) && <li><strong>{Math.round(s.temp)}<sup>°C</sup></strong><span>{tx(WEATHER(s.code))}</span></li>}
          {Number.isFinite(s.wind) && <li><strong>{Math.round(s.wind)}<sup>km/h</sup></strong><span>{t('now.wind')}</span></li>}
          {Number.isFinite(s.wave) && <li><strong>{s.wave.toFixed(1)}<sup>m</sup></strong><span>{tx(WAVES(s.wave))}</span></li>}
        </ul>
      )}
    </section>
  );
}
