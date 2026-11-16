import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nContext';
import { StatsStrip, WhySouthernLeyte, HowItWorks, FeatureGrid, TownsGrid, TripIdeas, TravelTips, FaqSection, AskCta } from './HomeSections';

// The town box asks the API for live spot counts; here that call just never answers.
vi.mock('../../services/spotService', () => ({ listSpots: vi.fn(() => new Promise(() => {})) }));

const all = () => render(
  <I18nProvider><MemoryRouter>
    <StatsStrip /><WhySouthernLeyte /><HowItWorks /><FeatureGrid /><TownsGrid /><TripIdeas /><TravelTips /><FaqSection /><AskCta />
  </MemoryRouter></I18nProvider>,
);

describe('Home content sections', () => {
  beforeEach(() => localStorage.clear());

  it('renders every section heading', () => {
    all();
    for (const name of ['A province of bays, caves, falls and first things.', 'How SOULEY de Tour works', 'Everything for your trip, in one place', 'Explore by town', 'Trip ideas to start from', 'Good to know before you go', 'Questions, answered', 'Ready for Southern Leyte?']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('picking a town opens its box with a See spots button; there is no map link in the heading row', () => {
    all();
    const section = within(screen.getByRole('heading', { name: 'Explore by town' }).closest('section'));
    expect(section.queryByRole('link', { name: /everything on the map/i })).toBeNull();
    fireEvent.click(section.getByRole('button', { name: 'Maasin City' }));
    expect(section.getByRole('link', { name: /See spots/ })).toHaveAttribute('href', '/spots?municipality=Maasin%20City');
  });

  it('feature cards link to the right pages', () => {
    all();
    const grid = within(screen.getByRole('region', { name: 'Everything for your trip, in one place' }));
    for (const href of ['/spots', '/food', '/experience', '/ask', '/trips']) {
      expect(grid.getAllByRole('link').some((a) => a.getAttribute('href') === href), href).toBe(true);
    }
  });

  it('feature showcase has six numbered tool cards, each with a title, text and call to action', () => {
    all();
    const grid = within(screen.getByRole('region', { name: 'Everything for your trip, in one place' }));
    expect(grid.getAllByRole('link')).toHaveLength(6);
    expect(grid.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Interactive map', 'Eat and drink', 'Experience', 'Ask the AI guide', 'My trips', 'Reviews and photos']);
    expect(grid.getByText('Open the map')).toBeInTheDocument();
  });

  it('has 4 trip ideas, a 5-stage tips journey and 7 FAQ items', () => {
    all();
    expect(screen.getAllByRole('link', { name: 'Plan with AI' })).toHaveLength(4);
    expect(within(screen.getByRole('tablist')).getAllByRole('tab')).toHaveLength(5);
    expect(document.querySelectorAll('details')).toHaveLength(7);
  });

  it('trip ideas name their town; Plan with AI opens Ask with that route typed in', () => {
    all();
    const section = within(screen.getByRole('heading', { name: 'Trip ideas to start from' }).closest('section'));
    expect(section.getByText('Padre Burgos')).toBeInTheDocument();
    const href = section.getAllByRole('link', { name: 'Plan with AI' })[1].getAttribute('href');
    expect(href.startsWith('/ask?q=')).toBe(true);
    expect(new URL(href, 'http://x').searchParams.get('q')).toMatch(/^Plan a 2-day trip: Tangka-an Point Dive Site, .*Son-ok Marine Sanctuary$/);
    expect(section.getAllByRole('link', { name: /See the spots/ })[1]).toHaveAttribute('href', '/spots?municipality=Padre%20Burgos');
  });

  it('closing call to action links to Ask and Register', () => {
    all();
    expect(screen.getByRole('link', { name: 'Ask SOULEY' })).toHaveAttribute('href', '/ask');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register');
  });

  it('shows Bisaya text when that language is saved', () => {
    localStorage.setItem('souley-lang', 'ceb');
    all();
    expect(screen.getByRole('heading', { name: 'Andam na ka sa Southern Leyte?' })).toBeInTheDocument();
  });
});
