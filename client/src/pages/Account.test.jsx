import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Account from './Account';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
const setup = () => render(<MemoryRouter><Account /></MemoryRouter>);
const type = async (cur, next, conf) => {
  await userEvent.type(screen.getByLabelText('Current password'), cur);
  await userEvent.type(screen.getByLabelText(/^New password/), next);
  await userEvent.type(screen.getByLabelText('Confirm new password'), conf);
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
};

describe('Account', () => {
  beforeEach(() => { auth = { user: { fullName: 'Ana', email: 'a@b.co' }, changePassword: vi.fn().mockResolvedValue({}), logoutAll: vi.fn().mockResolvedValue() }; });

  it('rejects mismatched passwords without calling the API', async () => {
    setup();
    await type('oldpass123', 'newpass123', 'different1');
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });
  it('changes the password and shows success', async () => {
    setup();
    await type('oldpass123', 'newpass123', 'newpass123');
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(auth.changePassword).toHaveBeenCalledWith({ currentPassword: 'oldpass123', newPassword: 'newpass123', confirmPassword: 'newpass123' });
  });
  it('shows the API message when the current password is wrong', async () => {
    auth.changePassword.mockRejectedValue({ response: { status: 400, data: { message: 'Current password is incorrect.' } } });
    setup();
    await type('wrong', 'newpass123', 'newpass123');
    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
  });
  it('log out of all devices calls logoutAll', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Log out of all devices' }));
    expect(auth.logoutAll).toHaveBeenCalled();
  });
});
