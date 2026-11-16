import { Link } from 'react-router-dom';
import SpotImage from '../SpotImage';
import AskOrb from './AskOrb';
import { CopyButton } from './Actions';
import { useI18n } from '../../i18n/I18nContext';

const Arrow = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

// Glow that follows the pointer on a card (same trick as the home feature cards): writes two CSS variables, nothing re-renders.
function glow(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

function SpotCard({ rec, n }) {
  const s = rec.spot;
  if (!s) return null;
  return (
    <Link to={`/spots/${s.slug}`} onPointerMove={glow} className="ask-card group" style={{ '--d': `${0.25 + n * 0.09}s` }}>
      <span className="ask-card-photo"><SpotImage src={s.image} slug={s.slug} alt={s.name} className="h-full w-full" /></span>
      <span className="min-w-0 flex-1">
        <span className="ask-card-n">{String(n + 1).padStart(2, '0')}</span>
        <span className="block font-display text-xl leading-tight text-[#ffffff]">{s.name}</span>
        <span className="block text-sm text-[#ff6a13]">{s.municipality}</span>
        {rec.reason && <span className="mt-1.5 line-clamp-3 block text-sm leading-snug text-white/65">{rec.reason}</span>}
      </span>
      <span className="ask-card-go" aria-hidden="true"><Arrow /></span>
    </Link>
  );
}

// Plain text of a reply, for the Copy button.
function replyText(m, byId) {
  const lines = [m.text];
  (m.days || []).forEach((d) => {
    lines.push('', `Day ${d.dayNumber}`);
    d.items.forEach((it) => lines.push(`${it.visitOrder}. ${byId.get(String(it.touristSpotId))?.name || 'Stop'}${it.notes ? ` - ${it.notes}` : ''}`));
  });
  return lines.join('\n');
}

export default function Reply({ m, onRetry, follow, onFollow, suggestions, onAsk }) {
  const { t } = useI18n();
  const byId = new Map([...(m.recs || []).map((r) => [String(r.spotId), r.spot]), ...(m.places || []).map((p) => [String(p.id), p])]);
  const hasDays = m.days?.length > 0;
  // The answer wipes in like ink, over a time that grows with its length (0.9 s .. 2.4 s).
  const dur = Math.min(2.4, Math.max(0.9, (m.text || '').length / 260));

  if (m.error) {
    return (
      <div className="ask-msg ask-ai ask-error flex gap-4">
        <AskOrb size="sm" />
        <div>
          <p role="alert" className="text-danger-light">{m.text}</p>
          {onRetry && <button type="button" onClick={onRetry} className="ask-ghost mt-3">{t('ask.retry')}</button>}
        </div>
      </div>
    );
  }
  return (
    <div className="ask-msg ask-ai flex gap-3 sm:gap-5">
      <AskOrb size="sm" className="mt-1" />
      <div className="min-w-0 flex-1 space-y-6">
        <p className="ask-label">{t('ask.guide')}</p>
        <p className="ask-wipe -mt-3 whitespace-pre-line text-[1.06rem] leading-[1.75] text-[#ffffff]" style={{ '--dur': `${dur}s` }}>{m.text}</p>
        {m.chips?.length > 0 && (
          <div>
            <p className="ask-label">{t('ask.picked')}</p>
            <ul className="ask-picks mt-2">{m.chips.map((c) => <li key={c} className="ask-pick">{c}</li>)}</ul>
          </div>
        )}
        {hasDays && <p className="ask-planready"><span aria-hidden="true" />{t('ask.planReady', { d: m.days.length, n: m.days.reduce((n, d) => n + d.items.length, 0) })}</p>}
        {m.recs?.length > 0 && (
          <div>
            <p className="ask-label">{t('ask.places')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{m.recs.map((r, i) => <SpotCard key={r.spotId} rec={r} n={i} />)}</div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyButton text={replyText(m, byId)} />
        </div>
        {follow?.length > 0 && (
          <div>
            <p className="ask-label">{t('ask.follow')}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {follow.map((f, i) => <button key={f.key} type="button" onClick={() => onFollow(f)} className="ask-follow" style={{ '--d': `${0.5 + i * 0.08}s` }}>{t(f.key)}</button>)}
            </div>
          </div>
        )}
        {suggestions?.length > 0 && (
          <div>
            <p className="ask-label">{t('ask.alsoAsk')}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {suggestions.map((q, i) => <button key={q} type="button" onClick={() => onAsk(q)} className="ask-follow" style={{ '--d': `${0.5 + i * 0.08}s` }}>{q}</button>)}
            </div>
          </div>
        )}
        {m.aiUsed === false && m.intent !== 'chat' && <p className="ask-note"><span aria-hidden="true" />{m.engine === 'smart' ? t('ask.fromDb') : t('ask.fallback')}</p>}
      </div>
    </div>
  );
}
