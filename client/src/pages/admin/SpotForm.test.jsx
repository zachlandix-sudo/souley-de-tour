import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SpotForm from './SpotForm';
import * as admin from '../../services/adminService';
import { listSpots } from '../../services/spotService';
import { listCategories } from '../../services/categoryService';

vi.mock('../../services/adminService');
vi.mock('../../services/spotService', () => ({ listSpots: vi.fn() }));
vi.mock('../../services/categoryService', () => ({ listCategories: vi.fn() }));

const saved = {
  _id: 's1', name: 'Tinago Falls', shortDescription: 'Short', description: 'Long', municipality: 'Sogod', images: ['/spots/tinago.jpg'],
  openDays: ['Mon', 'Tue', 'Wed'], bestMonths: [11, 12, 1],
};
const edit = () => render(
  <MemoryRouter initialEntries={['/admin/spots/s1/edit']}>
    <Routes><Route path="/admin/spots/:id/edit" element={<SpotForm />} /><Route path="/admin/spots" element={<p>spots list</p>} /></Routes>
  </MemoryRouter>,
);
const day = (n) => screen.getByRole('checkbox', { name: n });

beforeEach(() => {
  vi.clearAllMocks();
  listSpots.mockResolvedValue({ data: [] });
  listCategories.mockResolvedValue([]);
  admin.getSpotForEdit.mockResolvedValue(saved);
  admin.updateSpot.mockResolvedValue({});
  admin.createSpot.mockResolvedValue({});
});

describe('SpotForm: open days and best months', () => {
  it('shows the saved days and months as ticked', async () => {
    edit();
    expect(await screen.findByRole('group', { name: 'Open days' })).toBeInTheDocument();
    expect(day('Monday')).toBeChecked();
    expect(day('Wednesday')).toBeChecked();
    expect(day('Thursday')).not.toBeChecked();
    expect(day('November')).toBeChecked();
    expect(day('January')).toBeChecked();
    expect(day('June')).not.toBeChecked();
  });

  it('ticking and unticking changes what is saved, and the lists stay in calendar order', async () => {
    edit();
    await screen.findByRole('group', { name: 'Open days' });
    await userEvent.click(day('Saturday'));
    await userEvent.click(day('Monday')); // untick
    await userEvent.click(day('February'));
    await userEvent.click(screen.getByRole('button', { name: /Save spot/ }));
    expect(admin.updateSpot).toHaveBeenCalledTimes(1);
    const [id, body] = admin.updateSpot.mock.calls[0];
    expect(id).toBe('s1');
    expect(body.openDays).toEqual(['Tue', 'Wed', 'Sat']);
    expect(body.bestMonths).toEqual([1, 2, 11, 12]);
  });

  it('the shortcuts set or clear the whole list, and clearing is saved as an empty list', async () => {
    edit();
    const days = await screen.findByRole('group', { name: 'Open days' });
    await userEvent.click(within(days).getByRole('button', { name: 'Mon–Sat' }));
    expect(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].every((d) => day(d).checked)).toBe(true);
    expect(day('Sunday')).not.toBeChecked();
    await userEvent.click(within(days).getByRole('button', { name: 'Every day' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Best months' })).getByRole('button', { name: 'All year' }));
    await userEvent.click(screen.getByRole('button', { name: /Save spot/ }));
    const body = admin.updateSpot.mock.calls[0][1];
    expect(body.openDays).toEqual([]);
    expect(body.bestMonths).toEqual([]);
  });

  it('a new spot starts with nothing ticked', async () => {
    render(<MemoryRouter initialEntries={['/admin/spots/new']}><Routes><Route path="/admin/spots/new" element={<SpotForm />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('group', { name: 'Open days' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').filter((c) => /day$|^(January|February|March|April|May|June|July|August|September|October|November|December)$/.test(c.getAttribute('aria-label') || '')).some((c) => c.checked)).toBe(false);
  });
});
