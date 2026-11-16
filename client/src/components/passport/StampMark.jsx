import { useId } from 'react';
import { STAMP_INKS } from '../../utils/passport';

// A passport stamp drawn as SVG: a postmark-style outline (round, scalloped, octagon or a boxed visa mark),
// the town curved around it, a big day, month and year, and a band that says how it was earned.
// The ink is lightly roughened with an SVG filter (kept gentle so the town and date always stay readable), with a faint
// second strike, like a real rubber stamp. A soft ink-wash fills the stamp so it reads as a solid mark, even on a dark page.
// `ghost` draws the empty outline that is waiting for a stamp. Decorative only: the caller writes the date as text.
const TAU = Math.PI * 2;
const pt = (r, a) => [60 + r * Math.sin(a), 60 - r * Math.cos(a)];
const poly = (pts) => `${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')}Z`;
const SCALLOP = poly(Array.from({ length: 192 }, (_, i) => { const a = (i / 192) * TAU; return pt(55 + 2.4 * Math.cos(a * 24), a); }));
const octagon = (r) => poly(Array.from({ length: 8 }, (_, i) => pt(r, (i / 8) * TAU + TAU / 16)));
const STAR = 'M60 30L62.2 36.2L68.5 37.6L62.2 39L60 45.4L57.8 39L51.5 37.6L57.8 36.2Z';

const WASH = { round: 55, scallop: 54, octagon: 57 };

function Outline({ shape }) {
  if (shape === 'scallop') return <><path d={SCALLOP} className="sm-line" strokeWidth="3" /><circle cx="60" cy="60" r="49.5" className="sm-line" strokeWidth="1" /></>;
  if (shape === 'octagon') return <><path d={octagon(58)} className="sm-line" strokeWidth="3.4" strokeLinejoin="round" /><path d={octagon(53.2)} className="sm-line" strokeWidth="1" strokeLinejoin="round" /></>;
  return <><circle cx="60" cy="60" r="56" className="sm-line" strokeWidth="3.4" /><circle cx="60" cy="60" r="51.5" className="sm-line" strokeWidth="1" /></>;
}

export default function StampMark({ shape = 'round', ink = STAMP_INKS[0], seed = 1, town = '', day = '', mon = '', year = '', method = 'gps', ghost = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const name = String(town || 'Leyte').toUpperCase().slice(0, 18);
  const label = method === 'manual' ? 'HAND-MARKED' : 'GPS VERIFIED';
  const color = ghost ? '#d9cfae' : ink;
  const dash = ghost ? '3 3' : undefined;
  const nameSize = name.length > 12 ? 7 : 8.6;

  const circular = (
    <>
      {!ghost && shape === 'octagon' && <path d={octagon(WASH.octagon)} className="sm-wash" />}
      {!ghost && shape !== 'octagon' && <circle cx="60" cy="60" r={WASH[shape] || WASH.round} className="sm-wash" />}
      <Outline shape={shape} />
      <circle cx="60" cy="60" r="33" className="sm-line" strokeWidth="1.8" />
      <circle cx="60" cy="60" r="30.2" className="sm-line" strokeWidth="1" strokeDasharray=".9 2.4" strokeLinecap="round" />
      <path id={`${uid}t`} d="M21 60A39 39 0 0 1 99 60" fill="none" />
      <path id={`${uid}b`} d="M13.5 60A46.5 46.5 0 0 0 106.5 60" fill="none" />
      <text className="sm-t" fontSize={nameSize} textAnchor="middle"><textPath href={`#${uid}t`} startOffset="50%">{name}</textPath></text>
      {!ghost && <text className="sm-t" fontSize="7" textAnchor="middle"><textPath href={`#${uid}b`} startOffset="50%">{`\u2605 ${label} \u2605`}</textPath></text>}
      {!ghost && (
        <>
          <path d="M16.2 60l2.6-2.6 2.6 2.6-2.6 2.6zM98.6 60l2.6-2.6 2.6 2.6-2.6 2.6z" className="sm-fill" />
          <path d={STAR} className="sm-fill" transform="translate(0 -1.5)" />
          <path d="M43 48.5H77" className="sm-line" strokeWidth="1.2" strokeLinecap="round" />
          <text x="60" y="68.4" textAnchor="middle" className="sm-day" fontSize="30">{day}</text>
          <path d="M43 73H77" className="sm-line" strokeWidth="1.2" strokeLinecap="round" />
          <text x="60" y="82.2" textAnchor="middle" className="sm-t" fontSize="9.2">{String(mon).toUpperCase()}</text>
          <text x="60" y="88.6" textAnchor="middle" className="sm-t" fontSize="6.2">{year}</text>
        </>
      )}
      {ghost && <path d={STAR} className="sm-fill" />}
    </>
  );

  const boxed = (
    <>
      {!ghost && <rect x="8" y="16" width="104" height="88" rx="8" className="sm-wash" />}
      <rect x="8" y="16" width="104" height="88" rx="8" className="sm-line" strokeWidth="3.4" />
      <rect x="13" y="21" width="94" height="78" rx="4" className="sm-line" strokeWidth="1" />
      <text x="60" y="38" textAnchor="middle" className="sm-t" fontSize={name.length > 12 ? 8.6 : 11}>{name}</text>
      <path d="M20 43H100" className="sm-line" strokeWidth="1.1" strokeDasharray="1 2.4" strokeLinecap="round" />
      {ghost ? (
        <path d={STAR} className="sm-fill" transform="translate(0 17)" />
      ) : (
        <>
          <text x="40" y="80" textAnchor="middle" className="sm-day" fontSize="40">{day}</text>
          <path d="M65 50V80" className="sm-line" strokeWidth="1" strokeDasharray="1 2.4" strokeLinecap="round" />
          <text x="88" y="68" textAnchor="middle" className="sm-t" fontSize="13">{String(mon).toUpperCase()}</text>
          <text x="88" y="80" textAnchor="middle" className="sm-t" fontSize="8.4">{year}</text>
          <rect x="13" y="84" width="94" height="15" className="sm-band" mask={`url(#${uid}k)`} />
        </>
      )}
    </>
  );

  const art = <g strokeDasharray={dash}>{shape === 'rect' ? boxed : circular}</g>;

  if (ghost) return <svg aria-hidden="true" viewBox="0 0 120 120" className="sm-mark" style={{ color }}>{art}</svg>;
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className="sm-mark" style={{ color }}>
      <defs>
        <filter id={`${uid}w`} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed={seed} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.3 2.45" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="w" />
          <feTurbulence type="turbulence" baseFrequency=".04" numOctaves="1" seed={seed + 3} result="n2" />
          <feDisplacementMap in="w" in2="n2" scale="1.1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {shape === 'rect' && (
          <mask id={`${uid}k`} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
            <rect x="0" y="0" width="120" height="120" fill="#fff" />
            <text x="60" y="95.2" textAnchor="middle" className="sm-t" fontSize="7.6" fill="#000" style={{ fill: '#000' }}>{label}</text>
          </mask>
        )}
      </defs>
      <use href={`#${uid}g`} x="1" y=".8" opacity=".3" />
      <g id={`${uid}g`} filter={`url(#${uid}w)`}>{art}</g>
    </svg>
  );
}
