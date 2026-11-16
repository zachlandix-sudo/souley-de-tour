import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nContext';
import PassportCover from './PassportCover';

const HOLDER = { name: 'Maria Santos', number: 'SDT-F0ABC1', since: '2026-09-20T00:00:00.000Z', homeTown: 'Cebu City', color: 'black' };
const view = (props) => render(<I18nProvider><MemoryRouter><PassportCover count={3} total={58} rankLabel="Newcomer" {...props} /></MemoryRouter></I18nProvider>);
const toggle = () => screen.getByRole('button', { name: /passport$/i });

describe('PassportCover', () => {
  it('starts closed and opens or closes with the button', async () => {
    view({ holder: HOLDER, onSaveProfile: vi.fn() });
    expect(toggle()).toHaveAccessibleName('Open passport');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle());
    expect(toggle()).toHaveAccessibleName('Close passport');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape closes it', async () => {
    view({ holder: HOLDER, onSaveProfile: vi.fn() });
    await userEvent.click(toggle());
    await userEvent.keyboard('{Escape}');
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveFocus();
  });

  it('shows the holder page: name, rank, number, issue date and home town', () => {
    view({ holder: HOLDER, onSaveProfile: vi.fn() });
    const page = screen.getByRole('group', { name: 'Passport holder' });
    expect(page).toHaveTextContent('Maria Santos');
    expect(page).toHaveTextContent('Newcomer · 3/58');
    expect(page).toHaveTextContent('SDT-F0ABC1');
    expect(page).toHaveTextContent(new Date(HOLDER.since).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }));
    expect(screen.getByLabelText('Home town')).toHaveValue('Cebu City');
  });

  it('a guest sees an invitation to sign in instead of the editable fields', () => {
    view({ holder: null });
    expect(screen.getByText('Guest traveller')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Home town')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('saves a changed home town (trimmed) and shows that it was saved', async () => {
    const save = vi.fn().mockResolvedValue({});
    view({ holder: HOLDER, onSaveProfile: save });
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull(); // nothing to save yet
    const input = screen.getByLabelText('Home town');
    await userEvent.clear(input);
    await userEvent.type(input, '  Maasin City ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(save).toHaveBeenCalledWith({ homeTown: 'Maasin City' });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('choosing a cover colour saves it right away and the book takes the colour', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { container } = view({ holder: HOLDER, onSaveProfile: save });
    await userEvent.click(screen.getByRole('radio', { name: 'Navy' }));
    expect(save).toHaveBeenCalledWith({ color: 'navy' });
    expect(container.querySelector('.pp-book')).toHaveAttribute('data-cover', 'navy');
    expect(screen.getByRole('radio', { name: 'Navy' })).toBeChecked();
  });

  it('puts the colour back and says so when the colour cannot be saved', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const { container } = view({ holder: HOLDER, onSaveProfile: save });
    await userEvent.click(screen.getByRole('radio', { name: 'Green' }));
    expect(await screen.findByText('Couldn’t save. Try again.')).toBeInTheDocument();
    expect(container.querySelector('.pp-book')).toHaveAttribute('data-cover', 'black');
    expect(screen.getByRole('radio', { name: 'Black' })).toBeChecked();
  });

  it('writes the holder name on the closed cover', () => {
    const { container } = view({ holder: HOLDER, onSaveProfile: vi.fn() });
    expect(container.querySelector('.pp-cover-holder')).toHaveTextContent('Maria Santos');
    const guest = view({ holder: null });
    expect(guest.container.querySelector('.pp-cover-holder')).toBeNull();
  });
});
