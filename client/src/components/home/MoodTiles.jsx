import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MOODS, moodLink } from '../../utils/homeFinder';
import LiveContours from '../LiveContours';
import CalmTitle from '../CalmTitle';
import { useInViewOnce } from '../../hooks/useInViewOnce';
import { useI18n } from '../../i18n/I18nContext';
import { findPhoto } from '../../services/photoService';

// One line-drawn glyph and one tint per mood. The tint only colours the glow and the depth lines;
// all text stays white on near-black so contrast never depends on the mood.
const LOOK = {
  waterfall: { tint: '#3fb6c9', d: 'M8 3v7M12 3v11M16 3v8M3 19c2.4-2 4.6-2 7 0s4.6 2 7 0 2.6-1.6 4-1' },
  beach: { tint: '#f0b56a', d: 'M12 5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM3 18c2.7-2 5.3-2 9 0s6.3 2 9 0M12 1.5V3M4.6 4.6l1.1 1.1M19.4 4.6l-1.1 1.1' },
  cheap: { tint: '#d9a441', d: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 8h4.2a2.4 2.4 0 0 1 0 4.8H9M9 8v8.5M7.3 14.6h6' },
  rain: { tint: '#7f95c4', d: 'M7.5 14.5a3.8 3.8 0 0 1 .4-7.6 5 5 0 0 1 9.4 1.6 3 3 0 0 1-.2 6M9 17.5l-1 2.5M13 17.5l-1 2.5M17 17.5l-1 2.5' },
  top: { tint: '#ff6a13', d: 'm12 3 2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.5l6.4-.6Z' },
  adventure: { tint: '#ff7a45', d: 'm3 19 6-11 3.5 6 2-3L21 19ZM15.5 5.5l1.5 2.3 1.5-2.3' },
};

// A photo for each mood. Three layers, in this order:
//   1. your own file in client/public/moods/<id>.jpg (wins if it exists)
//   2. a real photo the server finds from the words below (GET /api/photos, Unsplash / Pexels / Wikimedia Commons)
//   3. nothing: the card keeps its contour lines, so there is never a hole or a broken-image icon.
// The search words are written to match each card's text; change them here to get different pictures.
const PHOTO_QUERY = {
  waterfall: 'waterfall Philippines',
  beach: 'tropical beach Philippines',
  cheap: 'Filipino street food',
  rain: 'cave Philippines',
  top: 'Philippines island sunrise',
  adventure: 'mountain trail hiking Philippines',
};

export function usePhoto(query, enabled = true) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    if (!enabled || !query) return undefined;
    let live = true;
    findPhoto(query).then((p) => { if (live) setPhoto(p); });
    return () => { live = false; };
  }, [query, enabled]);
  return photo;
}

// `own` = your file's address, `photo` = what the server found. Fades in once an image has really loaded;
// the photographer's credit (a licence condition) shows only while that found photo is the one on screen.
export function MoodPhoto({ own = '', photo = null }) {
  const list = [own, photo?.url].filter(Boolean);
  const key = list.join('|');
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { setIdx(0); setReady(false); }, [key]);
  const src = list[idx];
  if (!src) return null;
  return (
    <>
      <img
        key={src}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setReady(true)}
        onError={() => { setReady(false); setIdx((i) => i + 1); }}
        className={`mood-photo ${ready ? 'is-ready' : ''}`}
      />
      {ready && photo && src === photo.url && (
        <span className="mood-credit">Photo: {photo.credit} · {photo.source}</span>
      )}
    </>
  );
}

function MoodTilePhoto({ id, fetchNow }) {
  const photo = usePhoto(PHOTO_QUERY[id], fetchNow); // asks only once the row has scrolled into view
  return <MoodPhoto own={`/moods/${id}.jpg`} photo={photo} />;
}

export default function MoodTiles() {
  const { t, tx } = useI18n();
  const [active, setActive] = useState(MOODS[0]?.id);
  const [rowRef, phase] = useInViewOnce();
  return (
    <section aria-labelledby="mood-title" className="mood mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mood-head">
        <CalmTitle as="h2" id="mood-title" className="text-4xl sm:text-6xl" text={t('mood.title')} />
        <p className="mood-lead">{t('mood.lead')}</p>
      </div>
      <ul ref={rowRef} className={`mood-row mt-10 ${phase === 'armed' ? 'is-armed' : phase === 'in' ? 'is-in' : ''}`}>
        {MOODS.map((m, n) => {
          const look = LOOK[m.id] || LOOK.top;
          const on = active === m.id;
          return (
            <li key={m.id} className="mood-panel" data-on={on} style={{ '--tint': look.tint, '--i': n }}
              onPointerEnter={() => setActive(m.id)} onFocus={() => setActive(m.id)}>
              <Link to={moodLink(m)} className="mood-link group">
                <MoodTilePhoto id={m.id} fetchNow={phase !== 'armed'} />
                <LiveContours seed={m.id} width={560} height={460} levels={10} cell={14} hoverOnly={!on} className="mood-lines" />
                <span aria-hidden="true" className="mood-glow" />
                <svg aria-hidden="true" viewBox="0 0 24 24" className="mood-glyph"><path d={look.d} /></svg>
                <span aria-hidden="true" className="mood-rail font-display">{tx(m.title)}</span>
                <span className="mood-body">
                  <span className="mood-title font-display">{tx(m.title)}</span>
                  <span className="mood-blurb">{tx(m.blurb)}</span>
                  <span className="mood-cta">
                    {t('mood.cta')}
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
