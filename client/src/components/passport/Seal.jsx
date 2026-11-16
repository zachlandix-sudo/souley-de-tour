// A town badge: a wax-style rosette with the town around it. Decorative; the town name is also written next to it as text.
export default function Seal({ town, earned = true, size = 88 }) {
  const pts = 16;
  const d = Array.from({ length: pts * 2 }, (_, i) => {
    const a = (i / (pts * 2)) * Math.PI * 2, r = i % 2 ? 40 : 46;
    return `${i ? 'L' : 'M'}${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`;
  }).join('') + 'Z';
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" width={size} height={size} className={`pp-seal ${earned ? 'is-earned' : ''}`}>
      <path d={d} className="pp-seal-body" />
      <circle cx="50" cy="50" r="33" className="pp-seal-ring" />
      <path d="M50 26l4.6 20.4L50 74l-4.6-27.6z" className="pp-seal-needle" />
      <text x="50" y="88" textAnchor="middle" className="pp-seal-text">{town.slice(0, 12).toUpperCase()}</text>
    </svg>
  );
}
