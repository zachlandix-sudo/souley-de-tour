import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nContext';
import { STORAGE_KEY } from '../utils/passport';

const mk = (id, name, town, lat, lng) => ({ _id: id, name, slug: id, municipality: town, location: { type: 'Point', coordinates: [lng, lat] } });
const SPOTS = [mk('a', 'Alpha Falls', 'Maasin City', 10.13, 124.84), mk('b', 'Beta Cave', 'Maasin City', 10.14, 124.85), mk('c', 'Gamma Beach', 'Sogod', 10.38, 124.98)];

let nearState;
let authState;
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }));
const account = vi.hoisted(() => ({ listStamps: vi.fn(), mergeStamps: vi.fn(), addStamp: vi.fn(), removeStamp: vi.fn(), saveProfile: vi.fn() }));
vi.mock('../services/passportService', () => account);
const card = vi.hoisted(() => ({ passportCardBlob: vi.fn(), downloadBlob: vi.fn() }));
vi.mock('../utils/passportCard', () => card);
vi.mock('../hooks/useAllSpots', () => ({ useAllSpots: () => ({ spots: SPOTS, loading: false, error: null, retry: () => {} }) }));
vi.mock('../hooks/useNearMe', () => ({ useNearMe: () => nearState }));
vi.mock('../components/Contours', () => ({ default: () => null }));

import Passport from './Passport';

const view = () => render(<I18nProvider><MemoryRouter><Passport /></MemoryRouter></I18nProvider>);
const visa = (name) => screen.getByRole('heading', { name }).closest('li');

