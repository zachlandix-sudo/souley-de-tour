import { render, screen } from '@testing-library/react';
import PageHero from './PageHero';
import { I18nProvider } from '../i18n/I18nContext';

describe('PageHero', () => {
  it('has the page h1, the subtitle and the count', () => {
    render(<I18nProvider><PageHero title="Eat & Drink" subtitle="Where to eat" countText="36 places" /></I18nProvider>);
    expect(screen.getByRole('heading', { level: 1, name: 'Eat & Drink' })).toBeInTheDocument();
    expect(screen.getByText('Where to eat')).toBeInTheDocument();
    expect(screen.getByText('36 places')).toBeInTheDocument();
  });
  it('shows no count line when there is no count yet', () => {
    const { container } = render(<I18nProvider><PageHero title="Spots" /></I18nProvider>);
    expect(container.querySelector('.page-hero-count')).toBeNull();
  });
});
