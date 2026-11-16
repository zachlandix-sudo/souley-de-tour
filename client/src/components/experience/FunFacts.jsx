import { useMemo, useRef, useState } from 'react';
import Reveal from '../Reveal';
import { useI18n } from '../../i18n/I18nContext';
import { FACTS, THEMES, CALENDAR } from '../../data/almanac';
import { entryOfTheDay, upcomingDates } from '../../utils/almanac';

// "Did you know?" as an almanac: an entry of the day, a short calendar of dates worth marking, then numbered flip cards.
// Read the question, guess, tap to turn the card. Pure CSS 3D; the answer stays in the DOM for screen readers.
// New styles use the alm- prefix on purpose: the .ff-* names are shared with the food panel's styles, so do not add new .ff names.
const FIRST = 6;
const LOCALES = { en: 'en-PH', fil: 'fil-PH', ceb: 'en-PH' };

function fmt(date, locale, opts) {
  try { return new Intl.DateTimeFormat(locale, opts).format(date); } catch { return new Intl.DateTimeFormat('en', opts).format(date); }
}

export default function FunFacts() {
  const { tx, lang } = useI18n();
  const locale = LOCALES[lang] || 'en-PH';
  const [today] = useState(() => new Date());
  const entry = useMemo(() => entryOfTheDay(FACTS, today), [today]);
  const coming = useMemo(() => upcomingDates(CALENDAR, today, 3), [today]);
  const [shown, setShown] = useState(FIRST);
  const [open, setOpen] = useState({});
  const [answerOpen, setAnswerOpen] = useState(false);
  const sectionRef = useRef(null);
  const moreRef = useRef(null);

  const flip = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const total = FACTS.length;
  const visible = FACTS.slice(0, shown);
  const allShown = shown >= total;
  const entryTheme = THEMES[entry.theme];

  const primary = () => {
    if (allShown) { setShown(FIRST); sectionRef.current?.scrollIntoView({ block: 'start' }); } else setShown((n) => Math.min(total, n + 12));
  };
  const showAll = () => { setShown(total); moreRef.current?.focus(); };

  return (
    <section ref={sectionRef} aria-labelledby="facts-title" className="ff">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <p className="alm-kicker">{tx('The Southern Leyte Almanac')}</p>
          <h2 id="facts-title" className="ff-title">{tx('Did you know?')}</h2>
          <p className="ff-lead">{tx('Dates, places and numbers from the province, one small story at a time. Guess first, then flip the card.')}</p>
        </Reveal>

        <Reveal className="alm-intro">
          <article className="alm-today" style={{ '--tint': entryTheme.tint }} aria-labelledby="alm-today-q">
            <div className="alm-date">
              <span className="alm-wd">{fmt(today, locale, { weekday: 'short' })}</span>
              <b className="alm-day font-display">{today.getDate()}</b>
              <span className="alm-mon">{fmt(today, locale, { month: 'short' })}</span>
            </div>
            <div className="alm-today-body">
              <p className="alm-eyebrow">{tx('Entry of the day')} · {tx('No.')} {entry.no} · {tx(entryTheme.label)}</p>
              <h3 id="alm-today-q" className="alm-today-q font-display">{tx(entry.q)}</h3>
              <p id="alm-today-a" className="alm-today-a" hidden={!answerOpen}>{tx(entry.a)}</p>
              <div className="alm-row">
                <button type="button" className="alm-btn is-hot" aria-expanded={answerOpen} aria-controls="alm-today-a" onClick={() => setAnswerOpen((v) => !v)}>
                  {answerOpen ? tx('Hide the answer') : tx('Show the answer')}
                </button>
                <span className="alm-fine">{tx('A new entry every day.')}</span>
              </div>
            </div>
          </article>

          <aside className="alm-cal" aria-labelledby="alm-cal-title">
            <h3 id="alm-cal-title" className="alm-cal-title">{tx('On the calendar')}</h3>
            <ol>
              {coming.map((c) => {
                const when = new Date(c.year, c.m - 1, c.d);
                return (
                  <li key={`${c.m}-${c.d}`} className={c.daysAway === 0 ? 'is-today' : ''}>
                    <span className="alm-chip" aria-hidden="true">
                      <b className="font-display">{c.d}</b>
                      <span>{fmt(when, locale, { month: 'short' })}</span>
                    </span>
                    <div>
                      <p className="alm-cal-text">{tx(c.text)}</p>
                      <span className="alm-cal-when">
                        <time dateTime={`${c.year}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`}>{fmt(when, locale, { month: 'long', day: 'numeric', year: 'numeric' })}</time>
                        {' · '}
                        {c.daysAway === 0 ? tx('Today') : `${c.daysAway} ${tx(c.daysAway === 1 ? 'day to go' : 'days to go')}`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>
        </Reveal>

        <ul className="ff-grid">
          {visible.map((f, i) => (
            <Reveal as="li" key={f.id} delay={(i % 3) * 0.12} className="ff-item">
              <button type="button" className="ff-card" aria-pressed={!!open[f.id]} onClick={() => flip(f.id)} style={{ '--tint': THEMES[f.theme].tint }}>
                <span className="ff-face ff-front">
                  <span className="alm-top">
                    <span className="ff-no font-display">{f.no}</span>
                    <span className="alm-theme">{tx(THEMES[f.theme].label)}</span>
                  </span>
                  <span className="ff-q font-display">{tx(f.q)}</span>
                  <span className="ff-tap">{tx('Tap to flip')}</span>
                </span>
                <span className="ff-face ff-back">
                  <span className="ff-a">{tx(f.a)}</span>
                </span>
              </button>
            </Reveal>
          ))}
        </ul>

        <div className="alm-more">
          <p className="alm-count" aria-live="polite">{visible.length} / {total} {tx('entries')}</p>
          <button ref={moreRef} type="button" className="alm-btn is-hot" onClick={primary}>
            {allShown ? tx('Show fewer') : tx('Show more')}
          </button>
          {!allShown && <button type="button" className="alm-btn" onClick={showAll}>{tx('Show all')}</button>}
        </div>
      </div>
    </section>
  );
}
