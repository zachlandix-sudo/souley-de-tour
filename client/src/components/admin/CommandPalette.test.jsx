import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette';
import * as admin from '../../services/adminService';
import * as people from '../../services/userService';

vi.mock('../../services/adminService');
vi.mock('../../services/userService');
function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
const wrap = (props = {}) => {
  const onClose = vi.fn();
  render(<MemoryRouter><CommandPalette open onClose={onClose} isAdmin {...props} /><Where /></MemoryRouter>);
  return onClose;
};
beforeEach(() => {
  vi.resetAllMocks();
  admin.listAdminSpots.mockResolvedValue({ data: [{ _id: 's1', name: 'Alpha Falls', municipality: 'Sogod', status: 'published' }] });
  people.listUsers.mockResolvedValue({ data: [{ _id: 'u1', fullName: 'Jonas Reyes', email: 'jonas@x.ph' }] });
});

describe('CommandPalette', () => {
  it('renders nothing while closed', () => {
    render(<MemoryRouter><CommandPalette open={false} onClose={() => {}} isAdmin /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('lists the pages and focuses the search box', () => {
    wrap();
    expect(screen.getByRole('combobox', { name: 'Quick jump' })).toHaveFocus();
    expect(screen.getByRole('option', { name: /Content health/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Activity/ })).toBeInTheDocument();
  });
  it('an editor does not see the admin-only pages', () => {
    wrap({ isAdmin: false });
    expect(screen.getByRole('option', { name: /Content health/ })).toBeInTheDocument();
    ['Users', 'Activity', 'Reviews', 'Categories'].forEach((n) => expect(screen.queryByRole('option', { name: new RegExp(n) })).toBeNull());
  });
  it('typing narrows the pages and Enter goes to the first one, then closes', async () => {
    const onClose = wrap();
    await userEvent.keyboard('heal{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/health');
    expect(onClose).toHaveBeenCalled();
  });
  it('arrow keys move the highlight', async () => {
    wrap();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/spots');
  });
  it('finds spots and people on the server once two letters are typed', async () => {
    wrap();
    await userEvent.keyboard('al');
    expect(await screen.findByRole('option', { name: /Alpha Falls/ })).toBeInTheDocument();
    expect(admin.listAdminSpots).toHaveBeenCalledWith({ search: 'al', limit: 5 });
    expect(await screen.findByRole('option', { name: /Jonas Reyes/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: /Alpha Falls/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/spots/s1/edit');
  });
  it('an editor never searches people', async () => {
    wrap({ isAdmin: false });
    await userEvent.keyboard('al');
    await screen.findByRole('option', { name: /Alpha Falls/ });
    expect(people.listUsers).not.toHaveBeenCalled();
  });
  it('Esc closes it, and a text with no match says so', async () => {
    const onClose = wrap();
    await userEvent.keyboard('zzzzq');
    expect(await screen.findByText(/Nothing matches/)).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
