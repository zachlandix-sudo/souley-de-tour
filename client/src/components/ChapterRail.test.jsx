import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import ChapterRail from './ChapterRail';

const ITEMS = [
  { id: 'c1', n: '02', label: 'About me' },
  { id: 'c2', n: '03', label: 'My purpose' },
  { id: 'c3', n: '04', label: 'My technical side' },
];

const setup = () => render(
  <div>
    <ChapterRail items={ITEMS} label="Story chapters" />
    {ITEMS.map((it) => <section key={it.id} id={it.id}>{it.label}</section>)}
  </div>,
);
// jsdom has no layout: say where each chapter sits on the PAGE (top, in px from the top of the page). Like a browser, a chapter's
// rect is then its page position minus how far the window is scrolled (window.scrollY). The window is 768 px tall, so its middle is y = 384.
let reads = 0;
const place = (tops) => ITEMS.forEach((it, i) => { document.getElementById(it.id).getBoundingClientRect = () => { reads++; const top = tops[i] - (window.scrollY || 0); return { top, height: 200, bottom: top + 200 }; }; });
const scrollTo = (y) => { Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); fireEvent.scroll(window); };
afterEach(() => { Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }); });

describe('ChapterRail', () => {
  it('is a labelled navigation with one link per chapter, pointing at the chapter, the first one current', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Story chapters' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#c1', '#c2', '#c3']);
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['02 About me', '03 My purpose', '04 My technical side']);
    expect(links[0]).toHaveAttribute('aria-current', 'location');
    expect(links[1]).not.toHaveAttribute('aria-current');
  });

  it('follows the scroll: the chapter in the middle of the screen becomes current and the line fills up to it', async () => {
    setup();
    place([-200, 300, 800]); // chapter centres at -100, 400, 900: the middle of the screen (y = 384) is almost on the second one
    fireEvent.scroll(window);
    const nav = screen.getByRole('navigation', { name: 'Story chapters' });
    await waitFor(() => expect(within(nav).getByRole('link', { name: '03 My purpose' })).toHaveAttribute('aria-current', 'location'));
    expect(within(nav).getByRole('link', { name: '02 About me' })).not.toHaveAttribute('aria-current');
    const fill = parseFloat(nav.style.getPropertyValue('--fill'));
    expect(fill).toBeGreaterThan(0.4); expect(fill).toBeLessThan(0.6);

    scrollTo(516); // scrolled to the end: the middle of the screen is now at 900, the centre of the last chapter
    await waitFor(() => expect(within(nav).getByRole('link', { name: '04 My technical side' })).toHaveAttribute('aria-current', 'location'));
    expect(parseFloat(nav.style.getPropertyValue('--fill'))).toBeCloseTo(1, 1);
  });

  it('measures the chapters once, not on every scroll frame (a layout read per frame is what makes a busy page janky)', async () => {
    setup();
    place([-200, 300, 800]);
    fireEvent.scroll(window);
    const nav = screen.getByRole('navigation', { name: 'Story chapters' });
    await waitFor(() => expect(within(nav).getByRole('link', { name: '03 My purpose' })).toHaveAttribute('aria-current', 'location'));
    const before = reads;
    scrollTo(100); await new Promise((r) => setTimeout(r, 40));
    scrollTo(300); await new Promise((r) => setTimeout(r, 40));
    scrollTo(516); await waitFor(() => expect(within(nav).getByRole('link', { name: '04 My technical side' })).toHaveAttribute('aria-current', 'location'));
    expect(reads).toBe(before); // moving the scroll position added no getBoundingClientRect calls
  });
});
