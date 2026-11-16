import { useEffect, useState } from 'react';
import { Burst, CostSplitter } from '../spot/SpotFun';
import { foodMood, priceTier, rankFor } from '../../utils/fun';
import { useLocalList } from '../../hooks/useLocalList';
import { triedKey } from '../../utils/food';

export const TRIED = 'souley:food-tried';

// The playful part of the food quick view: what the place is good for, a group-meal budget, an "I ate here" stamp that
// builds a little food-explorer rank, Share, and a Surprise me button. Everything personal stays on this device.
export default function FoodFun({ spot, related = [], onPick }) {
  const log = useLocalList(TRIED); // shared with the Food page, so its food-log line updates the moment a place is stamped
  const tried = log.list;
  const [go, setGo] = useState(0);
  const [shared, setShared] = useState(false);
  useEffect(() => { setShared(false); }, [spot._id]);
  const key = triedKey(spot);
  const here = tried.includes(key);
  const rank = rankFor(tried.length);
  const mood = foodMood(spot);
  const tier = priceTier(spot);

  const stamp = () => {
    log.toggle(key);
    if (!here) setGo((n) => n + 1);
  };
  const share = async () => {
    const url = `${window.location.origin}/spots/${spot.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2200); }
    } catch { /* cancelled or blocked: nothing to do */ }
  };
  const surprise = () => {
    if (!onPick || related.length === 0) return;
    onPick(related[Math.floor(Math.random() * related.length)]);
  };

  return (
    <div className="food-fun">
      {(mood || tier) && (
        <ul className="ff-tags" aria-label="Good for">
          {mood && <li><span aria-hidden="true">🍽️</span>{mood}</li>}
          {tier && <li><span aria-hidden="true">₱</span>{tier}</li>}
        </ul>
      )}

      <CostSplitter perPerson={spot.estimatedBudget} title="Eating as a group?" />

      <div className={`ff-stamp ${here ? 'is-on' : ''}`}>
        <button type="button" className="ff-stamp-btn" aria-pressed={here} onClick={stamp}>
          <span className="ff-seal" aria-hidden="true"><b>ATE</b><b>HERE</b></span>
          <span className="ff-stamp-text">{here ? 'Stamped. You ate here' : 'I ate here'}<small>{here ? 'Tap again to undo' : 'Stamp it in your food log'}</small></span>
        </button>
        <p className="ff-rank" aria-live="polite">
          <b>{tried.length}</b> {tried.length === 1 ? 'place' : 'places'} tried · <span>{rank.name}</span>
          {rank.next && <small> {rank.next.left} more to become “{rank.next.name}”</small>}
        </p>
        <Burst go={go} />
      </div>

      <div className="ff-row">
        <button type="button" className="ff-mini" onClick={share}>{shared ? 'Link copied ✓' : 'Share this place'}</button>
        {onPick && related.length > 0 && <button type="button" className="ff-mini is-hot" onClick={surprise}>Surprise me ✦</button>}
      </div>
      <p className="ff-fine">Your food log is saved on this device only.</p>
    </div>
  );
}
