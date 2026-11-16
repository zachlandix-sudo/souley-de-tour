import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FoodCard from './FoodCard';
import FoodQuickView from './FoodQuickView';

const spot = { _id: 'f1', slug: 'sa-natad', name: 'Sa Natad Seafoods', municipality: 'Maasin City', address: 'Kangleon St', entryType: 'restaurant', averageRating: 4.5, reviewCount: 12, shortDescription: 'Named restaurant/eatery listing; confirm current operation.' };
const fav = (over = {}) => ({ user: { _id: 'u' }, saved: () => false, toggle: vi.fn(), failedId: null, ...over });
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('FoodCard', () => {
  it('opens the quick view from the main button and shows the type badge', async () => {
    const onOpen = vi.fn();
    wrap(<FoodCard spot={spot} fav={fav()} onOpen={onOpen} />);
    expect(screen.getByText('Restaurant')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quick view: Sa Natad Seafoods' }));
    expect(onOpen).toHaveBeenCalledWith(spot);
  });
  it('keeps Directions and Save as their own controls, and never shows the admin note', () => {
    wrap(<FoodCard spot={spot} feature fav={fav()} onOpen={() => {}} />);
    expect(screen.getByRole('link', { name: /Directions to Sa Natad Seafoods/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('button', { name: 'Save Sa Natad Seafoods to favorites' })).toBeInTheDocument();
    expect(screen.queryByText(/confirm current operation/)).toBeNull();
    expect(screen.getByText("Chef's pick")).toBeInTheDocument();
  });
  it('sends signed-out visitors to the login page from the heart', () => {
    wrap(<FoodCard spot={spot} fav={fav({ user: null })} onOpen={() => {}} />);
    expect(screen.getByRole('link', { name: 'Sign in to save Sa Natad Seafoods' })).toHaveAttribute('href', '/login');
  });
  it('toggles a save', async () => {
    const f = fav();
    wrap(<FoodCard spot={spot} fav={f} onOpen={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /Save Sa Natad Seafoods/ }));
    expect(f.toggle).toHaveBeenCalledWith('f1');
  });
});

describe('FoodQuickView', () => {
  const base = { spot, position: 2, total: 24, onClose: () => {}, fav: fav() };
  it('is a dialog named after the place, with the details and a full-page link', () => {
    wrap(<FoodQuickView {...base} />);
    expect(screen.getByRole('dialog', { name: 'Sa Natad Seafoods, quick view' })).toBeInTheDocument();
    expect(screen.getByText('2 of 24')).toBeInTheDocument();
    expect(screen.getByText('Kangleon St')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open full page/ })).toHaveAttribute('href', '/spots/sa-natad');
  });
  it('closes on Escape and on the close button, steps with the arrow keys, and puts focus inside', async () => {
    const onClose = vi.fn(), onStep = vi.fn();
    wrap(<FoodQuickView {...base} onClose={onClose} onStep={onStep} />);
    expect(screen.getByRole('button', { name: 'Close quick view' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
    expect(onStep).toHaveBeenNthCalledWith(1, 1);
    expect(onStep).toHaveBeenNthCalledWith(2, -1);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close quick view' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it('keeps Tab inside the panel', async () => {
    wrap(<><button type="button">outside</button><FoodQuickView {...base} onStep={() => {}} /></>);
    for (let i = 0; i < 12; i += 1) {
      await userEvent.tab(); // eslint-disable-line no-await-in-loop
      expect(document.activeElement.closest('[role=dialog]')).not.toBeNull();
    }
  });
  it('lists other places in the same town and opens one when picked', async () => {
    const onPick = vi.fn();
    const other = { _id: 'f2', slug: 'bay-cafe', name: 'Bay Cafe', municipality: 'Maasin City', entryType: 'cafe' };
    wrap(<FoodQuickView {...base} onPick={onPick} related={[other]} />);
    await userEvent.click(screen.getByRole('button', { name: /Bay Cafe/ }));
    expect(onPick).toHaveBeenCalledWith(other);
  });
  it('locks page scrolling while open and unlocks it after', () => {
    const { unmount } = wrap(<FoodQuickView {...base} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
