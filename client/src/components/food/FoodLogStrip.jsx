import { useState } from 'react';
import { rankFor } from '../../utils/fun';

// A slim "food log" line under the filters: how many places the visitor has stamped "I ate here", the rank that earns,
// a progress bar across all places, and shortcuts to list what is tried or still new. The log lives on this device only.
export default function FoodLogStrip({ tried = 0, total = 0, mode = '', onMode, onReset }) {
  const [sure, setSure] = useState(false);
  const rank = rankFor(tried);
  const pct = total > 0 ? Math.min(100, (tried / total) * 100) : 0;

  if (tried === 0) {
    return (
      <p className="fls fls-empty">
        <span aria-hidden="true">📒</span> Your food log is empty. Open any place and tap <b>I ate here</b> to start stamping.
      </p>
    );
  }
  return (
    <div className="fls" role="region" aria-label="Your food log">
      <p className="fls-main">
        <span aria-hidden="true">📒</span> <b>{tried}</b> of {total} tried · <span className="fls-rank">{rank.name}</span>
        {rank.next && <small> {rank.next.left} more for “{rank.next.name}”</small>}
      </p>
      <span className="fls-bar" aria-hidden="true"><i style={{ width: `${Math.max(2, pct)}%` }} /></span>
      <div className="fls-btns">
        <button type="button" aria-pressed={mode === 'tried'} onClick={() => onMode(mode === 'tried' ? '' : 'tried')}>Show tried</button>
        <button type="button" aria-pressed={mode === 'new'} onClick={() => onMode(mode === 'new' ? '' : 'new')}>Show new</button>
        {sure
          ? <button type="button" className="is-warn" onClick={() => { onReset(); setSure(false); }}>Yes, clear my log</button>
          : <button type="button" onClick={() => setSure(true)}>Reset</button>}
        {sure && <button type="button" onClick={() => setSure(false)}>Keep it</button>}
      </div>
    </div>
  );
}
