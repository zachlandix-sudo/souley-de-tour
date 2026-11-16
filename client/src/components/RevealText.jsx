import { useIntroDelay } from './IntroSplash';

// Headline that rises word by word out of a mask. Waits for the intro curtain on the first visit.
export default function RevealText({ text, className = '' }) {
  const introDelay = useIntroDelay();
  const words = String(text).split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.14em] align-bottom" style={{ marginBottom: '-0.14em' }}>
          <span className="reveal-word inline-block" style={{ animationDelay: `${introDelay + 0.1 + i * 0.09}s` }}>{w}{i < words.length - 1 ? '\u00A0' : ''}</span>
        </span>
      ))}
    </span>
  );
}