describe('Passport page', () => {
  beforeEach(() => {
    localStorage.clear();
    authState = { user: null, loading: false, updatePassport: vi.fn() };
    Object.values(account).forEach((f) => f.mockReset());
    card.passportCardBlob.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    card.downloadBlob.mockReset();
    nearState = { status: 'idle', origin: null, active: false, enable: vi.fn(), disable: vi.fn() };
  });

  it('starts empty with the title, a 0 count and the device note', () => {
    view();
    expect(screen.getByRole('heading', { level: 1, name: 'Leyte Passport' })).toBeInTheDocument();
    expect(screen.getByText('Tourist · 0 of 3 stamps')).toBeInTheDocument();
    expect(screen.getByText('Stamps are saved on this device only.')).toBeInTheDocument();
  });

  it('"I was here" adds a stamp, updates the rank and saves it in the browser', async () => {
    view();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
    expect(within(visa('Alpha Falls')).getByText('Marked by hand')).toBeInTheDocument();
    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY)))).toEqual(['a']);
  });

  it('completing a town with 2+ spots shows its badge', async () => {
    view();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    await userEvent.click(within(visa('Beta Cave')).getByRole('button', { name: 'I was here' }));
    expect(screen.getAllByText('Town badge earned')).toHaveLength(1);
  });

  it('removing a stamp takes it back', async () => {
    view();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'Remove stamp' }));
    expect(screen.getByText('Tourist · 0 of 3 stamps')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({});
  });

  it('shows "Stamp it" only when the visitor is within range', () => {
    nearState = { status: 'on', origin: [10.1301, 124.8401], active: true, enable: vi.fn(), disable: vi.fn() };
    view();
    expect(within(visa('Alpha Falls')).getByRole('button', { name: 'Stamp it' })).toBeInTheDocument();
    expect(within(visa('Gamma Beach')).queryByRole('button', { name: 'Stamp it' })).toBeNull();
    expect(within(visa('Gamma Beach')).getByText(/Get within 300 m/)).toBeInTheDocument();
  });

  it('suggests the nearest spot without a stamp once the location is known', () => {
    nearState = { status: 'on', origin: [10.1301, 124.8401], active: true, enable: vi.fn(), disable: vi.fn() };
    view();
    const next = screen.getByRole('heading', { name: 'Next stamp near you' }).closest('section');
    expect(within(next).getByText('Alpha Falls')).toBeInTheDocument();
  });

  it('loads stamps that were saved earlier', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ c: { at: '2026-10-01T00:00:00.000Z', method: 'gps', name: 'Gamma Beach', municipality: 'Sogod', slug: 'c' } }));
    view();
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
  });

  it('the Find my location button asks for the location', async () => {
    view();
    await userEvent.click(screen.getByRole('button', { name: 'Find my location' }));
    expect(nearState.enable).toHaveBeenCalled();
  });

  it('shows the permission message when location is denied', () => {
    nearState = { status: 'denied', origin: null, active: false, enable: vi.fn(), disable: vi.fn() };
    view();
    expect(screen.getByRole('alert')).toHaveTextContent('Location is off');
  });

  it('shows the stats strip and the next rank', async () => {
    view();
    expect(screen.getByText('Towns visited')).toBeInTheDocument();
    expect(screen.getByText('Next rank: Newcomer at 1 stamps')).toBeInTheDocument();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    expect(screen.getByText('Next rank: Wanderer at 5 stamps')).toBeInTheDocument();
  });

  it('the filter chips show only collected or still-to-find stamps', async () => {
    view();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    await userEvent.click(screen.getByRole('button', { name: 'Collected' }));
    expect(screen.getByRole('heading', { name: 'Alpha Falls' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Beta Cave' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Still to find' }));
    expect(screen.queryByRole('heading', { name: 'Alpha Falls' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Beta Cave' })).toBeInTheDocument();
  });
});

describe('Passport page: account and picture', () => {
  const USER = { _id: '64b7f0f0f0f0f0f0f0f0abc1', fullName: 'Maria Santos', createdAt: '2026-09-20T00:00:00.000Z', passport: { homeTown: 'Cebu City', color: 'green' } };
  beforeEach(() => {
    localStorage.clear();
    nearState = { status: 'idle', origin: null, active: false, enable: vi.fn(), disable: vi.fn() };
    Object.values(account).forEach((f) => f.mockReset());
    card.passportCardBlob.mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    card.downloadBlob.mockReset();
  });

  it('a guest is told stamps stay on this device and is invited to sign in', () => {
    authState = { user: null, loading: false, updatePassport: vi.fn() };
    view();
    expect(screen.getByText('Stamps are saved on this device only.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Sign in to keep them on every device.' })[0]).toHaveAttribute('href', '/login');
    expect(screen.getByText('Guest traveller')).toBeInTheDocument();
  });

  it('a signed-in visitor sees the stamps from the account and the holder page', async () => {
    authState = { user: USER, loading: false, updatePassport: vi.fn() };
    account.listStamps.mockResolvedValue([{ spot: 'c', at: '2026-10-01T00:00:00.000Z', method: 'gps', name: 'Gamma Beach', municipality: 'Sogod', slug: 'c' }]);
    view();
    expect(await screen.findByText('Your stamps are saved to your account.')).toBeInTheDocument();
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Passport holder' })).toHaveTextContent('Maria Santos');
    expect(screen.getByRole('group', { name: 'Passport holder' })).toHaveTextContent('SDT-F0ABC1');
    expect(screen.getByLabelText('Home town')).toHaveValue('Cebu City');
  });

  it('stamping while signed in saves to the account, and a refusal takes the stamp back with a message', async () => {
    authState = { user: USER, loading: false, updatePassport: vi.fn() };
    account.listStamps.mockResolvedValue([]);
    account.addStamp.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Object.assign(new Error('x'), { response: { status: 409 } }));
    view();
    await screen.findByText('Your stamps are saved to your account.');
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    expect(account.addStamp).toHaveBeenCalledWith('a', expect.objectContaining({ method: 'manual' }));
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
    await userEvent.click(within(visa('Beta Cave')).getByRole('button', { name: 'I was here' }));
    expect(await screen.findByText(/Couldn’t save that stamp to your account/)).toBeInTheDocument();
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
  });

  it('says so when the account cannot be reached, keeps working, and offers a retry', async () => {
    authState = { user: USER, loading: false, updatePassport: vi.fn() };
    account.listStamps.mockRejectedValue(Object.assign(new Error('Network Error'), { response: undefined }));
    view();
    expect(await screen.findByText(/Can’t reach your account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    expect(screen.getByText('Newcomer · 1 of 3 stamps')).toBeInTheDocument();
  });

  it('"Share as image" is off until there is a stamp, then makes the picture and saves it where sharing files is not possible', async () => {
    authState = { user: USER, loading: false, updatePassport: vi.fn() };
    account.listStamps.mockResolvedValue([]);
    account.addStamp.mockResolvedValue(undefined);
    view();
    await screen.findByText('Your stamps are saved to your account.');
    const button = screen.getByRole('button', { name: 'Share as image' });
    expect(button).toBeDisabled();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(card.passportCardBlob).toHaveBeenCalledTimes(1);
    const data = card.passportCardBlob.mock.calls[0][0];
    expect(data).toMatchObject({ color: 'green', count: 1, total: 3, rankLabel: 'Newcomer', holder: { name: 'Maria Santos', homeTown: 'Cebu City', number: 'SDT-F0ABC1' } });
    expect(data.stamps.map((x) => x.name)).toEqual(['Alpha Falls']);
    expect(card.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'souley-passport.png');
    expect(await screen.findByText('Your card was saved as a picture.')).toBeInTheDocument();
  });

  it('says so when the card cannot be made on this device', async () => {
    authState = { user: null, loading: false, updatePassport: vi.fn() };
    card.passportCardBlob.mockResolvedValue(null);
    view();
    await userEvent.click(within(visa('Alpha Falls')).getByRole('button', { name: 'I was here' }));
    await userEvent.click(screen.getByRole('button', { name: 'Share as image' }));
    expect(await screen.findByText('Couldn’t make the card on this device.')).toBeInTheDocument();
    expect(card.downloadBlob).not.toHaveBeenCalled();
  });
});
