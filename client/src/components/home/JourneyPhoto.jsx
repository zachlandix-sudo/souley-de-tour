import { useEffect, useState } from 'react';

// A photo that never leaves a hole. It tries each address in `sources` in turn (put your own file first, e.g.
// /journey/plan.jpg in client/public, then web photos), fades in once one has really loaded, and if none do
// it draws a quiet contour-and-compass picture instead, so the panel is never blank or shows a broken-image icon.
export default function JourneyPhoto({ sources = [], label = '' }) {
  const list = sources.filter(Boolean);
  const key = list.join('|');
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { setIdx(0); setReady(false); }, [key]);

  const src = list[idx];
  if (!src) {
    return (
      <svg aria-hidden="true" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="jr-art">
        <defs>
          <linearGradient id="jr-art-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a0a0a" /><stop offset="1" stopColor="#000000" /></linearGradient>
        </defs>
        <rect width="400" height="500" fill="url(#jr-art-sky)" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M-20 ${330 + i * 22} C 80 ${290 + i * 18}, 160 ${380 + i * 12}, 260 ${320 + i * 20} S 380 ${300 + i * 16}, 430 ${340 + i * 20}`} fill="none" stroke="#ff6a13" strokeOpacity={0.12 + i * 0.03} />
        ))}
        <circle cx="200" cy="170" r="62" fill="none" stroke="#ff6a13" strokeOpacity=".5" />
        <circle cx="200" cy="170" r="48" fill="none" stroke="#fff" strokeOpacity=".15" strokeDasharray="2 6" />
        <path d="M200 120l9 42-9 48-9-48z" fill="#ff6a13" />
        <text x="200" y="262" textAnchor="middle" fill="#fff" fillOpacity=".55" fontSize="11" letterSpacing="4">{label.toUpperCase()}</text>
      </svg>
    );
  }
  // no-referrer: some photo hosts refuse to show images when the request says it came from another website.
  return (
    <img
      key={src}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setReady(true)}
      onError={() => { setReady(false); setIdx((i) => i + 1); }}
      className={`jr-img ${ready ? 'is-ready' : ''}`}
    />
  );
}
