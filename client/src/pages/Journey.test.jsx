import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext';

const mk = (id, name, town, lat, lng) => ({ _id: id, name, slug: id, municipality: town, location: { type: 'Point', coordinates: [lng, lat] } });
const SPOTS = [mk('a', 'Alpha Falls', 'Maasin City', 10.13, 124.84), mk('b', 'Beta Cave', 'Maasin City', 10.14, 124.85), mk('c', 'Gamma Beach', 'Sogod', 10.38, 124.98)];
const STAMPS = [
  { spot: 'a', at: '2026-11-10T02:00:00.000Z', method: 'gps', name: 'Alpha Falls', municipality: 'Maasin City', slug: 'a' },
  { spot: 'b', at: '2026-11-05T02:00:00.000Z', method: 'manual', name: 'Beta Cave', municipality: 'Maasin City', slug: 'b' },
];
const OV = {
  memberSince: '2026-01-05T00:00:00Z',
  counts: { favorites: 1, reviews: 2, pendingReviews: 1, trips: 1, asks: 1 },
  reviewedSpotIds: ['b'],
  reviews: [
    { _id: 'r1', rating: 5, title: 'Loved it', status: 'approved', createdAt: '2026-11-01T00:00:00Z', spot: { _id: 'b', name: 'Beta Cave', slug: 'b', municipality: 'Maasin City' } },
    { _id: 'r2', rating: 3, title: '', status: 'pending', createdAt: '2026-11-02T00:00:00Z', spot: null },
  ],
  trips: [{ _id: 't1', title: 'Sogod weekend', generatedByAI: true, startDate: null, endDate: null, updatedAt: '2026-11-03T00:00:00Z', days: 2, stops: 5 }],
  asks: [{ _id: 'c1', question: 'Where can I swim?', at: '2026-11-14T00:00:00Z' }],
};
const EMPTY_OV = { memberSince: '2026-01-05T00:00:00Z', counts: { favorites: 0, reviews: 0, pendingReviews: 0, trips: 0, asks: 0 }, reviewedSpotIds: [], reviews: [], trips: [], asks: [] };

let authState;
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }));
const account = vi.hoisted(() => ({ listStamps: vi.fn(), mergeStamps: vi.fn(), addStamp: vi.fn(), removeStamp: vi.fn(), saveProfile: vi.fn() }));
vi.mock('../services/passportService', () => account);
const journey = vi.hoisted(() => ({ getMyOverview: vi.fn() }));
vi.mock('../services/journeyService', () => journey);
const favs = vi.hoisted(() => ({ listFavorites: vi.fn() }));
vi.mock('../services/favoriteService', () => favs);
vi.mock('../hooks/useAllSpots', () => ({ useAllSpots: () => ({ spots: SPOTS, loading: false, error: null, retry: () => {} }) }));
vi.mock('../components/Contours', () => ({ default: () => null }));
vi.mock('../components/food/FoodFun', () => ({ TRIED: 'souley:food-tried' }));

import Journey from './Journey';

const view = () => render(<I18nProvider><MemoryRouter><Journey /></MemoryRouter></I18nProvider>);
const card = (name) => screen.getByRole('heading', { name }).closest('section');

