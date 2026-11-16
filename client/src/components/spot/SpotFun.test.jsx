import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CostSplitter, GoodFor, LiveStrip, TickList } from './SpotFun';
import FoodFun from '../food/FoodFun';
import { useSpotWeather } from '../../hooks/useSpotWeather';

vi.mock('../../hooks/useSpotWeather');

const days = [
  { date: '2026-11-13', code: 2, max: 31, rain: 30, rise: '2026-11-13T05:34', set: '2026-11-13T17:34' },
  { date: '2026-11-14', code: 61, max: 29, rain: 80 },
  { date: '2026-11-15', code: 0, max: 32, rain: 10 },
];

beforeEach(() => { window.localStorage.clear(); });

describe('TickList', () => {
  it('ticks items, counts them and remembers them on this device', async () => {
    const { unmount } = render(<TickList storeKey="t:do" items={['Snorkeling', 'Diving']} label="done" />);
    expect(screen.getByText('0 / 2 done')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Snorkeling/ }));
    expect(screen.getByRole('button', { name: /Snorkeling/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 / 2 done')).toBeInTheDocument();
    unmount();
    render(<TickList storeKey="t:do" items={['Snorkeling', 'Diving']} label="done" />);
    expect(screen.getByText('1 / 2 done')).toBeInTheDocument();
  });
  it('celebrates when everything is ticked', async () => {
    const { container } = render(<TickList storeKey="t:all" items={['A']} label="packed" />);
    expect(container.querySelector('.burst')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /A/ }));
    expect(container.querySelector('.burst')).not.toBeNull();
  });
  it('ignores saved ticks for items that no longer exist', () => {
    window.localStorage.setItem('t:old', JSON.stringify(['Gone']));
    render(<TickList storeKey="t:old" items={['Here']} />);
    expect(screen.getByText('0 / 1 done')).toBeInTheDocument();
  });
});

describe('CostSplitter', () => {
  it('multiplies the estimate by the group size, between 1 and the maximum', async () => {
    render(<CostSplitter perPerson={300} max={3} />);
    expect(screen.getByText('₱600')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More people' }));
    expect(screen.getByText('₱900')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More people' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Fewer people' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fewer people' }));
    expect(screen.getByRole('button', { name: 'Fewer people' })).toBeDisabled();
  });
  it('shows nothing without an estimate', () => {
    const { container } = render(<CostSplitter perPerson={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('GoodFor and LiveStrip', () => {
  it('lists tags, and nothing for an empty list', () => {
    const { container, rerender } = render(<GoodFor tags={['Easy-going']} />);
    expect(screen.getByText('Easy-going')).toBeInTheDocument();
    rerender(<GoodFor tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('shows the weather, a verdict and marks one best day', () => {
    useSpotWeather.mockReturnValue({ loading: false, error: false, temp: 29.4, code: 2, wind: 12, days });
    const { container } = render(<LiveStrip pos={[10, 125]} name="Test" />);
    expect(screen.getByText(/Looking good/)).toBeInTheDocument();
    expect(container.querySelectorAll('.lv-week li')).toHaveLength(3);
    expect(container.querySelectorAll('.lv-best')).toHaveLength(1);
    expect(container.querySelector('li.is-best')).toHaveTextContent('Sun');
  });
  it('renders nothing while loading, on error, or without coordinates', () => {
    useSpotWeather.mockReturnValue({ loading: true });
    const a = render(<LiveStrip pos={[10, 125]} name="Test" />);
    expect(a.container).toBeEmptyDOMElement();
    useSpotWeather.mockReturnValue({ loading: false, error: true });
    const b = render(<LiveStrip pos={[10, 125]} name="Test" />);
    expect(b.container).toBeEmptyDOMElement();
    useSpotWeather.mockReturnValue({ loading: false, error: false, days });
    const c = render(<LiveStrip pos={null} name="Test" />);
    expect(c.container).toBeEmptyDOMElement();
  });
});

describe('FoodFun', () => {
  const spot = { _id: 'f1', slug: 'sa-natad', name: 'Sa Natad', entryType: 'restaurant', estimatedBudget: 250 };
  it('stamps "I ate here", counts it and can undo it', async () => {
    render(<MemoryRouter><FoodFun spot={spot} /></MemoryRouter>);
    expect(screen.getByText('Lunch and dinner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /I ate here/ }));
    expect(screen.getByRole('button', { name: /Stamped/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/First bite/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Stamped/ }));
    expect(screen.getByText(/Just hungry/)).toBeInTheDocument();
  });
  it('Surprise me picks one of the related places', async () => {
    const onPick = vi.fn();
    const other = { _id: 'f2', slug: 'bay', name: 'Bay Cafe' };
    render(<MemoryRouter><FoodFun spot={spot} related={[other]} onPick={onPick} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /Surprise me/ }));
    expect(onPick).toHaveBeenCalledWith(other);
  });
  it('has no Surprise me button when there is nothing to pick', () => {
    render(<MemoryRouter><FoodFun spot={spot} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /Surprise me/ })).toBeNull();
  });
});
