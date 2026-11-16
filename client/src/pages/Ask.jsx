import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { askAi } from '../services/aiService';
import { errorMessage } from '../utils/errors';
import Contours from '../components/Contours';
import { useIntroDelay } from '../components/IntroSplash';
import AskOrb from '../components/ask/AskOrb';
import Thinking from '../components/ask/Thinking';
import Reply from '../components/ask/Reply';
import Composer, { MAX_DAYS } from '../components/ask/Composer';
import Board from '../components/ask/Board';
import { useI18n } from '../i18n/I18nContext';

// Ideas shown before the first question. They differ by mode and none starts with "Ask", "Send" or "Plan" (the tests look for those button names).
const IDEAS = {
  recommend: [
    'Best waterfalls and caves in Southern Leyte',
    'Family-friendly spots with easy access',
    'Where can I go diving or snorkeling?',
    'Relaxing beaches near Maasin City',
  ],
  itinerary: [
    'A relaxed 2-day nature escape',
    'Weekend food trail around Maasin',
    '3 days around Sogod Bay with beaches',
    'A family day trip with easy access',
  ],
};

// Follow-up chips under the latest answer. `mode` / `days` switch the planner; the rest keep the current one.
const FOLLOW = {
  recommend: [{ key: 'ask.f.plan', mode: 'itinerary', days: 3 }, { key: 'ask.f.eat' }, { key: 'ask.f.kids' }, { key: 'ask.f.cmp' }],
  itinerary: [{ key: 'ask.f.relax', pace: 'relaxed' }, { key: 'ask.f.beach' }, { key: 'ask.f.cheap', budget: '5000' }, { key: 'ask.f.local' }],
};

// What the server needs to understand a short follow-up ("how much is it?", "something cheaper"): the last question and the places it showed.
function chatContext(msgs) {
  const m = [...msgs].reverse().find((x) => x.role === 'ai' && !x.error);
  if (!m) return undefined;
  const ids = (m.recs?.length ? m.recs.map((r) => r.spotId) : (m.places || []).map((p) => p.id)).filter(Boolean).slice(0, 8);
  if (!ids.length && m.intent === 'chat') return undefined;
  const ctx = { q: m.question, ids };
  if (m.plan?.requestedDays) ctx.days = m.plan.requestedDays;
  return ctx;
}

// Headline that rises word by word (like RevealText, but without an aria-label: the words are real text, so screen readers read them as is).
function AskTitle({ text }) {
  const delay = useIntroDelay();
  const words = String(text).split(' ');
  return words.map((w, i) => (
    <span key={i} className="inline-block overflow-hidden pb-[0.14em] align-bottom" style={{ marginBottom: '-0.14em' }}>
      <span className="reveal-word inline-block" style={{ animationDelay: `${delay + 0.1 + i * 0.09}s` }}>{w}{i < words.length - 1 ? '\u00A0' : ''}</span>
    </span>
  ));
}

