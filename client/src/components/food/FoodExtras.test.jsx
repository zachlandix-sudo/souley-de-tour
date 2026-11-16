import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FoodFilters from './FoodFilters';
import FoodLogStrip from './FoodLogStrip';
import FoodRoulette from './FoodRoulette';
import FoodTripTray from './FoodTripTray';
import FoodCard from './FoodCard';
import { DEFAULT_FILTERS, MEALS } from '../../utils/food';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const SPOTS = [
  { _id: '1', slug: 'a', name: 'Bay Café', municipality: 'Maasin City', address: 'Rizal St', entryType: 'cafe', images: ['/a.jpg'] },
  { _id: '2', slug: 'b', name: 'Zed Grill', municipality: 'Sogod', entryType: 'restaurant', images: ['/b.jpg'] },
];
const base = { filters: DEFAULT_FILTERS, onChange: () => {}, onClear: () => {}, counts: { restaurant: 76, cafe: 41 }, matched: 117, total: 117, user: { _id: 'u' }, onSpin: () => {} };

describe('FoodFilters', () => {
  it('shows a chip per type that has places, with its count, and toggles a type', async () => {
    const onChange = vi.fn();
    wrap(<FoodFilters {...base} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: /Bakery/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Café 41/ }));
    expect(onChange).toHaveBeenCalledWith({ types: ['cafe'] });
  });
  it('picks a meal by selecting its types, and picks them off again', async () => {
    const onChange = vi.fn();
    const { rerender } = wrap(<FoodFilters {...base} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Coffee/ }));
    expect(onChange).toHaveBeenCalledWith({ types: ['cafe'] });
    rerender(<MemoryRouter><FoodFilters {...base} filters={{ ...DEFAULT_FILTERS, types: ['cafe'] }} onChange={onChange} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Coffee/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /Coffee/ }));
    expect(onChange).toHaveBeenLastCalledWith({ types: [] });
  });
  it('suggests the meal for the time of day until a type is chosen', async () => {
    const onChange = vi.fn();
    wrap(<FoodFilters {...base} onChange={onChange} mealNow={MEALS[2]} minutesNow={760} />);
    expect(screen.getByText(/12:40 pm/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show lunch spots' }));
    expect(onChange).toHaveBeenCalledWith({ types: MEALS[2].types });
  });
  it('lists what is switched on as pills you can remove, and clears them all', async () => {
    const onChange = vi.fn(), onClear = vi.fn();
    wrap(<FoodFilters {...base} onChange={onChange} onClear={onClear} matched={12} filters={{ ...DEFAULT_FILTERS, town: 'Sogod', tried: 'new' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Sogod' }));
    expect(onChange).toHaveBeenCalledWith({ town: '' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onClear).toHaveBeenCalled();
  });
  it('sends signed-out visitors to the login page from Saved only, and offers Nearest only with Near me', () => {
    const { unmount } = wrap(<FoodFilters {...base} user={null} />);
    expect(screen.getByRole('link', { name: /Saved only/ })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('option', { name: 'Nearest to me' })).toBeNull();
    unmount();
    wrap(<FoodFilters {...base} nearActive />);
    expect(screen.getByRole('option', { name: 'Nearest to me' })).toBeInTheDocument();
  });
  it('only offers a rating filter once some place has reviews', () => {
    const { unmount } = wrap(<FoodFilters {...base} />);
    expect(screen.queryByLabelText('Minimum rating')).toBeNull();
    unmount();
    wrap(<FoodFilters {...base} hasRated />);
    expect(screen.getByLabelText('Minimum rating')).toBeInTheDocument();
  });
});

describe('FoodLogStrip', () => {
  it('invites the first stamp when the log is empty', () => {
    render(<FoodLogStrip tried={0} total={200} onMode={() => {}} onReset={() => {}} />);
    expect(screen.getByText(/food log is empty/)).toBeInTheDocument();
  });
  it('shows progress and rank, filters tried / new, and asks before it resets', async () => {
    const onMode = vi.fn(), onReset = vi.fn();
    render(<FoodLogStrip tried={4} total={200} onMode={onMode} onReset={onReset} />);
    expect(screen.getByText(/of 200 tried/)).toBeInTheDocument();
    expect(screen.getByText('Local taster')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show new' }));
    expect(onMode).toHaveBeenCalledWith('new');
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, clear my log' }));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('FoodTripTray', () => {
  const props = { places: SPOTS, max: 8, onRemove: vi.fn(), onMove: vi.fn(), onClear: vi.fn(), onOpen: vi.fn() };
  it('stays out of the way until a place is added', () => {
    const { container } = render(<FoodTripTray {...props} places={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('opens the whole trip as one Maps route and lists the stops when expanded', async () => {
    render(<FoodTripTray {...props} />);
    expect(screen.getByRole('link', { name: /Open route in Maps/ }).getAttribute('href')).toContain('https://www.google.com/maps/dir/');
    await userEvent.click(screen.getByRole('button', { name: /Food trip/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Bay Café later' }));
    expect(props.onMove).toHaveBeenCalledWith('a', 1);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Zed Grill from your food trip' }));
    expect(props.onRemove).toHaveBeenCalledWith('b');
  });
});

describe('FoodRoulette', () => {
  beforeEach(() => { window.matchMedia = vi.fn().mockReturnValue({ matches: true }); }); // reduced motion: lands at once
  it('lands on a place from the list, opens it, and can add it to the trip', async () => {
    const onOpen = vi.fn(), toggle = vi.fn();
    wrap(<FoodRoulette pool={SPOTS} onOpen={onOpen} onClose={() => {}} trip={{ has: () => false, toggle, full: false }} />);
    const open = await screen.findByRole('button', { name: 'See details' });
    await userEvent.click(open);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(SPOTS).toContain(onOpen.mock.calls[0][0]);
    await userEvent.click(screen.getByRole('button', { name: 'Add to food trip' }));
    expect(toggle).toHaveBeenCalled();
  });
  it('says so when there is nothing to pick from', () => {
    wrap(<FoodRoulette pool={[]} onOpen={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Nothing to pick from/)).toBeInTheDocument();
  });
});

describe('FoodCard extras', () => {
  const fav = { user: { _id: 'u' }, saved: () => false, toggle: vi.fn(), failedId: null };
  it('shows the ate-here stamp and toggles the food trip', async () => {
    const toggle = vi.fn();
    wrap(<FoodCard spot={SPOTS[0]} fav={fav} onOpen={() => {}} tried trip={{ has: () => false, toggle, full: false }} />);
    expect(screen.getByText(/Ate here/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add Bay Café to your food trip' }));
    expect(toggle).toHaveBeenCalledWith('a');
  });
  it('disables adding when the trip is full', () => {
    wrap(<FoodCard spot={SPOTS[0]} fav={fav} onOpen={() => {}} trip={{ has: () => false, toggle: () => {}, full: true }} />);
    expect(screen.getByRole('button', { name: 'Add Bay Café to your food trip' })).toBeDisabled();
  });
});
