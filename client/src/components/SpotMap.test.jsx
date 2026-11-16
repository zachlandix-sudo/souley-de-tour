import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  useMap: () => ({ invalidateSize: vi.fn(), setView: vi.fn(), fitBounds: vi.fn() }),
}));
vi.mock('../utils/leafletIcons', () => ({ defaultIcon: {}, activeIcon: {}, foodIcon: {}, liveActiveIcon: { live: true }, beaconIcon: () => ({}) }));

import SpotMap from './SpotMap';

const wrap = (spots) => render(<MemoryRouter><SpotMap spots={spots} /></MemoryRouter>);

describe('SpotMap', () => {
  it('renders only spots with valid coordinates and logs no error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    wrap([
      { _id: '1', slug: 'a', name: 'A', location: { coordinates: [125.07, 9.91] } },
      { _id: '2', slug: 'b', name: 'B' },
      { _id: '3', slug: 'c', name: 'C', location: { coordinates: [NaN, 1] } },
    ]);
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
  it('shows a notice when there are no pins', () => {
    wrap([{ _id: '2', slug: 'b', name: 'B' }]);
    expect(screen.getByText('No map locations for these results')).toBeInTheDocument();
  });
});
