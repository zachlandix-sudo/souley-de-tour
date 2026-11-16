import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Activity from './Activity';
import * as admin from '../../services/adminService';

vi.mock('../../services/adminService');
const line = (over) => ({ _id: Math.random().toString(36).slice(2), actorName: 'Ad Min', createdAt: new Date().toISOString(), targetType: 'spot', ...over });
const page = (data, total = data.length) => ({ data, pagination: { page: 1, limit: 25, total, pages: 1 } });
beforeEach(() => { vi.resetAllMocks(); });

describe('Activity', () => {
  it('writes each line as who did what to what, with the detail after a dot', async () => {
    admin.getActivity.mockResolvedValue(page([
      line({ action: 'spot.bulk_published', targetLabel: 'Alpha, Beta', detail: '2 spots' }),
      line({ action: 'user.role_changed', targetType: 'user', targetLabel: 'Jonas', detail: 'visitor → editor', actorName: 'Ed' }),
    ]));
    render(<Activity />);
    expect(await screen.findByText(/published/)).toHaveTextContent('Ad Min published Alpha, Beta · 2 spots');
    expect(screen.getByText(/changed the role of/)).toHaveTextContent('Ed changed the role of Jonas · visitor → editor');
    expect(screen.getByText('2 recorded changes. Newest first.')).toBeInTheDocument();
  });
  it('groups the lines under Today', async () => {
    admin.getActivity.mockResolvedValue(page([line({ action: 'spot.updated', targetLabel: 'Alpha' })]));
    render(<Activity />);
    expect(await screen.findByText('Today')).toBeInTheDocument();
  });
  it('an unknown action is still shown, never blank', async () => {
    admin.getActivity.mockResolvedValue(page([line({ action: 'spot.teleported', targetLabel: 'Alpha' })]));
    render(<Activity />);
    expect(await screen.findByText(/spot\.teleported/)).toBeInTheDocument();
  });
  it('a kind button asks the server for that kind, starting again from page 1', async () => {
    admin.getActivity.mockResolvedValue(page([line({ action: 'spot.updated', targetLabel: 'Alpha' })]));
    render(<Activity />);
    await screen.findByText(/edited/);
    await userEvent.click(screen.getByRole('button', { name: 'Reviews' }));
    expect(admin.getActivity).toHaveBeenLastCalledWith({ type: 'review', q: undefined, page: 1, limit: 25 });
    expect(screen.getByRole('button', { name: 'Reviews' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('says so when there is nothing yet', async () => {
    admin.getActivity.mockResolvedValue(page([]));
    render(<Activity />);
    expect(await screen.findByText(/No activity yet/)).toBeInTheDocument();
  });
});
