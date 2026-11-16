import { Link } from 'react-router-dom';
import FlowWave from '../components/FlowWave';
import Reveal from '../components/Reveal';
import TiltCard from '../components/TiltCard';
import ChapterRail from '../components/ChapterRail';
import ScrollLitText from '../components/ScrollLitText';
import { useIntroDelay } from '../components/IntroSplash';
import { useI18n } from '../i18n/I18nContext';

// Who this page is about. Not translated: names stay the same in every language. Change them here.
export const DEV = { name: 'Joshua Omang', school: 'The College of Maasin', program: 'BSIT III-A' };

// What the site is really built with (taken from the client and server package.json files, not guessed).
export const STACK = ['React', 'Vite', 'Tailwind CSS', 'React Router', 'Leaflet', 'MapLibre GL', 'Node.js', 'Express', 'MongoDB', 'JWT login', 'Open-Meteo'];

const SKILLS = ['front', 'back', 'db', 'ux', 'web'];

// The story chapters (the hero card is chapter 01): number on the page, key of its text in translationsAbout.js. The rail on the right lists them.
const CHAPTERS = [['02', 's2'], ['03', 's3'], ['04', 's4'], ['05', 's5'], ['06', 's6']];

const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// The three headline lines rise one after the other, like the headline on the Ask page.
function Headline({ lines }) {
  const delay = useIntroDelay();
  return lines.map((line, i) => (
    <span key={i} className="block overflow-hidden pb-[0.14em]" style={{ marginBottom: '-0.14em' }}>
      <span className="reveal-word block" style={{ animationDelay: `${delay + 0.1 + i * 0.16}s` }}>{line}</span>
    </span>
  ));
}

// One chapter of the story: a number and label on the left, the text on the right, on a calm glass panel so it stays readable over the moving hills.
function Chapter({ n, label, title, children }) {
  return (
    <Reveal as="section" aria-labelledby={`about-${n}`} id={`chapter-${n}`} className="about-chapter">
      <p className="about-chapter-n" aria-hidden="true">{n}</p>
      <div className="min-w-0">
        <p className="about-label">{label}</p>
        <h2 id={`about-${n}`} className="about-h2">{title}</h2>
        {children}
      </div>
    </Reveal>
  );
}

// "About Dev": the person behind SOULEY de Tour. The background is the "flow wave" (orange particle hills under a black haze, the same colours as the rest of the site).
// Text: Souley_de_Tour_About_Developer_Content.docx; the words live in i18n/translationsAbout.js. Look: index.css, block "about dev".
export default function AboutDev() {
  const { t } = useI18n();
  const vars = { name: DEV.name, school: DEV.school };
  const rail = CHAPTERS.map(([n, k]) => ({ id: `chapter-${n}`, n, label: t(`about.${k}.label`) }));

  return (
    <div className="about-page surface-dark relative isolate overflow-clip text-white">
      <div aria-hidden="true" className="about-bg">
        <FlowWave className="about-bg-canvas" />
        <div className="about-bg-fog" />
      </div>

      <div className="about-shell mx-auto max-w-6xl px-4 sm:px-6">
        <header className="about-hero">
          <p className="about-eyebrow">{t('about.eyebrow')}</p>
          <h1 className="about-title"><Headline lines={[t('about.h1'), t('about.h2'), t('about.h3')]} /></h1>

          <TiltCard className="about-tilt">
          <Reveal delay={0.5} className="about-card">
            <h2 className="about-card-title">{t('about.s1.title')}</h2>
            <p className="about-lead">{t('about.s1.lead')}</p>
            <div className="about-id">
              <span className="about-mono" aria-hidden="true">{initials(DEV.name)}</span>
              <div className="min-w-0">
                <p className="about-name">{DEV.name}</p>
                <p className="about-school">{DEV.program} · {DEV.school}</p>
              </div>
            </div>
            <p className="about-role">{t('about.role')}</p>
          </Reveal>
          </TiltCard>

          <a href="#about-story" className="about-scroll">
            <span>{t('about.scroll')}</span>
            <svg aria-hidden="true" viewBox="0 0 12 18" className="h-4 w-3"><path d="M6 1v15M1.5 11.5L6 16l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </header>

        <div id="about-story" className="about-story">
          <ChapterRail items={rail} label={t('about.rail')} />
          <Chapter n="02" label={t('about.s2.label')} title={t('about.s2.title')}>
            <p className="about-body">{t('about.s2.body', vars)}</p>
          </Chapter>

          <Chapter n="03" label={t('about.s3.label')} title={t('about.s3.title')}>
            <p className="about-body">{t('about.s3.body')}</p>
          </Chapter>

          <Chapter n="04" label={t('about.s4.label')} title={t('about.s4.title')}>
            <p className="about-body">{t('about.s4.lead')}</p>
            <ul className="about-skills">
              {SKILLS.map((k) => <li key={k}><span aria-hidden="true" className="about-skill-dot" />{t(`about.skill.${k}`)}</li>)}
            </ul>
            <p className="about-label mt-8">{t('about.stack')}</p>
            <ul className="about-stack" aria-label={t('about.stack')}>
              {STACK.map((s, i) => <li key={s} style={{ '--i': i }}>{s}</li>)}
            </ul>
          </Chapter>

          <Chapter n="05" label={t('about.s5.label')} title={t('about.s5.title')}>
            <ScrollLitText as="blockquote" className="about-quote" text={t('about.s5.quote')} />
            <p className="about-tag">{t('about.s5.tag')}</p>
          </Chapter>

          <Chapter n="06" label={t('about.s6.label')} title={t('about.s6.title')}>
            <p className="about-body">{t('about.s6.body')}</p>
            <p className="about-sign">— {DEV.name}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/spots" className="btn btn-primary">{t('about.cta.spots')}</Link>
              <Link to="/ask" className="btn btn-outline">{t('about.cta.ask')}</Link>
            </div>
          </Chapter>
        </div>
      </div>

      <div aria-hidden="true" className="about-progress"><i /></div>
    </div>
  );
}
