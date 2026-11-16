import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nContext';
import TownsExplorer from './TownsExplorer';

vi.mock('../../services/spotService', () => ({ listSpots: vi.fn(() => new Promise(() => {})) })); // never answers, unless a test says so
import { listSpots } from '../../services/spotService';

const Arrow = () => <svg aria-hidden="true" />;
const spotsIn = (t) => `/spots?municipality=${encodeURIComponent(t)}`;
const view = () => render(<I18nProvider><MemoryRouter><TownsExplorer spotsIn={spotsIn} Arrow={Arrow} /></MemoryRouter></I18nProvider>);

// jsdom has no IntersectionObserver or WebGL, so the section shows its list-only form: the map is an enhancement on top.
describe('TownsExplorer (list form, no WebGL)', () => {
  it('has a chip for each of the 19 Southern Leyte towns and the 7 neighbouring Leyte towns', () => {
    view();
    expect(within(screen.getByRole('list', { name: 'Towns of Southern Leyte' })).getAllByRole('button')).toHaveLength(19);
    expect(within(screen.getByRole('list', { name: 'Neighbouring towns' })).getAllByRole('button')).toHaveLength(7);
  });

  it('opens a box with live details and a See spots button for a Southern Leyte town', async () => {
    listSpots.mockResolvedValueOnce({ data: [{ name: 'Seven Falls' }, { name: 'Cambaro Cave' }], pagination: { total: 8 } });
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Macrohon' }));
    const box = screen.getByRole('complementary', { name: 'Macrohon' });
    expect(within(box).getByText('Caves, falls and reef resorts')).toBeInTheDocument();
    expect(within(box).getByRole('link', { name: /See spots/ })).toHaveAttribute('href', '/spots?municipality=Macrohon');
    expect(await within(box).findByText('Spots listed: 8')).toBeInTheDocument();
    expect(within(box).getByText('Seven Falls · Cambaro Cave')).toBeInTheDocument();
  });

  it('a neighbouring Leyte town gets a plain note and no button', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Abuyog' }));
    const box = screen.getByRole('complementary', { name: 'Abuyog' });
    expect(within(box).getByText(/outside Southern Leyte/)).toBeInTheDocument();
    expect(within(box).queryByRole('link')).toBeNull();
  });

  it('picking the same town again, or the close button, closes the box', () => {
    view();
    const chip = screen.getByRole('button', { name: 'Sogod' });
    fireEvent.click(chip);
    expect(screen.getByRole('complementary', { name: 'Sogod' })).toBeInTheDocument();
    fireEvent.click(chip);
    expect(screen.queryByRole('complementary')).toBeNull();
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('works for a town with no spots listed yet (San Ricardo)', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'San Ricardo' }));
    expect(screen.getByRole('link', { name: /See spots/ })).toHaveAttribute('href', '/spots?municipality=San%20Ricardo');
  });
});
