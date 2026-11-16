import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SpotImage from '../SpotImage';
import SaveHeart from './SaveHeart';
import FoodFun from './FoodFun';
import { directionsUrl, typeLabel, visitorBlurb } from '../../utils/food';
import { formatKm } from '../../utils/geo';

const hoursText = (h) => {
  if (!h) return '';
  if (typeof h === 'string') return h;
  const rows = Object.entries(h).filter(([, v]) => v);
  return rows.map(([d, v]) => `${d} ${v}`).join(' · ');
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// The slide-in panel for one food place. A real dialog: Escape and a click on the dark area close it, Tab stays inside it,
// the page behind does not scroll, and focus goes back to the card that opened it. Left/Right arrow keys step through the
// places in the grid, so a visitor can browse without closing it. Wide screens get a photo pane and a details pane side by side.
export default function FoodQuickView({ spot, position, total, onClose, onStep, onShowOnMap, onPick, related = [], fav, trip = null }) {
  const box = useRef(null);
  const closeBtn = useRef(null);
  const opener = useRef(null);
  const kind = typeLabel(spot);
  const blurb = visitorBlurb(spot);
  const list = (spot.images || []).filter(Boolean);
  const [shot, setShot] = useState(0);
  const [copied, setCopied] = useState(false);
  const touchX = useRef(null);
  useEffect(() => { setShot(0); setCopied(false); }, [spot._id]);
  const copyAddress = async () => {
    try { await navigator.clipboard.writeText(spot.address); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked: ignore */ }
  };
  const swipe = (e) => {
    const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
    touchX.current = null;
    if (onStep && Math.abs(dx) > 60) onStep(dx < 0 ? 1 : -1);
  };

  useEffect(() => {
    opener.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (opener.current && document.contains(opener.current)) opener.current.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowRight' && onStep && !e.target.closest?.('input, textarea, select')) { onStep(1); return; }
      if (e.key === 'ArrowLeft' && onStep && !e.target.closest?.('input, textarea, select')) { onStep(-1); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  const facts = [
    ['Town', spot.municipality],
    spot.barangay && ['Barangay', spot.barangay],
    spot.distanceKm != null && ['From you', formatKm(spot.distanceKm)],
    spot.estimatedBudget > 0 && ['Typical spend', `₱${Number(spot.estimatedBudget).toLocaleString()}`],
  ].filter(Boolean);
  const hours = hoursText(spot.openingHours);
  const pct = total > 0 ? Math.min(100, Math.round((position / total) * 100)) : 0;

  return (
    <div className="fq-root" role="presentation">
      <div className="fq-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={box} role="dialog" aria-modal="true" aria-label={`${spot.name}, quick view`} className="fq-panel">
        <div className="fq-photo" onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={swipe}>
          <SpotImage key={`${spot._id}-${shot}`} src={list[shot]} fallbacks={shot === 0 ? list.slice(1) : []} slug={spot.slug} alt={spot.name} className="fq-img h-full w-full" />
          <span aria-hidden="true" className="fq-photo-shade" />
          {kind && <span className="fq-type">{kind}</span>}
          <span aria-hidden="true" className="fq-ghost">{String(position).padStart(2, '0')}</span>
          {list.length > 1 && (
            <div className="fq-dots">
              {list.map((src, i) => <button key={src + i} type="button" aria-label={`Photo ${i + 1}`} aria-current={i === shot} className={i === shot ? 'is-on' : ''} onClick={() => setShot(i)} />)}
            </div>
          )}
        </div>

        <div className="fq-body">
          <div className="fq-top">
            <p className="fq-count" aria-live="polite">{position} of {total}</p>
            <span aria-hidden="true" className="fq-progress"><i style={{ width: `${pct}%` }} /></span>
            <button ref={closeBtn} type="button" onClick={onClose} className="fq-close" aria-label="Close quick view">&times;</button>
          </div>

          <p className="fq-kicker">{[kind, spot.municipality].filter(Boolean).join(' · ')}</p>
          <h2 className="fq-name">{spot.name}</h2>
          <p className="fq-rating">
            {spot.reviewCount > 0
              ? <><b aria-hidden="true">★</b><span>{Number(spot.averageRating).toFixed(1)}</span><small>({spot.reviewCount} {spot.reviewCount === 1 ? 'review' : 'reviews'})</small></>
              : <small>No reviews yet</small>}
          </p>
          {blurb && <p className="fq-blurb">{blurb}</p>}

          <dl className="fq-facts">
            {facts.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
            {hours && <div className="is-wide"><dt>Hours</dt><dd>{hours}</dd></div>}
            {spot.address && (
              <div className="is-wide fq-addr">
                <div><dt>Address</dt><dd>{spot.address}</dd></div>
                <button type="button" className="fq-copy" onClick={copyAddress}>{copied ? 'Copied ✓' : 'Copy'}</button>
              </div>
            )}
          </dl>

          <p className="fq-note">The map pin is approximate. Directions searches Google Maps by name, so you land on the real storefront.</p>

          <FoodFun spot={spot} related={related} onPick={onPick} />

          <div className="fq-actions">
            <a href={directionsUrl(spot)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Directions <span aria-hidden="true">↗</span></a>
            <SaveHeart spot={spot} fav={fav} withLabel className="fq-save" />
            {trip && (
              <button type="button" className="btn btn-outline" aria-pressed={trip.has(spot.slug)} disabled={!trip.has(spot.slug) && trip.full} onClick={() => trip.toggle(spot.slug)}>
                {trip.has(spot.slug) ? 'On your food trip ✓' : trip.full ? 'Food trip is full' : 'Add to food trip'}
              </button>
            )}
            {onShowOnMap && <button type="button" className="btn btn-outline" onClick={() => onShowOnMap(spot)}>Show on map</button>}
            <Link to={`/spots/${spot.slug}`} className="fq-full">Open full page &rarr;</Link>
          </div>

          {onPick && related.length > 0 && (
            <section className="fq-related" aria-label={`More in ${spot.municipality}`}>
              <h3>More in {spot.municipality}</h3>
              <ul>
                {related.map((r) => (
                  <li key={r._id}>
                    <button type="button" onClick={() => onPick(r)}>
                      <span className="fq-rel-photo"><SpotImage src={r.images?.[0]} fallbacks={r.images?.slice(1)} slug={r.slug} alt="" className="h-full w-full" /></span>
                      <span className="fq-rel-text">
                        <b>{r.name}</b>
                        <small>{[typeLabel(r), r.reviewCount > 0 ? `★ ${Number(r.averageRating).toFixed(1)}` : ''].filter(Boolean).join(' · ')}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {onStep && total > 1 && (
            <div className="fq-step">
              <button type="button" onClick={() => onStep(-1)} aria-label="Previous place">&larr; Previous</button>
              <button type="button" onClick={() => onStep(1)} aria-label="Next place">Next &rarr;</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
