import { vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Trips from './Trips';
import Ask from './Ask';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/itineraryService', () => ({
  listTrips: vi.fn(), getTrip: vi.fn(), createTrip: vi.fn(), removeTrip: vi.fn(),
}));
vi.mock('../services/aiService', () => ({ askAi: vi.fn() }));
import { listTrips, getTrip, createTrip, removeTrip } from '../services/itineraryService';
import { askAi } from '../services/aiService';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const trip = {
  _id: 't1', title: 'Two days in Sogod', generatedByAI: true, updatedAt: '2026-10-01T00:00:00Z',
  days: [{ dayNumber: 1, items: [{ visitOrder: 1, touristSpotId: { name: 'Tinago Falls', slug: 'tinago', municipality: 'Sogod' } }] }],
};

beforeEach(() => { vi.clearAllMocks(); auth = { user: { _id: 'u' } }; });

describe('Trips', () => {
  it('shows empty state with a link to Ask', async () => {
    listTrips.mockResolvedValue([]);
    wrap(<Trips />);
    expect(await screen.findByText('No saved trips yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ask SOULEY/ })).toHaveAttribute('href', '/ask');
  });

  it('lists trips with spot links', async () => {
    listTrips.mockResolvedValue([{ _id: 't1' }]);
    getTrip.mockResolvedValue(trip);
    wrap(<Trips />);
    expect(await screen.findByText('Two days in Sogod')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tinago Falls' })).toHaveAttribute('href', '/spots/tinago');
  });

  it('deletes only after confirm', async () => {
    listTrips.mockResolvedValue([{ _id: 't1' }]);
    getTrip.mockResolvedValue(trip);
    removeTrip.mockResolvedValue();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    wrap(<Trips />);
    await screen.findByText('Two days in Sogod');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(removeTrip).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(removeTrip).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(screen.queryByText('Two days in Sogod')).not.toBeInTheDocument());
    confirm.mockRestore();
  });

  it('shows error state when loading fails', async () => {
    listTrips.mockRejectedValue(new Error('x'));
    wrap(<Trips />);
    expect(await screen.findByRole('button', { name: /try again|retry/i })).toBeInTheDocument();
  });
});

describe('Ask save trip', () => {
  const plan = { answer: 'Here is your plan', aiUsed: true, recommendations: [], days: [{ dayNumber: 1, items: [{ touristSpotId: 's1', visitOrder: 1 }] }] };
  const ask = async () => {
    askAi.mockResolvedValue(plan);
    wrap(<Ask />);
    await userEvent.click(screen.getByRole('tab', { name: /trip/i }));
    await userEvent.type(screen.getByLabelText(/question|ask/i), 'Plan 2 days in Maasin');
    await userEvent.click(screen.getByRole('button', { name: /^(ask|send|plan)/i }));
    await screen.findByText('Here is your plan');
  };

  it('guests are asked to log in', async () => {
    auth = { user: null };
    await ask();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save this trip' })).not.toBeInTheDocument();
  });

  it('saves the trip and links to /trips', async () => {
    createTrip.mockResolvedValue({});
    await ask();
    await userEvent.click(screen.getByRole('button', { name: 'Save this trip' }));
    expect(createTrip).toHaveBeenCalledWith(expect.objectContaining({ title: 'Plan 2 days in Maasin', generatedByAI: true }));
    const status = await screen.findByRole('status');
    expect(within(status).getByRole('link', { name: 'View my trips' })).toHaveAttribute('href', '/trips');
  });

  it('shows an error when saving fails', async () => {
    createTrip.mockRejectedValue(new Error('x'));
    await ask();
    await userEvent.click(screen.getByRole('button', { name: 'Save this trip' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
  });
});
