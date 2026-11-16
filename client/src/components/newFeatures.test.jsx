import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SpotCard from './SpotCard';
import NearMeButton from './NearMeButton';
import ReviewForm from './ReviewForm';
import OfflineBanner from './OfflineBanner';

vi.mock('../services/spotService', () => ({ createReview: vi.fn(() => Promise.resolve({ review: { _id: '1', status: 'pending' }, message: 'Review submitted for approval.' })) }));
import { createReview } from '../services/spotService';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('new features', () => {
  it('SpotCard shows distance when present', () => {
    wrap(<SpotCard spot={{ _id: '1', slug: 'a', name: 'A', municipality: 'Maasin City', distanceKm: 2.34 }} />);
    expect(screen.getByText(/2\.3 km away/)).toBeInTheDocument();
  });

  it('NearMeButton toggles', async () => {
    const enable = vi.fn();
    render(<NearMeButton nearMe={{ status: 'idle', active: false, enable, disable: vi.fn() }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Near me' }));
    expect(enable).toHaveBeenCalled();
  });

  it('ReviewForm asks guests to sign in', () => {
    wrap(<ReviewForm spotId="s1" user={null} />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('ReviewForm validates rating then submits', async () => {
    const onCreated = vi.fn();
    wrap(<ReviewForm spotId="s1" user={{ _id: 'u' }} onCreated={onCreated} />);
    await userEvent.click(screen.getByRole('button', { name: /submit review/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/star rating/i);
    await userEvent.click(screen.getByRole('radio', { name: '4 stars' }));
    await userEvent.type(screen.getByLabelText('Review comment'), 'Lovely place');
    await userEvent.click(screen.getByRole('button', { name: /submit review/i }));
    expect(createReview).toHaveBeenCalledWith('s1', expect.objectContaining({ rating: 4, comment: 'Lovely place', photos: [] }));
    expect(await screen.findByRole('status')).toHaveTextContent(/approval/i);
    expect(onCreated).toHaveBeenCalled();
  });

  it('OfflineBanner shows only when offline', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i);
    spy.mockRestore();
  });
});
