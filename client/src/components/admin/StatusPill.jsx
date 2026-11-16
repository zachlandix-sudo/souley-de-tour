const TONE = { published: 'ok', active: 'ok', approved: 'ok', pending: 'warn', suspended: 'bad', rejected: 'bad', draft: 'idle', archived: 'idle' };

// A small dot and a word: green = live, orange = waiting, red = blocked, grey = quiet.
export default function StatusPill({ status, label }) {
  return <span className={`adm-pill adm-pill-${TONE[status] || 'idle'}`}><i aria-hidden="true" />{label || status}</span>;
}
