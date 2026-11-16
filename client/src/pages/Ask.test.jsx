import { vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Ask from './Ask';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../services/itineraryService', () => ({ createTrip: vi.fn() }));
vi.mock('../services/aiService', () => ({ askAi: vi.fn() }));
import { askAi } from '../services/aiService';

const wrap = (ui, url = '/ask') => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);
const recs = { answer: 'Try the falls near Sogod.', aiUsed: true, days: [], recommendations: [{ spotId: 's1', reason: 'Easy walk', spot: { slug: 'tinago', name: 'Tinago Falls', municipality: 'Sogod' } }] };

beforeEach(() => { vi.clearAllMocks(); });

describe('Ask page', () => {
  it('shows four ideas that change with the mode, and a mode switch that marks the chosen tab', async () => {
    wrap(<Ask />);
    expect(screen.getByText('Best waterfalls and caves in Southern Leyte')).toBeInTheDocument();
    const [rec, trip] = screen.getAllByRole('tab');
    expect(rec).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(trip);
    expect(trip).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('A relaxed 2-day nature escape')).toBeInTheDocument();
    expect(screen.queryByText('Best waterfalls and caves in Southern Leyte')).toBeNull();
  });

  it('clicking an idea asks it straight away and shows the answer with spot cards', async () => {
    askAi.mockResolvedValue(recs);
    wrap(<Ask />);
    await userEvent.click(screen.getByText('Family-friendly spots with easy access'));
    expect(askAi).toHaveBeenCalledWith('recommend', { question: 'Family-friendly spots with easy access' });
    expect(await screen.findByText('Try the falls near Sogod.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tinago Falls/ })).toHaveAttribute('href', '/spots/tinago');
    expect(screen.queryByText('Best waterfalls and caves in Southern Leyte')).toBeNull(); // ideas leave once the chat starts
  });

  it('Enter sends, Shift+Enter does not', async () => {
    askAi.mockResolvedValue(recs);
    wrap(<Ask />);
    const box = screen.getByLabelText(/your question/i);
    await userEvent.type(box, 'waterfalls{Shift>}{Enter}{/Shift}near me');
    expect(askAi).not.toHaveBeenCalled();
    expect(box.value).toBe('waterfalls\nnear me');
    await userEvent.type(box, '{Enter}');
    expect(askAi).toHaveBeenCalledTimes(1);
    expect(askAi.mock.calls[0][1].question).toBe('waterfalls\nnear me');
  });

  it('trip planner sends days and budget (a budget chip fills the field)', async () => {
    askAi.mockResolvedValue({ answer: 'Plan', aiUsed: true, recommendations: [], days: [] });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.click(screen.getByRole('button', { name: 'More days' }));
    await userEvent.click(screen.getByRole('button', { name: '₱3,000' }));
    await userEvent.type(screen.getByLabelText(/your question/i), 'Beach weekend{Enter}');
    expect(askAi).toHaveBeenCalledWith('itinerary', { question: 'Beach weekend', durationDays: 3, budget: 3000 });
  });

  it('a failed request shows an alert with Try again, which repeats the same request', async () => {
    askAi.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(recs);
    wrap(<Ask />);
    await userEvent.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Try the falls near Sogod.')).toBeInTheDocument();
    expect(askAi).toHaveBeenCalledTimes(2);
    expect(askAi.mock.calls[1]).toEqual(askAi.mock.calls[0]);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('New chat clears the conversation and brings the ideas back', async () => {
    askAi.mockResolvedValue(recs);
    wrap(<Ask />);
    await userEvent.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    await screen.findByText('Try the falls near Sogod.');
    await userEvent.click(screen.getByRole('button', { name: 'New chat' }));
    expect(screen.queryByText('Try the falls near Sogod.')).toBeNull();
    expect(screen.getByText('Relaxing beaches near Maasin City')).toBeInTheDocument();
  });

  it('copies the answer', async () => {
    askAi.mockResolvedValue(recs);
    const user = userEvent.setup(); // setup() installs its own clipboard stub, so ours goes in after it
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    wrap(<Ask />);
    await user.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    await screen.findByText('Try the falls near Sogod.');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('Try the falls near Sogod.');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('draws an itinerary as numbered stops grouped by day', async () => {
    askAi.mockResolvedValue({ answer: 'Your plan', aiUsed: true, recommendations: recs.recommendations,
      days: [{ dayNumber: 1, items: [{ touristSpotId: 's1', visitOrder: 1, notes: 'Go early' }] }] });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.type(screen.getByLabelText(/your question/i), 'two days{Enter}');
    const day = (await screen.findByText('Day 1')).closest('li');
    expect(within(day).getByRole('link', { name: 'Tinago Falls' })).toHaveAttribute('href', '/spots/tinago');
    expect(within(day).getByText('Go early')).toBeInTheDocument();
  });

  it('trip planner sends up to 50 days, the pace and the start date', async () => {
    askAi.mockResolvedValue({ answer: 'Plan', aiUsed: true, recommendations: [], days: [] });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.click(screen.getByRole('button', { name: '50 days' }));
    await userEvent.click(screen.getByRole('button', { name: 'Packed' }));
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-12-20' } });
    await userEvent.type(screen.getByLabelText(/your question/i), 'All of Southern Leyte{Enter}');
    expect(askAi).toHaveBeenCalledWith('itinerary', { question: 'All of Southern Leyte', durationDays: 50, pace: 'packed', startDate: '2026-12-20' });
  });

  it('a long trip gets week jumps and a day strip; choosing a day shows that day only', async () => {
    const n = 15;
    const places = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, slug: `spot-${i + 1}`, name: `Spot ${i + 1}`, municipality: 'Sogod', lat: 10.3 + i * 0.01, lng: 125 + i * 0.01 }));
    const days = places.map((p, i) => ({ dayNumber: i + 1, budget: 0, items: [{ touristSpotId: p.id, visitOrder: 1, notes: '', kind: 'spot', slot: 'morning', cost: null }] }));
    askAi.mockResolvedValue({ answer: 'Long trip', aiUsed: false, recommendations: [], days, places, plan: { requestedDays: n, plannedDays: n, pace: 'relaxed', totalBudget: 0, shortfall: false } });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.type(screen.getByLabelText(/your question/i), 'two weeks{Enter}');
    expect(await screen.findByRole('button', { name: 'Week 3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spot 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Day 9' }));
    expect(screen.getByRole('link', { name: 'Spot 9' })).toHaveAttribute('href', '/spots/spot-9');
    expect(screen.queryByRole('link', { name: 'Spot 1' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Week 1' }));
    expect(screen.getByRole('link', { name: 'Spot 1' })).toBeInTheDocument();
  });

  it('shows the running total, a note when days could not all be filled, and tips', async () => {
    const places = [{ id: 'p1', slug: 'spot-1', name: 'Spot 1', municipality: 'Sogod', lat: 10.3, lng: 125 }];
    askAi.mockResolvedValue({ answer: 'Short trip', aiUsed: true, recommendations: [], places,
      days: [{ dayNumber: 1, budget: 1250, items: [{ touristSpotId: 'p1', visitOrder: 1, notes: '', kind: 'spot', slot: 'morning', cost: 1250 }] }],
      plan: { requestedDays: 5, plannedDays: 1, pace: 'relaxed', totalBudget: 1250, shortfall: true }, tips: { bestTime: ['Dry months'], bring: ['Water'], safety: [] } });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.type(screen.getByLabelText(/your question/i), 'five days{Enter}');
    expect(await screen.findByText(/Only 1 of 5 days/)).toBeInTheDocument();
    expect(await screen.findByText('₱1,250', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Good to know')).toBeInTheDocument();
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('a rest day (everything left was closed) says so instead of showing an empty day', async () => {
    const places = [{ id: 'p1', slug: 'spot-1', name: 'Spot 1', municipality: 'Sogod', lat: 10.3, lng: 125 }];
    askAi.mockResolvedValue({ answer: 'Trip with a rest day', aiUsed: false, recommendations: [], places,
      days: [{ dayNumber: 1, budget: 0, items: [] }, { dayNumber: 2, budget: 0, items: [{ touristSpotId: 'p1', visitOrder: 1, notes: 'Open Tue.', kind: 'spot', slot: 'morning', cost: null }] }],
      plan: { requestedDays: 2, plannedDays: 2, pace: 'relaxed', totalBudget: 0, shortfall: false, restDays: 1 } });
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.type(screen.getByLabelText(/your question/i), 'two days{Enter}');
    expect(await screen.findByText(/Rest day\. Everything left/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next day/i }));
    expect(screen.queryByText(/Rest day\. Everything left/)).toBeNull();
    expect(screen.getByText('Open Tue.')).toBeInTheDocument();
  });

  it('a follow-up chip is sent together with the question it follows, and can switch to the trip planner', async () => {
    askAi.mockResolvedValue(recs);
    wrap(<Ask />);
    await userEvent.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: 'Turn these into a 3-day trip' }));
    expect(askAi).toHaveBeenLastCalledWith('itinerary', { question: 'waterfalls. Turn these into a 3-day trip', durationDays: 3 });
  });

  it('a typed follow-up carries the chat so far (last question, places shown); the first question carries none', async () => {
    askAi.mockResolvedValue(recs);
    wrap(<Ask />);
    const box = screen.getByLabelText(/your question/i);
    await userEvent.type(box, 'waterfalls{Enter}');
    await screen.findByText('Try the falls near Sogod.');
    expect(askAi.mock.calls[0][1]).toEqual({ question: 'waterfalls' });
    await userEvent.type(box, 'how much is it?{Enter}');
    expect(askAi).toHaveBeenLastCalledWith('recommend', { question: 'how much is it?', ctx: { q: 'waterfalls', ids: ['s1'] } });
  });

  it('shows what was understood and next questions to try; a suggestion is asked straight away and replaces the fixed chips', async () => {
    askAi.mockResolvedValue({ ...recs, engine: 'smart', chips: ['Top picks', 'Family'], suggestions: ['How much is Tinago Falls?'] });
    wrap(<Ask />);
    await userEvent.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    expect(await screen.findByText('Top picks')).toBeInTheDocument();
    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn these into a 3-day trip' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'How much is Tinago Falls?' }));
    expect(askAi).toHaveBeenLastCalledWith('recommend', { question: 'How much is Tinago Falls?', ctx: { q: 'waterfalls', ids: ['s1'] } });
  });

  it('an answer from the spot database says so, instead of blaming a missing AI model; chat lines carry no note', async () => {
    askAi.mockResolvedValue({ ...recs, aiUsed: false, engine: 'smart', intent: 'places' });
    wrap(<Ask />);
    await userEvent.type(screen.getByLabelText(/your question/i), 'waterfalls{Enter}');
    expect(await screen.findByText('Answered from our spot database.')).toBeInTheDocument();
    expect(screen.queryByText(/AI model not connected/)).toBeNull();
    askAi.mockResolvedValue({ answer: 'Hi!', aiUsed: false, engine: 'smart', intent: 'chat', recommendations: [], days: [] });
    await userEvent.type(screen.getByLabelText(/your question/i), 'hello there{Enter}');
    await screen.findByText('Hi!');
    expect(screen.getAllByText('Answered from our spot database.')).toHaveLength(1);
  });
});
