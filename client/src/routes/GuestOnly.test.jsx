import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuestOnly from './GuestOnly';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const at = (entry = '/login') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route element={<GuestOnly />}><Route path="/login" element={<p>login page</p>} /></Route>
      <Route path="/" element={<p>home</p>} />
      <Route path="/admin" element={<p>admin home</p>} />
    </Routes>
  </MemoryRouter>
);

describe('GuestOnly', () => {
  it('shows the page to signed-out visitors', () => {
    auth = { user: null, loading: false };
    at();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
  it('sends a signed-in visitor home', () => {
    auth = { user: { role: 'visitor' }, loading: false };
    at();
    expect(screen.getByText('home')).toBeInTheDocument();
  });
  it('sends staff to the dashboard', () => {
    auth = { user: { role: 'editor' }, loading: false };
    at();
    expect(screen.getByText('admin home')).toBeInTheDocument();
  });
});
