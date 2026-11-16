import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Home from './Home';
import { useSpots } from '../hooks/useSpots';
import { useCategories } from '../hooks/useCategories';
import { useConditions } from '../hooks/useConditions';

vi.mock('../hooks/useSpots');
vi.mock('../hooks/useCategories');
vi.mock('../hooks/useConditions');
vi.mock('../services/photoService', () => ({ findPhoto: vi.fn(() => Promise.resolve(null)) }));

const Where = () => { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; };
const setup = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes><Route path="/" element={<Home />} /><Route path="*" element={<Where />} /></Routes>
  </MemoryRouter>
);
const ok = (spots) => ({ spots, pagination: null, loading: false, error: null, retry: vi.fn() });

describe('Home', () => {
  beforeEach(() => {
    useCategories.mockReturnValue({ categories: [{ _id: 'c', name: 'Nature', slug: 'nature' }], loading: false, error: null });
    useConditions.mockReturnValue({ loading: false, error: false, temp: 29, code: 0, wind: 10, wave: 0.4 });
  });

  it('shows featured spot cards', () => {
    useSpots.mockReturnValue(ok([{ _id: '1', slug: 'a', name: 'Alpha Falls', municipality: 'Sogod' }]));
    setup();
    expect(screen.getByText('Alpha Falls')).toBeInTheDocument();
    expect(useSpots).toHaveBeenCalledWith({ featured: 'true', limit: 5 });
  });
  it('featured gallery links each spot and offers all spots', () => {
    useSpots.mockReturnValue(ok([{ _id: '1', slug: 'a', name: 'Alpha Falls', municipality: 'Sogod', difficulty: 'easy', categoryIds: [{ name: 'Waterfalls' }], averageRating: 4.6, reviewCount: 12 }]));
    setup();
    expect(screen.getByRole('link', { name: /Alpha Falls/ })).toHaveAttribute('href', '/spots/a');
    expect(screen.getByText('Waterfalls')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See all spots/ })).toHaveAttribute('href', '/spots');
  });
  it('search navigates to /spots?search=beach', async () => {
    useSpots.mockReturnValue(ok([]));
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'beach{enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/spots?search=beach');
  });
  it('category chip navigates', async () => {
    useSpots.mockReturnValue(ok([]));
    setup();
    await userEvent.click(screen.getByRole('button', { name: /Nature/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/spots?category=nature');
  });
  it('error shows Retry that calls retry', async () => {
    const retry = vi.fn();
    useSpots.mockReturnValue({ spots: [], pagination: null, loading: false, error: new Error('x'), retry });
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
  it('empty featured list shows empty state', () => {
    useSpots.mockReturnValue(ok([]));
    setup();
    expect(screen.getByText(/No featured spots yet/)).toBeInTheDocument();
  });

  it('shows live conditions with a plain-language hint', () => {
    useSpots.mockReturnValue(ok([]));
    setup();
    expect(screen.getByText(/29°C/)).toBeInTheDocument();
    expect(screen.getByText(/Calm and clear/)).toBeInTheDocument();
  });
  it('live conditions failure shows a quiet fallback', () => {
    useConditions.mockReturnValue({ loading: false, error: true });
    useSpots.mockReturnValue(ok([]));
    setup();
    expect(screen.getByText(/Live conditions are unavailable/)).toBeInTheDocument();
  });
  it('mood tile links to a saved filter', () => {
    useSpots.mockReturnValue(ok([]));
    setup();
    expect(screen.getByRole('link', { name: /Cheap and cheerful/ })).toHaveAttribute('href', '/spots?maxBudget=500&sort=rating');
  });
  it('guided finder: no results until both questions are answered', async () => {
    useSpots.mockImplementation((q) => (q.featured ? ok([]) : ok([{ _id: '2', slug: 'b', name: 'Beta Cove', municipality: 'Liloan' }])));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Chill' }));
    expect(screen.queryByText('Beta Cove')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Up to ₱500' }));
    expect(screen.getByText('Beta Cove')).toBeInTheDocument();
    expect(useSpots).toHaveBeenCalledWith({ difficulty: 'easy', maxBudget: 500, sort: 'rating', limit: 3 });
    expect(screen.getByRole('link', { name: /See all matches/ })).toHaveAttribute('href', '/spots?difficulty=easy&maxBudget=500&sort=rating');
  });
  it('guided finder: start over clears the results', async () => {
    useSpots.mockImplementation((q) => (q.featured ? ok([]) : ok([{ _id: '2', slug: 'b', name: 'Beta Cove' }])));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Chill' }));
    await userEvent.click(screen.getByRole('button', { name: 'No limit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.queryByText('Beta Cove')).not.toBeInTheDocument();
  });
});
