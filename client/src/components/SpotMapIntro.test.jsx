import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DIVE_LEAD_MS, WAVE_TOTAL_MS } from '../utils/mapIntro';

const h = vi.hoisted(() => {
  const box = document.createElement('div');
  const map = {
    invalidateSize: () => {}, setView: () => {}, fitBounds: () => {}, getBoundsZoom: () => 10, stop: () => {}, off: () => {},
    getContainer: () => box,
  };
  return { box, map };
});
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ icon, children }) => <div data-testid="marker" data-icon={icon?.beacon ? 'beacon' : 'plain'}>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  useMap: () => h.map,
}));
vi.mock('../utils/leafletIcons', () => ({ defaultIcon: {}, activeIcon: {}, foodIcon: {}, liveActiveIcon: { live: true }, beaconIcon: () => ({ beacon: true }) }));

import SpotMap from './SpotMap';

const spots = [
  { _id: '1', slug: 'a', name: 'A', location: { coordinates: [125.07, 9.91] } },
  { _id: '2', slug: 'b', name: 'B', location: { coordinates: [125.0, 10.5] } },
];
const wrap = () => render(<MemoryRouter><SpotMap spots={spots} intro /></MemoryRouter>);
const calm = (matches) => { window.matchMedia = () => ({ matches }); };

describe('SpotMap opening sequence', () => {
  beforeEach(() => { vi.useFakeTimers(); h.map.flyToBounds = vi.fn(); h.map.once = vi.fn(); h.map.fitBounds = vi.fn(); });
  afterEach(() => { vi.useRealTimers(); delete window.matchMedia; });

  it('shows the pins at once with reduced motion', () => {
    calm(true);
    wrap();
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(h.map.flyToBounds).not.toHaveBeenCalled();
  });

  it('keeps the pins dark during the dive, lights them as the map lands, then settles to plain pins', () => {
    calm(false);
    wrap();
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(DIVE_LEAD_MS + 5); });
    expect(h.map.flyToBounds).toHaveBeenCalled();
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
    act(() => { h.map.once.mock.calls[0][1](); }); // the map reports that it arrived
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'beacon');
    act(() => { vi.advanceTimersByTime(WAVE_TOTAL_MS + 5); });
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
  });

  it('a touch on the map skips straight to the finished map', () => {
    calm(false);
    wrap();
    act(() => { fireEvent.pointerDown(h.box); });
    expect(h.map.fitBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ animate: false }));
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
  });
});