// "Ask SOULEY": a dark, calm page. A compass guide, a big headline that shrinks once the chat starts, answers that wipe in like ink,
// itineraries drawn as a route with numbered stops, and a floating message box. Look: index.css, block "ask: the guide".
export default function Ask() {
  const { t, tx } = useI18n();
  const [params] = useSearchParams();
  const [mode, setMode] = useState('recommend');
  const [question, setQuestion] = useState(params.get('q') || '');
  const [days, setDays] = useState(2);
  const [budget, setBudget] = useState('');
  const [pace, setPace] = useState('relaxed');
  const [startDate, setStartDate] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const last = useRef(null); // the last request, so "Try again" can repeat it exactly

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const run = async (req) => {
    setBusy(true);
    try {
      const payload = { question: req.q };
      if (req.mode === 'itinerary') {
        payload.durationDays = Math.min(MAX_DAYS, Math.max(1, Math.round(Number(req.days)) || 2));
        if (req.pace && req.pace !== 'relaxed') payload.pace = req.pace;
        if (req.startDate) payload.startDate = req.startDate;
      }
      if (req.budget) payload.budget = Number(req.budget);
      if (req.ctx) payload.ctx = req.ctx;
      const r = await askAi(req.mode, payload);
      setMsgs((m) => [...m, { role: 'ai', question: req.q, text: r.answer, recs: r.recommendations, days: r.days, places: r.places, plan: r.plan, tips: r.tips, aiUsed: r.aiUsed, engine: r.engine, intent: r.intent, chips: r.chips, suggestions: r.suggestions }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'ai', error: true, text: errorMessage(e) || t('ask.wrong') }]);
    } finally {
      setBusy(false);
    }
  };

  const send = (text, o = {}) => {
    const q = (o.q ?? text ?? question).trim();
    if (q.length < 3 || busy) return;
    // a follow-up chip already carries the question it follows; a typed question gets the chat so far
    last.current = { q, mode: o.mode ?? mode, days: o.days ?? days, budget: o.budget ?? budget, pace: o.pace ?? pace, startDate, ctx: o.label ? undefined : chatContext(msgs) };
    setMsgs((m) => [...m, { role: 'user', text: o.label ?? q }]);
    setQuestion('');
    run(last.current);
  };
  // A follow-up chip: the server keeps no memory between questions, so the chip is sent together with the question it follows.
  const follow = (f, m) => {
    const label = t(f.key);
    const o = { q: `${m.question}. ${label}`.slice(0, 1000), label, mode: f.mode ?? (m.days?.length ? 'itinerary' : 'recommend') };
    if (f.mode) { setMode(f.mode); }
    if (f.days) { o.days = String(f.days); setDays(String(f.days)); }
    else if (m.plan) o.days = String(m.plan.requestedDays);
    if (f.pace) { o.pace = f.pace; setPace(f.pace); }
    if (f.budget) { o.budget = f.budget; setBudget(f.budget); }
    send(undefined, o);
  };
  const retry = () => {
    if (!last.current || busy) return;
    setMsgs((m) => m.filter((x, i) => !(x.error && i === m.length - 1)));
    run(last.current);
  };
  const reset = () => { setMsgs([]); setQuestion(''); last.current = null; };

  const started = msgs.length > 0;
  // The board (right side on wide screens, under the chat on phones) follows the latest trip, or else the latest map of places.
  let boardAt = -1;
  msgs.forEach((m, i) => { if (m.days?.length) boardAt = i; });
  if (boardAt < 0) msgs.forEach((m, i) => { if (m.recs?.some((r) => r.spot?.lat != null)) boardAt = i; });
  const board = boardAt >= 0 ? msgs[boardAt] : null;
  const lastAi = msgs.length && msgs[msgs.length - 1].role === 'ai' && !msgs[msgs.length - 1].error ? msgs.length - 1 : -1;

  return (
    <section className="ask-page surface-dark relative isolate overflow-clip bg-night text-white">
      <div aria-hidden="true" className="ask-bg pointer-events-none absolute inset-0 -z-10">
        <div className="ask-bg-contours" style={{ '--contour': '#c98a4b' }}>
          <Contours seed="ask-souley" width={1600} height={1000} levels={16} cell={26} terrain draw className="h-full w-full" />
        </div>
        <div className="ask-bg-glow" />
      </div>

      <div className="ask-shell mx-auto flex min-h-[calc(100svh-4.5rem)] flex-col px-4 pb-4 pt-8 sm:px-6 sm:pt-12" data-board={board ? '1' : ''}>
        <header className="ask-head" data-compact={started ? '1' : ''}>
          <div className="ask-head-orb"><AskOrb state={busy ? 'thinking' : 'idle'} size="lg" /></div>
          <div className="min-w-0 flex-1">
            <p className="ask-eyebrow">{t('ask.eyebrow')}</p>
            <h1 className="ask-title text-white"><AskTitle text={t('ask.title')} /></h1>
            <div className="ask-lead"><p className="overflow-hidden text-white/65">{t('ask.lead')}</p></div>
          </div>
          {started && <button type="button" onClick={reset} className="ask-ghost shrink-0 self-start">{t('ask.newChat')}</button>}
        </header>

        <div className="ask-modes" role="tablist" aria-label={t('ask.mode')} data-mode={mode}>
          <span className="ask-modes-thumb" aria-hidden="true" />
          {[['recommend', t('ask.recommend')], ['itinerary', t('ask.planner')]].map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>

        <div className="ask-work flex-1" data-board={board ? '1' : ''}>
        <div className="ask-chat">
        <div className="mt-8 flex-1 space-y-9">
          {!started && (
            <div>
              <p className="ask-label mb-3">{t('ask.tryOne')}</p>
              <div key={mode} className="grid gap-2.5 sm:grid-cols-2">
                {IDEAS[mode].map((i, n) => (
                  <button key={i} type="button" onClick={() => send(tx(i))} onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); }}
                    className="ask-idea" style={{ '--d': `${0.5 + n * 0.08}s` }}>
                    <span className="ask-idea-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                    <span>{tx(i)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (m.role === 'user'
            ? <div key={i} className="ask-msg ask-user"><p>{m.text}</p></div>
            : <Reply key={i} m={m} onRetry={i === msgs.length - 1 ? retry : undefined}
              follow={i === lastAi && !busy && !m.suggestions?.length ? FOLLOW[m.days?.length ? 'itinerary' : 'recommend'] : undefined} onFollow={(f) => follow(f, m)}
              suggestions={i === lastAi && !busy ? m.suggestions : undefined} onAsk={(q) => send(q)} />))}
          {busy && <Thinking />}
          <div ref={endRef} className="ask-end" />
        </div>

        <Composer mode={mode} value={question} onChange={setQuestion} onSend={() => send()} busy={busy}
          days={days} setDays={setDays} budget={budget} setBudget={setBudget} pace={pace} setPace={setPace} startDate={startDate} setStartDate={setStartDate} autoFocus={!!params.get('q')} />
        </div>
        {board && <aside key={boardAt} className="ask-board" aria-label={t('ask.board')}><Board m={board} /></aside>}
        </div>
      </div>
    </section>
  );
}
