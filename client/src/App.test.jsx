import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './routes/router';

vi.mock('./context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false, logout: vi.fn() }) }));
vi.mock('./hooks/useSpots', () => ({ useSpots: () => ({ spots: [], pagination: null, loading: false, error: null, retry: vi.fn() }) }));
vi.mock('./hooks/useCategories', () => ({ useCategories: () => ({ categories: [], loading: false, error: null }) }));

const at = (path) => render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('App shell', () => {
  it('renders landmarks on /', () => {
    at('/');
    expect(screen.getByRole('banner')).toHaveTextContent('SOULEY de Tour');
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
  it('opens the About Dev page from its own route (a lazy page: it arrives a moment after the shell)', async () => {
    at('/about-dev');
    expect(await screen.findByRole('heading', { level: 1, name: /An idea imagined/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About Dev' })).toHaveAttribute('href', '/about-dev');
  });
  it('shows not found on unknown path', () => {
    at('/nope');
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });
});
