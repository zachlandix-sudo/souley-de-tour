import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const setup = (entry, El = Login) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/login" element={<El />} />
      <Route path="/register" element={<El />} />
      <Route path="/admin" element={<p>admin home</p>} />
      <Route path="/spots/x" element={<p>spot x</p>} />
      <Route path="/" element={<p>home</p>} />
    </Routes>
  </MemoryRouter>
);
const fill = async (email = 'a@b.co', pw = 'password1') => {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), pw);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
};

describe('Login', () => {
  it('wrong password shows message and stays', async () => {
    auth = { login: vi.fn().mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password.' } } }), sessionExpired: false };
    setup('/login');
    await fill();
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });
  it('visitor returns to the page they wanted', async () => {
    auth = { login: vi.fn().mockResolvedValue({ role: 'visitor' }), sessionExpired: false };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/spots/x' } } }]}>
        <Routes><Route path="/login" element={<Login />} /><Route path="/spots/x" element={<p>spot x</p>} /></Routes>
      </MemoryRouter>
    );
    await fill();
    expect(await screen.findByText('spot x')).toBeInTheDocument();
  });
  it('admin lands on /admin', async () => {
    auth = { login: vi.fn().mockResolvedValue({ role: 'admin' }), sessionExpired: false };
    setup('/login');
    await fill();
    expect(await screen.findByText('admin home')).toBeInTheDocument();
  });
  it('shows session expired notice', () => {
    auth = { login: vi.fn(), sessionExpired: true };
    setup('/login');
    expect(screen.getByText('Session expired. Log in again.')).toBeInTheDocument();
  });
});

describe('Register', () => {
  it('mismatched passwords send no request', async () => {
    auth = { register: vi.fn() };
    setup('/register', Register);
    await userEvent.type(screen.getByLabelText('Full name'), 'Ana Cruz');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/^Password/), 'password1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password2');
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });
});
