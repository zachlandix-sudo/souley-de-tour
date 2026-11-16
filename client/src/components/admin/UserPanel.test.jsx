import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UserPanel from './UserPanel';
import * as users from '../../services/userService';

vi.mock('../../services/userService');
const person = { _id: 'u1', fullName: 'Visi Tor', email: 'visi@x.ph' };
const overview = (locked = false) => ({
  user: { ...person, role: 'visitor', status: 'active', locked, createdAt: '2026-10-05T00:00:00Z', lastLogin: null },
  counts: { reviews: 3, approvedReviews: 2, itineraries: 1, favorites: 7 },
  recentReviews: [{ _id: 'r1', rating: 5, title: 'Loved it', status: 'approved', touristSpotId: { name: 'Kawasan Falls', slug: 'kawasan' } }],
  recentTrips: [{ _id: 't1', title: 'Weekend', generatedByAI: true, createdAt: '2026-11-01T00:00:00Z', days: 2 }],
});
const wrap = (props = {}) => {
  const fns = { onClose: vi.fn(), onChanged: vi.fn() };
  render(<MemoryRouter><UserPanel user={person} isSelf={false} {...fns} {...props} /></MemoryRouter>);
  return fns;
};
beforeEach(() => { vi.resetAllMocks(); users.getUserOverview.mockResolvedValue(overview()); });
afterEach(() => vi.restoreAllMocks());

describe('UserPanel', () => {
  it('shows the totals, latest reviews and trips, and "Never" when they have not logged in', async () => {
    wrap();
    expect(await screen.findByRole('list', { name: 'Activity totals' })).toHaveTextContent('3Reviews2 approved');
    expect(screen.getByRole('link', { name: 'Kawasan Falls' })).toHaveAttribute('href', '/spots/kawasan');
    expect(screen.getByText(/Weekend/)).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });
  it('moves focus to Close, and Esc and Close both close it', async () => {
    const { onClose } = wrap();
    await screen.findByText('Latest reviews');
    expect(screen.getByRole('button', { name: 'Close details' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('signs the person out everywhere after a confirm, and tells the list to reload', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    users.forceLogoutUser.mockResolvedValue('Visi Tor was signed out on every device.');
    const { onChanged } = wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));
    expect(users.forceLogoutUser).toHaveBeenCalledWith('u1');
    expect(await screen.findByText('Visi Tor was signed out on every device.')).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });
  it('a locked account has an Unlock button', async () => {
    users.getUserOverview.mockResolvedValue(overview(true));
    users.unlockUser.mockResolvedValue('Visi Tor can try to log in again.');
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Unlock account' }));
    expect(users.unlockUser).toHaveBeenCalledWith('u1');
  });
  it('on your own account there is no sign-out button, and no Unlock when not locked', async () => {
    wrap({ isSelf: true });
    await screen.findByText('Latest reviews');
    expect(screen.queryByRole('button', { name: 'Sign out everywhere' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Unlock account' })).toBeNull();
  });
  it('shows a problem from the server instead of failing silently', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    users.forceLogoutUser.mockRejectedValue({ response: { data: { message: 'User not found.' } } });
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out everywhere' }));
    expect(await screen.findByText('User not found.')).toBeInTheDocument();
  });
});
