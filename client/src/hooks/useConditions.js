import { useEffect, useState } from 'react';

// Live weather and sea state from Open-Meteo (free, no key). Fails quietly: callers show a fallback.
export function useConditions(lat, lng) {
  const [s, setS] = useState({ loading: true, error: false });
  useEffect(() => {
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
  }, [lat, lng]);
  return s;
}

export default useConditions;
