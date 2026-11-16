import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireRole from './RequireRole';
import RequireAuth from './RequireAuth';

let mockAuth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));

const Secret = vi.fn(() => <p>secret</p>);
const tree = (roles) => (
  <MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={roles} />}>
          <Route path="/admin" element={<Secret />} />
        </Route>
      </Route>
    </Routes>
  </MemoryRouter>
);

describe('guards', () => {
  beforeEach(() => Secret.mockClear());
  it('logged out goes to login', () => {
    mockAuth = { user: null, loading: false };
    render(tree(['admin']));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
  it('wrong role sees Not allowed and child never mounts', () => {
    mockAuth = { user: { role: 'editor' }, loading: false };
    render(tree(['admin']));
    expect(screen.getByRole('heading', { name: 'Not allowed' })).toBeInTheDocument();
    expect(Secret).not.toHaveBeenCalled();
  });
  it('right role renders child', () => {
    mockAuth = { user: { role: 'admin' }, loading: false };
    render(tree(['admin']));
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
