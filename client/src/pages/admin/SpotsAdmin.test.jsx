import { vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SpotsAdmin from './SpotsAdmin';
import * as admin from '../../services/adminService';

let auth;
vi.mock('../../services/adminService');
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
const spots = [
  { _id: 'a', name: 'Alpha', slug: 'a', municipality: 'Sogod', status: 'published', isFeatured: true, images: [] },
  { _id: 'b', name: 'Beta', slug: 'b', municipality: 'Maasin', status: 'draft', images: [] },
  { _id: 'c', name: 'Gamma', slug: 'c', municipality: 'Liloan', status: 'published', images: [] },
];
const wrap = () => render(<MemoryRouter><SpotsAdmin /></MemoryRouter>);
beforeEach(() => {
  vi.resetAllMocks();
  auth = { user: { fullName: 'Ad', role: 'admin' } };
  admin.listAdminSpots.mockResolvedValue({ data: spots, pagination: { page: 1, limit: 10, total: 3, pages: 1 } });
  admin.bulkSpots.mockResolvedValue({ action: 'x', requested: 2, matched: 2 });
});
afterEach(() => vi.restoreAllMocks());

describe('SpotsAdmin: bulk actions and featuring', () => {
  it('ticking rows shows the bulk bar with the count, and Clear hides it', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Alpha' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Beta' }));
    const bar = screen.getByRole('region', { name: 'Bulk actions' });
    expect(bar).toHaveTextContent('2 spots selected');
    await userEvent.click(within(bar).getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull();
  });
  it('the header box ticks every spot on the page', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select all spots on this page' }));
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toHaveTextContent('3 spots selected');
  });
  it('Publish sends the ticked ids, shows the result and clears the selection', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Alpha' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Beta' }));
    await userEvent.click(within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', { name: 'Publish' }));
    expect(admin.bulkSpots).toHaveBeenCalledWith(['a', 'b'], 'publish');
    expect(await screen.findByText('Published 2 spots.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull();
    expect(admin.listAdminSpots).toHaveBeenCalledTimes(2); // reloaded
  });
  it('bulk delete asks first, and is for admins only', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Alpha' }));
    await userEvent.click(within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', { name: 'Delete' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(admin.bulkSpots).not.toHaveBeenCalled();
  });
  it('an editor does not get the bulk Delete button', async () => {
    auth = { user: { fullName: 'Ed', role: 'editor' } };
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Alpha' }));
    expect(within(screen.getByRole('region', { name: 'Bulk actions' })).queryByRole('button', { name: 'Delete' })).toBeNull();
  });
  it('the star features a spot, or removes it when it already is featured', async () => {
    wrap();
    const on = await screen.findByRole('button', { name: 'Feature Alpha on the home page' });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(on);
    await waitFor(() => expect(admin.bulkSpots).toHaveBeenLastCalledWith(['a'], 'unfeature'));
    const beta = screen.getByRole('button', { name: 'Feature Beta on the home page' });
    await waitFor(() => expect(beta).toBeEnabled()); // the first change has finished
    await userEvent.click(beta);
    await waitFor(() => expect(admin.bulkSpots).toHaveBeenLastCalledWith(['b'], 'feature'));
  });
  it('a failed bulk action shows the problem and keeps the selection', async () => {
    admin.bulkSpots.mockRejectedValue({ response: { data: { message: 'Only an admin can delete spots.' } } });
    wrap();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Select Alpha' }));
    await userEvent.click(within(screen.getByRole('region', { name: 'Bulk actions' })).getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Only an admin can delete spots.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
  });
});