describe('Journey page', () => {
  beforeEach(() => {
    localStorage.clear();
    authState = { user: { _id: 'abc123def456', fullName: 'Maria Santos', createdAt: '2026-01-05T00:00:00Z' }, loading: false };
    Object.values(account).forEach((f) => f.mockReset());
    account.listStamps.mockResolvedValue(STAMPS);
    journey.getMyOverview.mockReset().mockResolvedValue(OV);
    favs.listFavorites.mockReset().mockResolvedValue([{ _id: 's1', name: 'Kawasan Falls', slug: 'kawasan', municipality: 'Badian', images: [] }]);
  });

  it('greets the traveller by first name and shows the passport numbers', async () => {
    view();
    expect(await screen.findByRole('heading', { level: 1, name: /Maria/ })).not.toHaveTextContent('Santos');
    expect(screen.getByText('Newcomer')).toBeInTheDocument(); // 2 stamps
    expect(screen.getByRole('progressbar', { name: '2 of 3 stamps' })).toBeInTheDocument();
    expect(screen.getByText('Passport SDT-DEF456')).toBeInTheDocument(); // the number is made from the end of the account id
  });

  it('fills every card from the account', async () => {
    view();
    await screen.findByRole('heading', { level: 1 });
    // passport: towns and latest stamps
    await waitFor(() => expect(within(card('Passport progress')).getByText('2 of 2')).toBeInTheDocument());
    expect(within(card('Passport progress')).getByRole('link', { name: 'Alpha Falls' })).toHaveAttribute('href', '/spots/a');
    // trips
    const trips = await waitFor(() => card('My trips'));
    expect(await within(trips).findByText('Sogod weekend')).toBeInTheDocument();
    expect(within(trips).getByText(/2 days · 5 stops/)).toBeInTheDocument();
    // saved
    expect(await within(card('Saved spots')).findByRole('link', { name: /Kawasan Falls/ })).toHaveAttribute('href', '/spots/kawasan');
    // reviews: status words and a removed spot
    const reviews = card('My reviews');
    expect(await within(reviews).findByText('Published')).toBeInTheDocument();
    expect(within(reviews).getByText('Waiting')).toBeInTheDocument();
    expect(within(reviews).getByText('A spot that was removed')).toBeInTheDocument();
    expect(within(reviews).getByText(/1 waiting for approval/)).toBeInTheDocument();
    // questions: one tap to ask it again
    expect(await within(card('Recent questions')).findByRole('link', { name: 'Ask again' })).toHaveAttribute('href', '/ask?q=Where%20can%20I%20swim%3F');
  });

  it('nudges a review for a stamped spot that has none, and not for one that has', async () => {
    view();
    expect(await screen.findByRole('heading', { name: 'Tell others about Alpha Falls' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Write a review' })).toHaveAttribute('href', '/spots/a');
  });

  it('a new account is walked in with a question and shows friendly empty cards', async () => {
    account.listStamps.mockResolvedValue([]);
    journey.getMyOverview.mockResolvedValue(EMPTY_OV);
    favs.listFavorites.mockResolvedValue([]);
    view();
    expect(await screen.findByRole('heading', { name: 'Start with a question' })).toBeInTheDocument();
    expect(await screen.findByText('No stamps yet. Your first one shows up here.')).toBeInTheDocument();
    expect(await screen.findByText(/No saved trips yet/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(screen.getByText(/No reviews yet/)).toBeInTheDocument();
    expect(screen.getByText('You have not asked SOULEY anything yet.')).toBeInTheDocument();
    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it('counts the food log that is kept on this device', async () => {
    localStorage.setItem('souley:food-tried', JSON.stringify(['x', 'y', 'z']));
    view();
    expect(await screen.findByText('You have eaten at 3 places.')).toBeInTheDocument();
  });

  it('when the overview fails only its cards say so, and Try again loads it once more', async () => {
    journey.getMyOverview.mockRejectedValueOnce(new Error('down'));
    view();
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(3); // trips, reviews, questions
    expect(within(card('Passport progress')).queryByRole('alert')).toBeNull();
    await userEvent.click(within(alerts[0]).getByRole('button', { name: 'Try again' }));
    expect(journey.getMyOverview).toHaveBeenCalledTimes(2);
    expect(await within(card('My trips')).findByText('Sogod weekend')).toBeInTheDocument();
  });

  it('keeps the stamps on this device and says so when the account cannot be reached', async () => {
    account.listStamps.mockRejectedValue(new Error('offline'));
    view();
    expect(await screen.findByText(/could not reach your account/)).toBeInTheDocument();
  });
});
