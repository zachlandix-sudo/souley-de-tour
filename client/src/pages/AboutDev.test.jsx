import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AboutDev, { DEV, STACK } from './AboutDev';
import Navbar from '../components/Navbar';
import { I18nProvider } from '../i18n/I18nContext';
import { translations } from '../i18n/translations';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }));

const page = () => render(<MemoryRouter initialEntries={['/about-dev']}><I18nProvider><AboutDev /></I18nProvider></MemoryRouter>);

beforeEach(() => { localStorage.clear(); });

describe('About Dev page', () => {
  it('shows the headline, the developer, the program and the school', () => {
    page();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/An idea imagined\.\s*A vision developed\.\s*A journey coded\./);
    expect(screen.getByRole('heading', { name: 'Meet the Developer Behind SOULEY de Tour' })).toBeInTheDocument();
    expect(DEV.school).toBe('The College of Maasin');
    expect(screen.getByText(`${DEV.program} · ${DEV.school}`)).toBeInTheDocument();
    expect(screen.getByText(DEV.name)).toBeInTheDocument();
  });

  it('writes the name and the school into the About me text', () => {
    page();
    expect(screen.getByText(/I am Joshua Omang, currently pursuing a Bachelor of Science in Information Technology \(BSIT III-A\) at The College of Maasin\./)).toBeInTheDocument();
  });

  it('has the five story chapters, in order, each with a heading', () => {
    page();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Meet the Developer Behind SOULEY de Tour',
      'A Little About Myself',
      'Why I Created SOULEY de Tour',
      'Behind the Development',
      'A Thought Behind Every Creation',
      'This Is Only the Beginning.',
    ]);
  });

  it('lists the five skills and the real stack', () => {
    page();
    const chapter = screen.getByRole('heading', { name: 'Behind the Development' }).closest('section');
    for (const s of ['Frontend Development', 'Backend Development', 'Database Management', 'UI/UX Design', 'Interactive Web Experiences']) {
      expect(within(chapter).getByText(s)).toBeInTheDocument();
    }
    const stack = within(chapter).getByRole('list', { name: 'Built with' });
    expect(within(stack).getAllByRole('listitem')).toHaveLength(STACK.length);
    expect(within(stack).getByText('MongoDB')).toBeInTheDocument();
  });

  it('closes with the signature and two ways to keep going', () => {
    page();
    expect(screen.getByText('Still learning. Still building. Always exploring.')).toBeInTheDocument();
    expect(screen.getByText(`— ${DEV.name}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore the spots' })).toHaveAttribute('href', '/spots');
    expect(screen.getByRole('link', { name: 'Ask SOULEY' })).toHaveAttribute('href', '/ask');
  });

  it('has a chapter rail with one link per story chapter, in order, each pointing at a real section', () => {
    page();
    const rail = screen.getByRole('navigation', { name: 'Story chapters' });
    const links = within(rail).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#chapter-02', '#chapter-03', '#chapter-04', '#chapter-05', '#chapter-06']);
    expect(links[0]).toHaveAttribute('aria-label', '02 About me');
    for (const a of links) expect(document.getElementById(a.getAttribute('href').slice(1))?.tagName).toBe('SECTION');
  });

  it('keeps the philosophy quote a real blockquote with its full text, even though it lights up word by word', () => {
    const { container } = page();
    const q = container.querySelector('blockquote.about-quote');
    expect(q).not.toBeNull();
    expect(q.textContent).toBe('I believe that technology becomes meaningful when it solves problems, connects people, and creates experiences worth remembering.');
    expect(q.querySelectorAll('[data-w]').length).toBeGreaterThan(10);
  });

  it('puts the hero card in a tilt wrapper and adds the decorative reading-progress line', () => {
    const { container } = page();
    expect(container.querySelector('.about-tilt .about-card')).not.toBeNull();
    expect(container.querySelector('.about-progress')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the background decorative: hidden from screen readers', () => {
    const { container } = page();
    const bg = container.querySelector('.about-bg');
    expect(bg).toHaveAttribute('aria-hidden', 'true');
    expect(bg.querySelector('canvas')).not.toBeNull();
  });

  it('speaks Filipino and Bisaya, and the name and school stay as they are', () => {
    localStorage.setItem('souley-lang', 'fil');
    const { unmount } = page();
    expect(screen.getByRole('heading', { name: 'Kilalanin ang Developer ng SOULEY de Tour' })).toBeInTheDocument();
    expect(screen.getByText(/Ako si Joshua Omang.*sa The College of Maasin\./)).toBeInTheDocument();
    unmount();
    localStorage.setItem('souley-lang', 'ceb');
    page();
    expect(screen.getByRole('heading', { name: 'Ilha ang Developer sa SOULEY de Tour' })).toBeInTheDocument();
    expect(screen.getByText(/Ako si Joshua Omang.*sa The College of Maasin\./)).toBeInTheDocument();
  });

  it('has every about.* key in all three languages', () => {
    const keys = Object.keys(translations.en).filter((k) => k.startsWith('about.') || k === 'nav.aboutDev');
    expect(keys.length).toBeGreaterThan(30);
    for (const code of ['fil', 'ceb']) for (const k of keys) expect(translations[code][k], `${code}:${k}`).toBeTruthy();
  });
});

describe('About Dev in the navbar', () => {
  it('sits right after Ask and points at /about-dev', () => {
    render(<MemoryRouter><I18nProvider><Navbar /></I18nProvider></MemoryRouter>);
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links.indexOf('About Dev')).toBe(links.indexOf('Ask AI') + 1);
    expect(screen.getByRole('link', { name: 'About Dev' })).toHaveAttribute('href', '/about-dev');
  });
});
