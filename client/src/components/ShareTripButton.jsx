import { useState } from 'react';
import { tripToText } from '../utils/tripText';

// Uses the phone/OS share sheet when there is one, otherwise copies the plan as text.
export default function ShareTripButton({ trip }) {
  const [msg, setMsg] = useState('');
  const share = async () => {
    const text = tripToText(trip, window.location.origin);
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMsg('Copied to clipboard.');
    } catch (e) {
      if (e?.name !== 'AbortError') setMsg('Could not share. Copy it manually from the trip page.');
    }
    setTimeout(() => setMsg(''), 3000);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={share} className="btn btn-outline btn-sm">Share</button>
      <span role="status" className="text-xs text-muted">{msg}</span>
    </span>
  );
}
