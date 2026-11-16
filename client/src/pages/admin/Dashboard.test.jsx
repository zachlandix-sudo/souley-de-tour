import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as admin from '../../services/adminService';

vi.mock('../../services/adminService');
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Ad Min', role: 'admin' } }) }));
const wrap = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);
const stats = { totals: {}, timeline: { unit: 'day', labels: ['Nov 12'], keys: ['2026-11-12'], series: {} }, pies: {}, bars: {} };
// Braces on purpose: mockResolvedValue() returns the mock itself, and vitest runs any function a hook returns as a teardown,
// which called getStatistics once more after each test (and made the "broken statistics" test fail with its own "boom").
beforeEach(() => { admin.getStatistics.mockResolvedValue(stats); });

describe('Dashboard', () => {
  it('renders metrics (zero as 0) and lists', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 4, publishedSpots: 3, pendingReviews: 0, users: 7, itineraries: 2,
      mostViewed: [{ _id: 'a', name: 'Alpha', slug: 'a', viewCount: 9 }], mostFavorited: [], recentActivity: [] });
    wrap();
    expect(await screen.findByText('Total spots')).toBeInTheDocument();
    expect(screen.getByText('Pending reviews').nextSibling).toHaveTextContent('0');
    expect(screen.getByText('Users').nextSibling).toHaveTextContent('7');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
  it('greets the admin by first name and links to the review queue only when reviews wait', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 1, pendingReviews: 2, users: 1, itineraries: 0, mostViewed: [], mostFavorited: [], recentActivity: [] });
    wrap();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Ad$/);
    expect(screen.getByText('2 reviews are waiting for you.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open review queue/ })).toHaveAttribute('href', '/admin/reviews');
  });
  it('switches the bar chart between views and favorites, each bar linking to its spot', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 2, publishedSpots: 1, pendingReviews: 0, users: 1, itineraries: 0,
      mostViewed: [{ _id: 'a', name: 'Alpha', slug: 'a', viewCount: 9 }], mostFavorited: [{ _id: 'b', name: 'Beta', slug: 'b', favoriteCount: 4 }], recentActivity: [] });
    wrap();
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alpha, 9 views' })).toHaveAttribute('href', '/spots/a');
    await userEvent.click(screen.getByRole('button', { name: /Most favorited/ }));
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByRole('link', { name: 'Beta, 4 favorites' })).toHaveAttribute('href', '/spots/b');
  });
  it('shows how many spots are live in the ring', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 4, publishedSpots: 3, pendingReviews: 0, users: 1, itineraries: 0, mostViewed: [], mostFavorited: [], recentActivity: [] });
    wrap();
    expect(await screen.findByText('3 of 4 spots live')).toBeInTheDocument();
    expect(screen.getByText('Everything is up to date. Nothing is waiting for you.')).toBeInTheDocument();
  });
  it('lists recently edited spots with their status and a link to each spot', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 2, publishedSpots: 1, pendingReviews: 0, users: 1, itineraries: 0, mostViewed: [], mostFavorited: [],
      recentActivity: [{ _id: 'r', name: 'Gamma Cove', slug: 'gamma', status: 'draft', updatedAt: '2026-11-01T08:00:00Z' }] });
    wrap();
    expect(await screen.findByRole('link', { name: 'Gamma Cove' })).toHaveAttribute('href', '/spots/gamma');
    expect(screen.getByText('draft')).toBeInTheDocument();
  });
  it('shortcuts: admins get categories and users, everyone gets the public site', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 1, publishedSpots: 1, pendingReviews: 0, users: 1, itineraries: 0, mostViewed: [], mostFavorited: [], recentActivity: [] });
    wrap();
    expect(await screen.findByRole('link', { name: /Open public site/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Edit categories/ })).toHaveAttribute('href', '/admin/categories');
    expect(screen.getByRole('link', { name: /Manage users/ })).toHaveAttribute('href', '/admin/users');
  });
  it('has the statistics section (line, bar and pie graphs) between the number cards and the top spots', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 1, publishedSpots: 1, pendingReviews: 0, users: 1, itineraries: 0, mostViewed: [], mostFavorited: [], recentActivity: [] });
    wrap();
    expect(await screen.findByRole('heading', { level: 2, name: 'Statistics' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Activity over time' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top places and scores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Breakdowns' })).toBeInTheDocument();
    expect(admin.getStatistics).toHaveBeenCalledWith('30d');
    expect(screen.getByText('Total spots')).toBeInTheDocument(); // the number cards are still there
  });
  it('a broken statistics call leaves the rest of the dashboard working', async () => {
    admin.getDashboard.mockResolvedValue({ totalSpots: 4, publishedSpots: 3, pendingReviews: 0, users: 7, itineraries: 2, mostViewed: [], mostFavorited: [], recentActivity: [] });
    admin.getStatistics.mockRejectedValue(new Error('boom'));
    wrap();
    expect(await screen.findByText('Could not load the statistics.')).toBeInTheDocument();
    expect(screen.getByText('Total spots')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 spots live')).toBeInTheDocument();
  });
  it('error shows Retry', async () => {
    admin.getDashboard.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ totalSpots: 1 });
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Total spots')).toBeInTheDocument();
  });
});
