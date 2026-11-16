import { useEffect, useRef, useState } from 'react';
import Reveal from '../Reveal';
import JourneyPhoto from './JourneyPhoto';
import { useI18n } from '../../i18n/I18nContext';

// "Good to know before you go": five stages of a trip, from planning to coming home.
// A row of big numerals is the index (click one, or use the arrows); the stage below swaps with a soft fade.
// All words live in i18n (hp.journey.<id>.*), so it follows the language switch like the rest of the home page.
const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;
// Photos per stage, tried in order: your own file in client/public/journey/ first, then the web photo, then spares.
const STAGES = [
  { id: 'plan', images: ['/journey/plan.jpg', U('photo-1476514525535-07fb3b4ae1f5'), U('photo-1488085061387-422e29b40080'), U('photo-1476611338391-6f395a0ebc7b')] },
  { id: 'pack', images: ['/journey/pack.jpg', U('photo-1553062407-98eeb64c6a62'), U('photo-1530789253388-582c481c54b0'), U('photo-1488085061387-422e29b40080')] },
  { id: 'prepare', images: ['/journey/prepare.jpg', U('photo-1488646953014-85cb44e25828'), U('photo-1469474968028-56623f02e42e'), U('photo-1476611338391-6f395a0ebc7b')] },
  { id: 'explore', images: ['/journey/explore.jpg', U('photo-1501785888041-af3ef285b470'), U('photo-1507525428034-b723cf961d3e'), U('photo-1506905925346-21bda4d32df4')] },
  { id: 'ret', images: ['/journey/return.jpg', U('photo-1500534623283-312aade485b7'), U('photo-1469474968028-56623f02e42e'), U('photo-1506905925346-21bda4d32df4')] },
];
const TASKS = [1, 2, 3, 4];
const pad = (n) => String(n).padStart(2, '0');

export default function TravelJourney() {
  const { t } = useI18n();
  const [active, setActive] = useState(0); // which numeral is lit (moves at once)
  const [shown, setShown] = useState(0); // which stage's words are on screen (swaps mid-fade)
  const [phase, setPhase] = useState('idle'); // idle -> out -> in -> idle
  const [ticked, setTicked] = useState({}); // checklist ticks, e.g. { 'plan-2': true }
  const busy = useRef(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = (i) => {
    if (busy.current || i === active || i < 0 || i >= STAGES.length) return;
    busy.current = true;
    setActive(i);
    setPhase('out');
    timers.current.push(
      setTimeout(() => {
        setShown(i);
        setPhase('in');
        timers.current.push(setTimeout(() => { setPhase('idle'); busy.current = false; }, 700));
      }, 300),
    );
  };

  const s = STAGES[shown];
  const k = (key) => t(`hp.journey.${s.id}.${key}`);

  return (
    <section aria-labelledby="tips-title" className="jr">
      <div className="jr-wrap">
        <Reveal className="jr-head">
          <span className="jr-kicker">{t('hp.journey.kicker')} · 01—05</span>
          <h2 id="tips-title">{t('hp.tips.title')}</h2>
          <p>{t('hp.tips.lead')}</p>
        </Reveal>

        <div className="jr-index" role="tablist" aria-label={t('hp.journey.tabs')}>
          {STAGES.map((st, i) => (
            <button
              key={st.id}
              type="button"
              role="tab"
              id={`jr-tab-${st.id}`}
              aria-selected={i === active}
              aria-controls="jr-panel"
              className={`jr-tab ${i === active ? 'is-active' : ''} ${i <= active ? 'is-done' : ''}`}
              onClick={() => go(i)}
            >
              <i className="jr-bar" aria-hidden="true" />
              <b>{pad(i + 1)}</b>
              <span>{t(`hp.journey.${st.id}.tab`)}</span>
            </button>
          ))}
        </div>

        <div className="jr-stage" id="jr-panel" role="tabpanel" aria-labelledby={`jr-tab-${STAGES[active].id}`} aria-live="polite">
          <figure className={`jr-photo ${phase === 'out' ? 'is-changing' : ''}`} aria-hidden="true">
            <JourneyPhoto sources={s.images} label={t(`hp.journey.${s.id}.tab`)} />
            <span className="jr-ghost" aria-hidden="true">{pad(shown + 1)}</span>
            <figcaption><b>{t(`hp.journey.${s.id}.tab`)}</b> · {pad(shown + 1)} / {pad(STAGES.length)}</figcaption>
          </figure>

          <div className={`jr-copy ${phase === 'out' ? 'is-out' : ''} ${phase === 'in' ? 'is-in' : ''}`}>
            <span className="jr-label">{k('label')}</span>
            <h3>
              {k('t1')}
              <br />
              <em>{k('t2')}</em>
            </h3>
            <p className="jr-desc">{k('desc')}</p>

            <ul className="jr-tasks">
              {TASKS.map((n) => {
                const id = `${s.id}-${n}`;
                return (
                  <li key={n}>
                    <button type="button" aria-pressed={!!ticked[id]} className={`jr-task ${ticked[id] ? 'is-ticked' : ''}`} onClick={() => setTicked((o) => ({ ...o, [id]: !o[id] }))}>
                      <i aria-hidden="true" className="jr-tick"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" /></svg></i>
                      <b aria-hidden="true">{pad(n)}</b>
                      <span>{k(`k${n}`)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="jr-foot">
              <span className="jr-count">{TASKS.filter((n) => ticked[`${s.id}-${n}`]).length} / {TASKS.length}<i aria-hidden="true"><u style={{ width: `${(TASKS.filter((n) => ticked[`${s.id}-${n}`]).length / TASKS.length) * 100}%` }} /></i></span>
              <div className="jr-nav">
                <button type="button" aria-label={t('hp.journey.prev')} disabled={active === 0} onClick={() => go(active - 1)}>←</button>
                <button type="button" aria-label={t('hp.journey.next')} disabled={active === STAGES.length - 1} onClick={() => go(active + 1)}>→</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
