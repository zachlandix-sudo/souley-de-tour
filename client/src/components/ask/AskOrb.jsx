// The guide's compass. A breathing warm glow, a ring of tick marks that turns, and a needle that wanders while idle
// and swings hard while the guide is thinking. No expanding rings (the owner dislikes sonar). Look: index.css, block "ask: the guide".
export default function AskOrb({ state = 'idle', size = 'lg', className = '' }) {
  return (
    <span aria-hidden="true" data-state={state} className={`ask-orb ask-orb-${size} ${className}`}>
      <span className="ask-orb-glow" />
      <svg viewBox="0 0 120 120" focusable="false">
        <g className="ask-orb-ring">
          <circle cx="60" cy="60" r="54" pathLength="360" strokeDasharray="1 9" />
          <circle cx="60" cy="60" r="47" pathLength="4" strokeDasharray=".04 .96" className="cardinal" />
        </g>
        <circle cx="60" cy="60" r="40" className="ask-orb-edge" />
        <g className="ask-orb-needle">
          <polygon points="60,22 67,60 53,60" className="n" />
          <polygon points="60,98 67,60 53,60" className="s" />
        </g>
        <circle cx="60" cy="60" r="4.2" className="ask-orb-pin" />
      </svg>
    </span>
  );
}
