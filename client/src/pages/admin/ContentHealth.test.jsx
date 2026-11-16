import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ContentHealth from './ContentHealth';
import * as admin from '../../services/adminService';

vi.mock('../../services/adminService');
const wrap = () => render(<MemoryRouter><ContentHealth /></MemoryRouter>);
const spot = (n, status = 'published') => ({ _id: `id${n}`, name: `Spot ${n}`, slug: `s${n}`, municipality: 'Sogod', status });
const check = (key, label, severity, count, items = []) => ({ key, label, severity, hint: `${label} hint`, count, items });
const health = (over = {}) => ({
  totals: { all: 10, published: 8, draft: 2, archived: 0 }, scored: 8, score: 72,
  checks: [check('noPin', 'No map pin', 'high', 0), check('thinText', 'Description is missing or still a placeholder', 'high', 12, [spot(1), spot(2)]), check('onePhoto', 'Fewer than two photos', 'low', 3, [spot(3)])],
  opportunities: { readyDrafts: { count: 2, items: [spot(7, 'draft'), spot(8, 'draft')] }, staleDrafts: { count: 0, items: [], days: 30 } },
  ...over,
});
beforeEach(() => { vi.resetAllMocks(); admin.getHealth.mockResolvedValue(health()); });
afterEach(() => vi.restoreAllMocks());

describe('ContentHealth', () => {
  it('shows the score and the first thing to fix', async () => {
    wrap();
    expect(await screen.findByText('8 published spots checked')).toBeInTheDocument();
    expect(screen.getByText(/Start with/)).toHaveTextContent('description is missing or still a placeholder: 12 spots');
  });
  it('lists problems first, with a Fix link to each spot, and the clear checks last', async () => {
    wrap();
    expect(await screen.findByRole('link', { name: 'Fix Spot 1' })).toHaveAttribute('href', '/admin/spots/id1/edit');
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Description is missing or still a placeholder', 'Fewer than two photos']);
    expect(screen.getByText('No map pin').closest('li')).toHaveTextContent('All good');
  });
  it('"Show all" loads the long list for that check only', async () => {
    admin.getHealth.mockResolvedValueOnce(health()).mockResolvedValueOnce({ checks: [check('thinText', 'x', 'high', 12, [1, 2, 3, 4, 5].map(spot))] });
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Show all 12' }));
    expect(admin.getHealth).toHaveBeenLastCalledWith({ check: 'thinText', limit: 500 });
    expect(await screen.findByRole('link', { name: 'Fix Spot 5' })).toBeInTheDocument();
  });
  it('publishes the ready drafts after a confirm, then checks again', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    admin.bulkSpots.mockResolvedValue({ action: 'publish', requested: 2, matched: 2 });
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Publish 2' }));
    expect(admin.bulkSpots).toHaveBeenCalledWith(['id7', 'id8'], 'publish');
    expect(await screen.findByText('Published 2 spots.')).toBeInTheDocument();
    expect(admin.getHealth).toHaveBeenCalledTimes(2);
  });
  it('does nothing when the confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Publish 2' }));
    expect(admin.bulkSpots).not.toHaveBeenCalled();
  });
  it('without published spots there is no score, and nothing to fix says so', async () => {
    admin.getHealth.mockResolvedValue(health({ score: null, scored: 0, checks: [check('noPin', 'No map pin', 'high', 0)], opportunities: { readyDrafts: { count: 0, items: [] }, staleDrafts: { count: 0, items: [], days: 30 } } }));
    wrap();
    expect(await screen.findByText('Publish a spot to get a score')).toBeInTheDocument();
    expect(screen.getByText(/Nothing to fix/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Ready to publish/ })).toBeNull();
  });
  it('shows a retry when the check cannot load', async () => {
    admin.getHealth.mockRejectedValue(new Error('boom'));
    wrap();
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server.");
    await userEvent.click(within(screen.getByRole('alert')).getByRole('button'));
    expect(admin.getHealth).toHaveBeenCalledTimes(2);
  });
});
