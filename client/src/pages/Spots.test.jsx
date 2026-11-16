import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Spots from './Spots';
import { useSpots } from '../hooks/useSpots';
import { useCategories } from '../hooks/useCategories';

vi.mock('../hooks/useSpots');
vi.mock('../hooks/useCategories');
vi.mock('../components/SpotMap', () => ({
  default: ({ activeId, live, onPinHover }) => (
    <div data-testid="map" data-active={activeId ?? ''} data-live={live ? 'yes' : ''} onMouseEnter={() => onPinHover?.('s1')} onMouseLeave={() => onPinHover?.(null)} />
  ),
}));

const Url = () => { const l = useLocation(); return <p data-testid="url">{l.search}</p>; };
const setup = (entry) => render(<MemoryRouter initialEntries={[entry]}><Spots /><Url /></MemoryRouter>);
const spot = { _id: 's1', slug: 'a', name: 'Alpha', municipality: 'Sogod' };
const result = (over = {}) => ({ spots: [spot], pagination: { page: 1, pages: 3, total: 30, limit: 12 }, loading: false, error: null, retry: vi.fn(), ...over });

describe('Spots page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSpots.mockReturnValue(result());
    useCategories.mockReturnValue({ categories: [{ _id: 'c', name: 'Nature', slug: 'nature' }], loading: false, error: null });
  });

  it('passes URL values to useSpots', () => {
    setup('/spots?category=nature&sort=rating&page=2');
    expect(useSpots).toHaveBeenCalledWith({ category: 'nature', sort: 'rating', page: 2 });
  });
  it('cleans junk URL values', () => {
    setup('/spots?page=abc&sort=evil');
    expect(useSpots).toHaveBeenCalledWith({ page: 1 });
  });
  it('debounces search 400ms and resets page', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup('/spots?page=2');
    await userEvent.type(screen.getByRole('searchbox'), 'beach');
    expect(screen.getByTestId('url')).not.toHaveTextContent('search=beach');
    await act(async () => { vi.advanceTimersByTime(450); });
    expect(screen.getByTestId('url').textContent).toBe('?search=beach');
    vi.useRealTimers();
  });
  it('category chip sets category and resets page', async () => {
    setup('/spots?page=2');
    await userEvent.click(screen.getByRole('button', { name: /Nature/ }));
    expect(screen.getByTestId('url').textContent).toBe('?category=nature');
  });
  it('empty result offers Clear filters', async () => {
    useSpots.mockReturnValue(result({ spots: [], pagination: { page: 1, pages: 0, total: 0, limit: 12 } }));
    setup('/spots?search=zzz');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByTestId('url').textContent).toBe('');
  });
  it('corrects page past the last page', () => {
    setup('/spots?page=99');
    expect(screen.getByTestId('url').textContent).toBe('?page=3');
  });
  it('hovering a row highlights its pin', async () => {
    setup('/spots');
    await userEvent.hover(screen.getByRole('article'));
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 's1');
  });
  it('gives the map its live treatment, and hovering a pin highlights its row', async () => {
    setup('/spots');
    expect(screen.getByTestId('map')).toHaveAttribute('data-live', 'yes');
    expect(screen.getByRole('article')).toHaveClass('bg-white');
    await userEvent.hover(screen.getByTestId('map'));
    expect(screen.getByRole('article')).toHaveClass('bg-paper');
    await userEvent.unhover(screen.getByTestId('map'));
    expect(screen.getByRole('article')).toHaveClass('bg-white');
  });
  it('has a List / Map toggle', () => {
    setup('/spots');
    expect(screen.getByRole('button', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument();
  });
});
