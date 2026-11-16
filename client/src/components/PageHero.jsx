import Contours from './Contours';
import RevealText from './RevealText';

// The dark band at the top of the list pages: the site's contour lines draw themselves once, the title rises word by
// word, and a count appears on the right. `warm` gives the Food page a warmer glow; `wide` lines the title up with the wider Food grid. The page's own <h1> lives here.
export default function PageHero({ title, subtitle, countText, seed = 'page-hero', warm = false, wide = false }) {
  return (
    <header className="surface-dark relative overflow-hidden bg-night pb-20 pt-10 text-white sm:pb-24 sm:pt-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ '--contour': warm ? '#b8733a' : '#c98a4b' }}>
        <Contours seed={seed} width={1400} height={360} levels={14} cell={22} terrain draw className="hero-draw h-full w-full" />
      </div>
      <div aria-hidden="true" className={`page-hero-glow pointer-events-none absolute inset-0 ${warm ? 'is-warm' : ''}`} />
      <div className={`relative mx-auto flex flex-wrap items-end justify-between gap-6 px-4 sm:px-6 ${wide ? 'max-w-[110rem] lg:px-10' : 'max-w-7xl'}`}>
        <div className="min-w-0">
          <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] leading-[1.03] tracking-[-0.02em] text-white"><RevealText text={title} /></h1>
          {subtitle && <p className="mt-4 max-w-2xl text-white/70">{subtitle}</p>}
        </div>
        {countText && <p className="page-hero-count font-display text-2xl text-orange sm:text-3xl">{countText}</p>}
      </div>
    </header>
  );
}
