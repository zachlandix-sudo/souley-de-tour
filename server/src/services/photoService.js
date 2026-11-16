// Finds ONE real photo for a few words of text ("waterfall Philippines"). Used by the Home mood cards.
// Order of providers, first one that has a photo wins:
//   1. Unsplash  (needs UNSPLASH_ACCESS_KEY)   2. Pexels  (needs PEXELS_API_KEY)   3. Wikimedia Commons (no key at all)
// The keys stay on the server (the browser only ever sees the final picture address). Every answer is cached,
// so a busy home page costs a handful of provider calls per day, not one per visitor. Never throws: a provider
// that fails or finds nothing just passes the turn to the next one, and no photo at all is `null`.
const HIT_MS = 24 * 60 * 60 * 1000; // a found photo is kept for a day
const MISS_MS = 10 * 60 * 1000; // "nothing found / provider down" is retried after 10 minutes
const MAX_ENTRIES = 200;
const TIMEOUT_MS = 6000;
const UTM = 'utm_source=souley_de_tour&utm_medium=referral';
const UA = 'SOULEY-de-Tour/1.0 (tourism student project)';

const cache = new Map();
const clear = () => cache.clear();

const clean = (s, max = 120) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const https = (u) => typeof u === 'string' && u.startsWith('https://');
const normalise = (q) => clean(q, 80).toLowerCase();

async function getJSON(url, headers = {}, fetchImpl = global.fetch) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': UA, ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`photo provider ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function unsplash(q, env) {
  if (!env.UNSPLASH_ACCESS_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5&content_filter=high`;
  const body = await getJSON(url, { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` });
  const p = (body.results || []).find((r) => https(r?.urls?.regular));
  if (!p) return null;
  // Unsplash asks apps to report that a photo was used. Fire and forget; a failure here changes nothing.
  if (https(p.links?.download_location)) {
    getJSON(p.links.download_location, { Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}` }).catch(() => {});
  }
  return {
    url: p.urls.regular,
    credit: clean(p.user?.name) || 'Unsplash',
    creditUrl: https(p.user?.links?.html) ? `${p.user.links.html}?${UTM}` : `https://unsplash.com/?${UTM}`,
    source: 'Unsplash',
  };
}

async function pexels(q, env) {
  if (!env.PEXELS_API_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5`;
  const body = await getJSON(url, { Authorization: env.PEXELS_API_KEY });
  const p = (body.photos || []).find((r) => https(r?.src?.large2x || r?.src?.large));
  if (!p) return null;
  return {
    url: p.src.large2x || p.src.large,
    credit: clean(p.photographer) || 'Pexels',
    creditUrl: https(p.photographer_url) ? p.photographer_url : 'https://www.pexels.com/',
    source: 'Pexels',
  };
}

// Wikimedia Commons: free, no key. Slower to be "pretty" than Unsplash, so only real photographs (JPEG, wide enough) are taken.
async function commons(q) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12'
    + `&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}`
    + '&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200';
  const body = await getJSON(url);
  const pages = Object.values(body?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const pg of pages) {
    const info = pg.imageinfo?.[0];
    if (!info || info.mime !== 'image/jpeg' || (info.width || 0) < 1000 || !https(info.thumburl)) continue;
    const meta = info.extmetadata || {};
    const artist = clean(meta.Artist?.value, 60);
    const lic = clean(meta.LicenseShortName?.value, 30);
    return {
      url: info.thumburl,
      credit: [artist || 'Wikimedia Commons', lic].filter(Boolean).join(', '),
      creditUrl: https(info.descriptionurl) ? info.descriptionurl : 'https://commons.wikimedia.org/',
      source: 'Wikimedia Commons',
    };
  }
  return null;
}

async function searchPhoto(text, env = process.env) {
  const q = normalise(text);
  if (q.length < 2) return null;
  const hit = cache.get(q);
  if (hit && hit.until > Date.now()) return hit.photo;

  let photo = null;
  for (const provider of [unsplash, pexels, commons]) {
    try {
      photo = await provider(q, env);
    } catch (e) {
      console.error(`[photos] ${provider.name} failed: ${e.message}`); // never the key
      photo = null;
    }
    if (photo) break;
  }
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(q, { photo, until: Date.now() + (photo ? HIT_MS : MISS_MS) });
  return photo;
}

module.exports = { searchPhoto, clear };
