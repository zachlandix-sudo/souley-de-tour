import { useCallback, useEffect, useRef, useState } from 'react';
import SpotImage from '../SpotImage';
import { pickRandom, typeLabel } from '../../utils/food';

const TICKS = 14;

// "Spin the plate": picks one place at random from the list the visitor is looking at (so it respects every filter),
// flicks through names for a moment, then lands. It never lands on the same place twice in a row. With reduced motion it
// lands at once. `onOpen` opens the place in the quick view; `trip` is the food-trip list so the pick can be added.
export default function FoodRoulette({ pool, onOpen, onClose, trip }) {
  const [pick, setPick] = useState(null);
  const [flick, setFlick] = useState('');
  const [rolling, setRolling] = useState(false);
  const last = useRef(null);
  const timer = useRef(null);
  const poolRef = useRef(pool);
  poolRef.current = pool;

  const roll = useCallback(() => {
    clearInterval(timer.current);
    const list = poolRef.current;
    const winner = pickRandom(list, last.current);
    if (!winner) { setPick(null); setRolling(false); return; }
    const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (calm || list.length < 2) { last.current = winner.slug; setPick(winner); setRolling(false); return; }
    setRolling(true);
    setPick(null);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      setFlick(list[Math.floor(Math.random() * list.length)].name);
      if (n >= TICKS) {
        clearInterval(timer.current);
        last.current = winner.slug;
        setRolling(false);
        setPick(winner);
      }
    }, 80);
  }, []);

  useEffect(() => { roll(); return () => clearInterval(timer.current); }, [roll]);

  const empty = !rolling && !pick;
  const kind = pick ? typeLabel(pick) : '';
  const inTrip = pick && trip ? trip.has(pick.slug) : false;

  return (
    <section className={`frl ${rolling ? 'is-rolling' : ''}`} aria-label="Spin the plate" aria-live="polite">
      <button type="button" className="ffl-x frl-x" onClick={onClose} aria-label="Close the plate spinner">&times;</button>
      {empty ? (
        <p className="frl-empty">Nothing to pick from. Loosen a filter and spin again.</p>
      ) : rolling ? (
        <p className="frl-flick" aria-hidden="true">{flick}</p>
      ) : (
        <div className="frl-card">
          <span className="frl-photo"><SpotImage src={pick.images?.[0]} fallbacks={pick.images?.slice(1)} slug={pick.slug} alt="" className="h-full w-full" /></span>
          <div className="frl-text">
            <p className="frl-kicker">Try this one</p>
            <h3>{pick.name}</h3>
            <p className="frl-sub">{[kind, pick.municipality].filter(Boolean).join(' · ')}</p>
            <div className="frl-btns">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpen(pick)}>See details</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={roll}>Spin again</button>
              {trip && (
                <button type="button" className="btn btn-outline btn-sm" aria-pressed={inTrip} disabled={!inTrip && trip.full} onClick={() => trip.toggle(pick.slug)}>
                  {inTrip ? 'In your food trip ✓' : 'Add to food trip'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {empty ? null : <p className="sr-only">{rolling ? 'Spinning…' : pick ? `Picked ${pick.name}` : ''}</p>}
    </section>
  );
}
