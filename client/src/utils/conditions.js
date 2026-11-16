export const describeWeather = (c) => (c === 0 ? 'Clear' : c <= 3 ? 'Partly cloudy' : c <= 48 ? 'Foggy' : c <= 67 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : 'Thunderstorms');
export const weatherIcon = (c) => (c === 0 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫️' : c <= 82 ? '🌧️' : '⛈️');
export const waveLabel = (h) => (h < 0.5 ? 'Calm waves' : h < 1.25 ? 'Slight waves' : h < 2.5 ? 'Moderate waves' : 'Rough waves');

const num = (v) => Number.isFinite(v);

// One plain-language line for "what kind of day is it". Returns null when there is no data.
export function dayHint({ code, wave, wind } = {}) {
  if (!num(code) && !num(wave) && !num(wind)) return null;
  if (num(code) && code >= 95) return { tone: 'warn', text: 'Thunderstorms around. Keep to short land stops and skip boat trips today.' };
  if ((num(wave) && wave >= 2.5) || (num(wind) && wind >= 40)) return { tone: 'warn', text: 'Rough at sea. Stay on land today.' };
  if (num(code) && code >= 51) return { tone: 'neutral', text: 'Showery. Better for short covered stops than open-water trips.' };
  if (num(code) && code <= 3 && (!num(wave) || wave < 1.25) && (!num(wind) || wind < 30)) return { tone: 'good', text: 'Calm and clear. A good day to get out on the water.' };
  return { tone: 'neutral', text: 'Mixed conditions. Check the sea before booking a boat.' };
}
