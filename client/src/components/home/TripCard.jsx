import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal';
import LiveContours from '../LiveContours';
import SplitText from './SplitText';
import { useI18n } from '../../i18n/I18nContext';

// Per-trip tint (glow, depth lines, route) and a big line-drawn watermark. Text stays light on near-black.
const LOOK = {
  maasin: { tint: '#f0b56a', d: 'M3 20h18M5 20V10l7-6 7 6v10M9.5 20v-5.5h5V20M12 4V2M10 8h4' },
  dive: { tint: '#3fb6c9', d: 'M2 9c3-2.4 5-2.4 8 0s5 2.4 8 0M2 14c3-2.4 5-2.4 8 0s5 2.4 8 0M2 19c3-2.4 5-2.4 8 0s5 2.4 8 0M16 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0' },
  island: { tint: '#ff8a4c', d: 'M12 4.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4ZM2 16c3-2.4 5-2.4 8 0s5 2.4 8 0M5 20c2-1.4 3.6-1.4 5.5 0M12 1.5V3M5 4.5l1 1M19 4.5l-1 1' },
  falls: { tint: '#5fd3a6', d: 'M8 2v8M12 2v12M16 2v9M3 19c2.4-2 4.6-2 7 0s4.6 2 7 0 2.6-1.6 4-1M6 12l-2 7M18 12l2 7' },
};
// Rising embers: three per card, deterministic so the markup never shifts between renders.
const EMBERS = [[14, 6.5, 0], [52, 7.5, 2.6], [86, 7, 4.8]];

export default function TripCard({ id, index, route, to, town }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  const look = LOOK[id] || LOOK.maasin;
  const stops = route.split(' → ');
  const len = t(`hp.ideas.${id}.length`);
  const num = len.match(/\d+/)?.[0];
  const rest = num ? len.replace(num, '').trim() : len;
  // "Plan with AI" opens Ask with this route already typed in, so the guide can adjust it to the visitor's dates and budget.
  const askTo = `/ask?q=${encodeURIComponent(`Plan a ${num ? `${num}-day ` : ''}trip: ${stops.join(', ')}`)}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The spotlight follows the pointer. Written straight to CSS variables: no re-render per move.
  const move = (e) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <Reveal as="li" delay={(index % 2) * 0.14} className="trip-item" data-col={index % 2}>
      <article ref={ref} data-seen={seen} className="trip-card" style={{ '--tint': look.tint, '--i': index }} onPointerMove={move}>
        <span aria-hidden="true" className="trip-chamfer" />
        {['tl', 'tr', 'bl'].map((c) => <svg key={c} aria-hidden="true" viewBox="0 0 10.5 10.5" className={`trip-br trip-br--${c}`}><path d="M0 0.5H10V10.5" /></svg>)}
        <LiveContours seed={`trip-${id}`} width={560} height={460} levels={8} cell={14} hoverOnly className="trip-lines" />
        <span aria-hidden="true" className="trip-spot" />
        <svg aria-hidden="true" viewBox="0 0 24 24" className="trip-mark"><path d={look.d} /></svg>
        {EMBERS.map(([x, s, d], k) => <i key={k} aria-hidden="true" className="trip-ember" style={{ '--x': `${x}%`, '--dur': `${s}s`, '--dl': `${d}s` }} />)}

        <div className="trip-top">
          <span className="trip-days">
            <svg aria-hidden="true" viewBox="0 0 64 64" className="trip-ring"><circle cx="32" cy="32" r="29" /></svg>
            <span className="trip-num font-display"><b>{num || '•'}</b></span>
          </span>
          <span className="trip-len">{rest}</span>
          {town && (
            <span className="trip-town">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.5s-6.6-5.7-6.6-11.2a6.6 6.6 0 0 1 13.2 0c0 5.5-6.6 11.2-6.6 11.2Z" /><circle cx="12" cy="10.3" r="2.3" /></svg>
              {town}
            </span>
          )}
        </div>

        <h3 className="trip-title font-display"><SplitText by="word" stagger={110} delay={index * 90 + 250} text={t(`hp.ideas.${id}.title`)} /></h3>
        <p className="trip-body"><SplitText by="word" stagger={26} delay={index * 90 + 600} text={t(`hp.ideas.${id}.body`)} /></p>

        <ol className="trip-route">
          {stops.map((s, k) => (
            <li key={s} style={{ '--k': k }} className={k === stops.length - 1 ? 'is-last' : ''}>
              <span aria-hidden="true" className="trip-dot" />
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="trip-actions">
          <Link to={to} className="trip-btn">
            {t('hp.ideas.spots')}
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
          </Link>
          <Link to={askTo} className="trip-btn trip-btn--ghost">{t('hp.ideas.ask')}</Link>
        </div>
      </article>
    </Reveal>
  );
}
