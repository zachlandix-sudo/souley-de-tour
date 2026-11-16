import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SpotRow from './SpotRow';

const spot = { _id: 's1', slug: 'tinago', name: 'Tinago Falls', municipality: 'Maasin City', shortDescription: 'Cool pool.' };

describe('SpotRow', () => {
  it('has one link named after the spot (the photo link is hidden from keyboard and screen readers)', () => {
    render(<MemoryRouter><SpotRow spot={spot} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Tinago Falls' })).toHaveAttribute('href', '/spots/tinago');
    expect(screen.getByText('Maasin City')).toBeInTheDocument();
  });
  it('caps the stagger so a long page does not wait', () => {
    render(<MemoryRouter><SpotRow spot={spot} index={40} /></MemoryRouter>);
    expect(screen.getByRole('article').style.getPropertyValue('--n')).toBe('8');
  });
  it('shows a coordinates card below the spot and selects it on click', async () => {
    const onSelect = vi.fn();
    const withCoord = { ...spot, location: { coordinates: [125.07, 9.91] } };
    render(<MemoryRouter><SpotRow spot={withCoord} onSelect={onSelect} /></MemoryRouter>);
    expect(screen.getByText('Lat 9.91000° N')).toBeInTheDocument();
    expect(screen.getByText('Lng 125.07000° E')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Show Tinago Falls on the map/ }));
    expect(onSelect).toHaveBeenCalledWith('s1');
  });
  it('says so when a spot has no coordinates yet', () => {
    render(<MemoryRouter><SpotRow spot={spot} /></MemoryRouter>);
    expect(screen.getByText('No coordinates yet')).toBeInTheDocument();
  });
});
