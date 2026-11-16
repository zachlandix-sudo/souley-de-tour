/* SOULEY de Tour service worker: offline app shell + cached spot data and photos. Bump VERSION to refresh caches. */
const VERSION = 'v2'; // v2: photos are only cached when the answer really is an image (a page returned for a missing photo used to be kept)
const SHELL = `souley-shell-${VERSION}`;
const DATA = `souley-data-${VERSION}`;
const MEDIA = `souley-media-${VERSION}`;
const TILES = `souley-tiles-${VERSION}`;
const KEEP = [SHELL, DATA, MEDIA, TILES];
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon.svg'];
const TILE_LIMIT = 250;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('souley-') && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

const networkFirst = async (req, name) => {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw err;
  }
};

const cacheFirst = async (req, name, limit) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  const type = res.headers.get('content-type') || '';
  const wantsImage = req.destination === 'image' || name === MEDIA;
  // A missing photo can come back as the app's HTML page with status 200; never keep that in place of the real photo.
  if (wantsImage && res.ok && !/^image\//.test(type)) return res;
  if (res.ok || res.type === 'opaque') {
    cache.put(req, res.clone());
    if (limit) trim(name, limit);
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page navigations: network first, fall back to the cached app shell (single-page app).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  // Public read-only API data: browse spots, categories and reviews offline after a first visit. Never cache auth/user/admin/ai.
  if (/\/api\/(tourist-spots|categories)(\/|$|\?)/.test(url.pathname + url.search)) {
    e.respondWith(networkFirst(req, DATA));
    return;
  }
  if (url.pathname.includes('/api/')) return;
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(cacheFirst(req, TILES, TILE_LIMIT));
    return;
  }
  if (url.origin === self.location.origin && /^\/(spots|auth)\//.test(url.pathname)) {
    e.respondWith(cacheFirst(req, MEDIA, 150));
    return;
  }
  // Built JS/CSS (hashed file names) and fonts.
  if ((url.origin === self.location.origin && /^\/assets\//.test(url.pathname)) || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(req, SHELL));
  }
});
