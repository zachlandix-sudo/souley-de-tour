import { useEffect, useState } from 'react';
import AskOrb from './AskOrb';
import { useI18n } from '../../i18n/I18nContext';

// Shown while the answer is on its way: the compass swings, a route line draws itself over and over with a light riding it,
// and a short line of text changes every ~1.8 s so the wait never feels stuck.
const PATH = 'M4 30 C40 6 70 46 108 22 S176 4 236 24';
export default function Thinking() {
  const { t } = useI18n();
  const phrases = [t('ask.thinking'), t('ask.think1'), t('ask.think2'), t('ask.think3')];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % phrases.length), 1800);
    return () => clearInterval(id);
  }, [phrases.length]);
  return (
    <div className="ask-msg ask-ai flex items-center gap-4" aria-live="polite">
      <AskOrb state="thinking" size="sm" />
      <div className="min-w-0">
        <p key={i} className="ask-think-text text-[.95rem] text-[#ffffff]/80">{phrases[i]}</p>
        <svg viewBox="0 0 240 44" className="ask-think-route mt-1 h-8 w-[min(15rem,60vw)]" aria-hidden="true" focusable="false">
          <path d={PATH} className="base" />
          <path d={PATH} pathLength="1" className="run" />
          <circle r="4" className="dot"><animateMotion path={PATH} dur="2.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .2 1" /></circle>
        </svg>
      </div>
    </div>
  );
}
