import { useEffect, useState } from 'react';

// Live weather for one spot plus a 7-day outlook, from Open-Meteo (free, no key). Fails quietly: callers show nothing.
export function useSpotWeather(lat, lng) {
  const [s, setS] = useState({ loading: true, error: false });
  useEffect(() => {
    if (typeof fetch !== 'function' || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) { setS({ loading: false, error: true }); return undefined; }
    const ctrl = new AbortController();
    setS({ loading: true, error: false });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FManila&forecast_days=7`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather'))))
      .then((w) => {
        if (ctrl.signal.aborted) return;
        const d = w.daily || {};
        const days = (d.time || []).map((date, i) => ({ date, code: d.weather_code?.[i], max: d.temperature_2m_max?.[i], rain: d.precipitation_probability_max?.[i], rise: d.sunrise?.[i], set: d.sunset?.[i] }));
        setS({ loading: false, error: false, temp: w.current?.temperature_2m, code: w.current?.weather_code, wind: w.current?.wind_speed_10m, days });
      })
      .catch(() => { if (!ctrl.signal.aborted) setS({ loading: false, error: true }); });
    return () => ctrl.abort();
  }, [lat, lng]);
  return s;
}

export default useSpotWeather;
