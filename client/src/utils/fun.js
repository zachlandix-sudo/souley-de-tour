// Small helpers for the "fun" parts of the spot page and the food quick view. No React in here, so they are easy to test.

// ---- weather ----
// WMO weather codes (Open-Meteo) -> an icon and a short word.
export function wmo(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return { icon: '🌡️', word: 'Unknown', wet: false, storm: false };
  if (c === 0) return { icon: '☀️', word: 'Clear', wet: false, storm: false };
  if (c <= 2) return { icon: '🌤️', word: 'Partly cloudy', wet: false, storm: false };
  if (c === 3) return { icon: '☁️', word: 'Overcast', wet: false, storm: false };
  if (c === 45 || c === 48) return { icon: '🌫️', word: 'Foggy', wet: false, storm: false };
  if (c >= 51 && c <= 57) return { icon: '🌦️', word: 'Drizzle', wet: true, storm: false };
  if (c >= 61 && c <= 67) return { icon: '🌧️', word: 'Rain', wet: true, storm: false };
  if (c >= 80 && c <= 82) return { icon: '🌦️', word: 'Showers', wet: true, storm: false };
  if (c >= 95) return { icon: '⛈️', word: 'Thunderstorm', wet: true, storm: true };
  return { icon: '⛅', word: 'Mixed', wet: false, storm: false };
}

// One honest sentence about whether now is a good time to go. Only says what the numbers say.
export function verdict({ code, wind, rainChance } = {}) {
  const w = wmo(code);
  if (w.storm) return { tone: 'bad', text: 'Storms around. Better to wait for another day.' };
  if (w.wet || rainChance >= 70) return { tone: 'meh', text: 'Wet out there. Bring a rain jacket and watch your footing.' };
  if (wind >= 35) return { tone: 'meh', text: 'Windy today. If your trip involves a boat, check with the boatmen first.' };
  if (rainChance >= 40) return { tone: 'ok', text: 'Mostly fine, with a chance of rain. Pack a light cover.' };
  return { tone: 'good', text: 'Looking good. A fine time to go.' };
}

// The best day of a forecast: lowest rain chance, the earliest day wins a tie. Returns an index, or -1.
export function bestDayIndex(days = []) {
  let best = -1;
  let low = Infinity;
  days.forEach((d, i) => {
    const r = Number.isFinite(d?.rain) ? d.rain : 100;
    if (r < low) { low = r; best = i; }
  });
  return best;
}

// "2026-11-13T05:34" -> "5:34 am". Bad input gives ''.
export function clock(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
}

// Minutes since midnight on the clock of Manila (the site is about Southern Leyte), wherever the visitor is.
export function manilaMinutes(now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    return Number(parts.find((x) => x.type === 'hour').value) * 60 + Number(parts.find((x) => x.type === 'minute').value);
  } catch { return (now.getUTCHours() * 60 + now.getUTCMinutes() + 480) % 1440; }
}
const toMinutes = (iso) => { const m = /T(\d{2}):(\d{2})/.exec(String(iso || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : NaN; };

// How far the sun is along its way from sunrise (0) to sunset (1), for the arc. Before sunrise it is 0, after sunset 1.
export function sunFraction(rise, set, nowMinutes = manilaMinutes()) {
  const a = toMinutes(rise);
  const b = toMinutes(set);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.min(1, Math.max(0, (nowMinutes - a) / (b - a)));
}

// "2026-11-13" -> "Fri". Bad input gives ''.
export function weekday(date) {
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short' });
}

// ---- money ----
export function splitCost(perPerson, people) {
  const p = Math.max(1, Math.floor(Number(people) || 1));
  const each = Math.max(0, Number(perPerson) || 0);
  return { people: p, each, total: each * p };
}
export const peso = (n) => `₱${Math.round(Number(n) || 0).toLocaleString('en-PH')}`;

// ---- "good for" tags, taken from fields the spot already has ----
export function goodFor(spot) {
  const tags = [];
  const budget = Number(spot?.estimatedBudget);
  const free = /^(free|none|no fee|0)$/i.test(String(spot?.entranceFee || '').trim());
  if (free) tags.push('No entrance fee');
  if (Number.isFinite(budget) && budget > 0 && budget <= 500) tags.push('Light on the wallet');
  if (spot?.difficulty === 'easy') tags.push('Easy-going');
  if (spot?.difficulty === 'hard') tags.push('For the adventurous');
  const act = (spot?.activities || []).length;
  if (act >= 4) tags.push('Lots to do');
  const dur = String(spot?.recommendedDuration || '');
  if (/\b(1|2)\s*(hour|hr)|half/i.test(dur)) tags.push('Quick stop');
  if (/\b(full|whole)\s*day|overnight|\b(2|3)\s*days?/i.test(dur)) tags.push('Make a day of it');
  return tags.slice(0, 5);
}

// ---- food ----
const MOOD = {
  restaurant: 'Lunch and dinner',
  cafe: 'Coffee and a chat',
  bakery: 'Breakfast and merienda',
  fast_food: 'A quick bite',
  food_shop: 'Take-away',
  restobar: 'Dinner and drinks',
  eatery: 'Home-style meals',
  food_stall: 'Street snacks',
  market: 'Fresh finds',
};
export function foodMood(spot) {
  return MOOD[String(spot?.entryType || '').toLowerCase()] || '';
}
export function priceTier(spot) {
  const b = Number(spot?.estimatedBudget);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b <= 150) return 'Budget-friendly';
  if (b <= 400) return 'Mid-range';
  return 'Treat yourself';
}

// Ranks for the "places I have tried" counter.
export const RANKS = [
  [0, 'Just hungry'],
  [1, 'First bite'],
  [3, 'Local taster'],
  [6, 'Food explorer'],
  [10, 'Southern Leyte foodie'],
  [20, 'Kusina legend'],
];
export function rankFor(count) {
  let name = RANKS[0][1];
  let next = RANKS[1];
  RANKS.forEach(([min, label], i) => { if (count >= min) { name = label; next = RANKS[i + 1] || null; } });
  return { name, next: next ? { at: next[0], name: next[1], left: next[0] - count } : null };
}

// ---- tiny local store (this device only). Never throws. ----
export function readList(key) {
  try { const v = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeList(key, list) {
  try { window.localStorage.setItem(key, JSON.stringify(list)); } catch { /* blocked or full: nothing to do */ }
}
