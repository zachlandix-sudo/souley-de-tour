// Registers the service worker in production builds only, so `npm run dev` is never cached.
export function registerSW() {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline mode is optional */ });
  });
}
