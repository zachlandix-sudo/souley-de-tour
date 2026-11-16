import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
function Where() { const l = useLocation(); return <p data-testid="where">{l.pathname + l.search}</p>; }
const wrap = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AdminLayout /><Where /></MemoryRouter>);

beforeEach(() => localStorage.clear());

describe('AdminLayout', () => {
  it('editor sees Overview and Spots only', () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spots' })).toBeInTheDocument();
    ['Categories', 'Reviews', 'Users'].forEach((n) => expect(screen.queryByRole('link', { name: n })).toBeNull());
  });
  it('admin sees all links', () => {
    auth = { user: { fullName: 'Ad', role: 'admin' }, logout: vi.fn() };
    wrap();
    ['Categories', 'Reviews', 'Users', 'Content health', 'Activity'].forEach((n) => expect(screen.getByRole('link', { name: n })).toBeInTheDocument());
  });
  it('editors get Content health but not the admin-only Activity log', () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap();
    expect(screen.getByRole('link', { name: 'Content health' })).toHaveAttribute('href', '/admin/health');
    expect(screen.queryByRole('link', { name: 'Activity' })).toBeNull();
  });
  it('Ctrl K opens quick jump from anywhere and Esc closes it', async () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap('/admin');
    expect(screen.queryByRole('dialog', { name: 'Quick jump' })).toBeNull();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('dialog', { name: 'Quick jump' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Quick jump' })).toBeNull();
  });
  it('the Quick jump button in the top bar opens it too', async () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap('/admin');
    await userEvent.click(screen.getByRole('button', { name: 'Quick jump' }));
    expect(screen.getByRole('dialog', { name: 'Quick jump' })).toBeInTheDocument();
  });
  it('everyone can start a new spot from the top bar and reach the public site from the sidebar', () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap();
    expect(screen.getByRole('link', { name: 'New spot' })).toHaveAttribute('href', '/admin/spots/new');
    expect(screen.getByRole('link', { name: 'Public site' })).toHaveAttribute('href', '/');
  });
  it('shows who is signed in at the bottom of the sidebar', () => {
    auth = { user: { fullName: 'Ad Min', role: 'admin' }, logout: vi.fn() };
    wrap();
    expect(screen.getByText('Ad Min')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
  it('the breadcrumb names the page you are on', () => {
    auth = { user: { fullName: 'Ad', role: 'admin' }, logout: vi.fn() };
    const { unmount } = wrap('/admin/spots/new');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('SOULEY›Spots›New spot');
    expect(screen.getByText('New spot')).toHaveAttribute('aria-current', 'page');
    unmount();
    wrap('/admin');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('SOULEY›Overview');
  });
  it('the top search opens the spots list filtered by what was typed', () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    wrap('/admin');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search spots' }), { target: { value: 'white beach' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/spots?search=white%20beach');
  });
  it('the menu button opens the sidebar on small screens and Close menu puts it away', async () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    const { container } = wrap('/admin');
    expect(container.querySelector('.adm-side')).not.toHaveClass('is-open');
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(container.querySelector('.adm-side')).toHaveClass('is-open');
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(container.querySelector('.adm-side')).not.toHaveClass('is-open');
  });
  it('the sidebar can be collapsed to icons and the choice is remembered', async () => {
    auth = { user: { fullName: 'Ed', role: 'editor' }, logout: vi.fn() };
    const { container, unmount } = wrap('/admin');
    expect(container.querySelector('.adm-shell')).not.toHaveClass('is-collapsed');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(container.querySelector('.adm-shell')).toHaveClass('is-collapsed');
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-pressed', 'true');
    unmount();
    const again = wrap('/admin');
    expect(again.container.querySelector('.adm-shell')).toHaveClass('is-collapsed');
  });
});
