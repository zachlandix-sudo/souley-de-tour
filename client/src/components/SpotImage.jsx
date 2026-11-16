import { useEffect, useState } from 'react';
import PhotoHolder from './PhotoHolder';

// Shows the first photo that actually loads. `src` is tried first, then each of `fallbacks` in order, so a broken or
// missing first photo (like the /spots/<slug>.jpg placeholder from the import) never hides a working link added later.
// When none load, it shows the photo holder instead.
//   spot photos  -> client/public/spots/<slug>.jpg
export default function SpotImage({ src, fallbacks = [], alt, className = '', slug, path }) {
  const list = [src, ...fallbacks].filter(Boolean);
  const key = list.join('|');
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [key]);

  const current = list[idx];
  if (!current) {
    const expected = path || (slug ? `/spots/${slug}.jpg` : list.length && list[0].startsWith('/') ? list[0] : '');
    return <PhotoHolder alt={alt} seed={alt} path={expected} className={className} />;
  }
  // no-referrer: some photo hosts refuse to show images when the request says it came from another website.
  return <img key={current} src={current} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setIdx((i) => i + 1)} className={`object-cover ${className}`} />;
}
