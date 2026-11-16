import { Link } from 'react-router-dom';
import SpotImage from '../components/SpotImage';
import { useI18n } from '../i18n/I18nContext';

// Split page. Left: a photo of Southern Leyte (drop it in client/public/auth/hero.jpg).
// Right: the form. On small screens the photo becomes a short strip above the form.
export const HERO_PHOTO = '/auth/hero.jpg';

// Underlined input style, still used by the Account page.
export const inputCls = 'field-line mt-1';

export default function AuthShell({ eyebrow, title, lead, children, footer }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-[calc(100vh-9rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="surface-dark relative isolate h-40 overflow-hidden bg-night sm:h-56 lg:h-auto">
        <SpotImage src={HERO_PHOTO} path={HERO_PHOTO} alt={t('auth.heroAlt')} className="absolute inset-0 -z-10 h-full w-full" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
        <Link to="/" className="absolute left-6 top-6 font-display text-xl text-white hover:text-orange sm:left-10 sm:top-8">SOULEY de Tour</Link>
        <p className="absolute bottom-6 left-6 right-6 max-w-sm font-display text-2xl leading-tight text-white sm:bottom-8 sm:left-10 lg:bottom-12 lg:text-4xl">
          {t('auth.hero')}
        </p>
      </div>
      <div className="flex items-center px-4 py-12 sm:px-10 lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">{eyebrow}</p>}
          <h1 className="mt-2 text-4xl sm:text-5xl">{title}</h1>
          {lead && <p className="mt-3 text-muted">{lead}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 border-t border-line pt-6 text-sm">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

export const AuthLink = ({ to, children }) => (
  <Link to={to} className="font-semibold text-ember underline underline-offset-4 hover:text-ink">{children}</Link>
);
