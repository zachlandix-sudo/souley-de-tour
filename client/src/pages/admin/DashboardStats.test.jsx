import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardStats from './DashboardStats';
import * as admin from '../../services/adminService';

vi.mock('../../services/adminService');

const days = ['Nov 10', 'Nov 11', 'Nov 12'];
const stats = (over = {}) => ({
  range: '30d',
  totals: { spots: 4, views: 1200, favorites: 45, reviews: 6, users: 9, trips: 3, aiChats: 17, averageRating: 4.5 },
  timeline: { unit: 'day', keys: ['2026-11-10', '2026-11-11', '2026-11-12'], labels: days, series: { users: [1, 0, 4], reviews: [0, 2, 1], trips: [0, 0, 3], aiChats: [5, 1, 2], spots: [0, 0, 80] } },
  pies: {
    spotStatus: [{ key: 'published', label: 'Published', value: 3 }, { key: 'draft', label: 'Draft', value: 1 }, { key: 'archived', label: 'Archived', value: 0 }],
    spotCategory: [{ key: 'c1', label: 'Waterfalls', value: 2 }, { key: 'c2', label: 'Beaches', value: 1 }],
    spotDifficulty: [{ key: 'easy', label: 'Easy', value: 4 }],
    reviewStatus: [{ key: 'approved', label: 'Approved', value: 5 }, { key: 'pending', label: 'Pending', value: 1 }],
    userRole: [{ key: 'visitor', label: 'Visitors', value: 8 }, { key: 'admin', label: 'Admins', value: 1 }],
    tripOrigin: [{ key: 'ai', label: 'Planned by Ask SOULEY', value: 0 }, { key: 'hand', label: 'Built by hand', value: 0 }],
  },
  bars: {
    towns: { items: [{ key: 'Maasin City', label: 'Maasin City', value: 3 }, { key: 'Sogod', label: 'Sogod', value: 1 }], total: 12 },
    categoryViews: [{ key: 'c1', label: 'Waterfalls', value: 900 }],
    ratings: [1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: `${n}★`, value: n === 5 ? 3 : 0 })),
  },
  ...over,
});
const wrap = () => render(<DashboardStats />);
const lines = (c) => c.querySelectorAll('.adm-lc-line').length;

beforeEach(() => { admin.getStatistics.mockReset(); admin.getStatistics.mockResolvedValue(stats()); });

describe('DashboardStats', () => {
  it('shows a line graph, a bar graph and a pie graph', async () => {
    const { container } = wrap();
    expect(await screen.findByRole('heading', { level: 2, name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activity over time' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Top places and scores' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Breakdowns' })).toBeInTheDocument();
    expect(lines(container)).toBe(4);
    expect(container.querySelector('ul.adm-hb')).not.toBeNull();
    expect(container.querySelector('.adm-donut')).not.toBeNull();
    expect(admin.getStatistics).toHaveBeenCalledWith('30d');
  });

  it('each line button carries that line\'s total for the period; all-time numbers sit underneath', async () => {
    wrap();
    expect(await screen.findByRole('button', { name: /New sign-ups\s*5/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New reviews\s*3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask SOULEY chats\s*8/ })).toBeInTheDocument();
    expect(screen.getByText('Spot views, all time').nextSibling).toHaveTextContent('1,200');
    expect(screen.getByText('Average rating').nextSibling).toHaveTextContent('4.5');
  });

  it('lines can be switched on and off, but the last one stays', async () => {
    const { container } = wrap();
    const spots = await screen.findByRole('button', { name: /Spots added/ });
    expect(spots).toHaveAttribute('aria-pressed', 'false'); // an import day would flatten everything else
    await userEvent.click(spots);
    expect(spots).toHaveAttribute('aria-pressed', 'true');
    expect(lines(container)).toBe(5);
    for (const name of [/New sign-ups/, /New reviews/, /Trips planned/, /Ask SOULEY chats/, /Spots added/]) await userEvent.click(screen.getByRole('button', { name }));
    expect(lines(container)).toBe(1);
    expect(screen.getByRole('button', { name: /Spots added/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the range buttons ask the server for that range', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: '90 days' }));
    expect(admin.getStatistics).toHaveBeenLastCalledWith('90d');
    await userEvent.click(screen.getByRole('button', { name: '12 months' }));
    expect(admin.getStatistics).toHaveBeenLastCalledWith('12m');
    expect(await screen.findByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('bar graph tabs: towns, views by category, star ratings', async () => {
    const { container } = wrap();
    expect(await screen.findByText('Maasin City')).toBeInTheDocument();
    expect(screen.getByText(/the top 2 of 12 towns/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Views by category' }));
    const bars = within(screen.getByRole('heading', { name: 'Top places and scores' }).closest('section'));
    expect(bars.getByText('Waterfalls')).toBeInTheDocument();
    expect(bars.queryByText('Maasin City')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Star ratings' }));
    expect(container.querySelector('ul.adm-vb')).not.toBeNull();
    expect(screen.getByText(/The average is 4.5 out of 5/)).toBeInTheDocument();
  });

  it('pie graph tabs change the breakdown and its title', async () => {
    const { container } = wrap();
    expect(await screen.findByText('Spots by status.')).toBeInTheDocument();
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('4');
    await userEvent.click(screen.getByRole('button', { name: 'Roles' }));
    expect(screen.getByText('Accounts by role.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Admins.*1/ })).toBeInTheDocument();
    expect(container.querySelector('.adm-donut-num')).toHaveTextContent('9');
    await userEvent.click(screen.getByRole('button', { name: 'Categories' }));
    expect(screen.getByText(/counts once for every category/)).toBeInTheDocument();
  });

  it('a breakdown with nothing in it says so instead of drawing an empty ring', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Trips' }));
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
  });

  it('a failed load shows a retry note and the retry works', async () => {
    admin.getStatistics.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(stats());
    wrap();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the statistics.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Activity over time' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a missing answer (nothing back from the service) does not crash the dashboard', async () => {
    admin.getStatistics.mockResolvedValue(undefined);
    wrap();
    expect(await screen.findByRole('heading', { level: 2, name: 'Statistics' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Activity over time' })).toBeNull();
  });
});
