import { vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SpotDetails from './SpotDetails';
import { useSpot } from '../hooks/useSpot';
import { listReviews } from '../services/spotService';

vi.mock('../hooks/useSpot');
vi.mock('../services/spotService');
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../components/SpotMap', () => ({ default: () => <div data-testid="map" /> }));

const base = { _id: 's1', slug: 'x', name: 'Limasawa Island', municipality: 'Limasawa', description: 'Nice place', images: ['/a.jpg', '/b.jpg'], activities: ['Snorkeling'], entranceFee: 'Free', difficulty: 'easy' };
const state = (over = {}) => ({ spot: base, loading: false, error: null, notFound: false, retry: vi.fn(), ...over });
const setup = () => render(<MemoryRouter initialEntries={['/spots/x']}><Routes><Route path="/spots/:slug" element={<SpotDetails />} /></Routes></MemoryRouter>);

describe('SpotDetails', () => {
  beforeEach(() => { vi.clearAllMocks(); listReviews.mockResolvedValue({ data: [] }); });

  it('renders main fields', () => {
    useSpot.mockReturnValue(state());
    setup();
    expect(screen.getByRole('heading', { name: 'Limasawa Island' })).toBeInTheDocument();
    expect(screen.getByText('Nice place')).toBeInTheDocument();
    expect(screen.getByText('Snorkeling')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });
  it('hides empty fields', () => {
    useSpot.mockReturnValue(state({ spot: { ...base, safetyTips: [] } }));
    setup();
    expect(screen.queryByText('Best time to visit')).not.toBeInTheDocument();
    expect(screen.queryByText('Safety tips')).not.toBeInTheDocument();
  });
  it('shows HTML as literal text', () => {
    useSpot.mockReturnValue(state({ spot: { ...base, description: '<script>alert(1)</script>Hello' } }));
    const { container } = setup();
    expect(screen.getByText('<script>alert(1)</script>Hello')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });
  it('not found and error views', async () => {
    useSpot.mockReturnValue(state({ spot: null, notFound: true }));
    const { unmount } = setup();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    unmount();
    const retry = vi.fn();
    useSpot.mockReturnValue(state({ spot: null, error: new Error('x'), retry }));
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
  it('thumbnail changes main image', async () => {
    useSpot.mockReturnValue(state());
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Show photo 2' }));
    expect(screen.getByAltText('Limasawa Island')).toHaveAttribute('src', '/b.jpg');
  });
  it('no coordinates means no map; logged-out save links to /login', () => {
    useSpot.mockReturnValue(state());
    setup();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.getByRole('link', { name: 'Save to favorites' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Ask AI' }).getAttribute('href')).toMatch(/^\/ask\?q=/);
  });
  it('lists approved reviews as text', async () => {
    useSpot.mockReturnValue(state());
    listReviews.mockResolvedValue({ data: [{ _id: 'r1', rating: 5, comment: '<b>x</b>', userId: { fullName: 'Ana' } }] });
    setup();
    await waitFor(() => expect(screen.getByText('<b>x</b>')).toBeInTheDocument());
  });
  it('opens the photos full screen, steps through them and closes with Escape', async () => {
    useSpot.mockReturnValue(state());
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'View all 2 photos' }));
    expect(screen.getByRole('dialog', { name: /photos/ })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
