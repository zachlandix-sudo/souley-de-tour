import { vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FLY_FIRST_S, FLY_NEXT_S, WAVE_TOTAL_MS } from '../utils/mapIntro';

const h = vi.hoisted(() => {
  const box = document.createElement('div');
  const map = { invalidateSize: () => {}, setView: () => {}, fitBounds: () => {}, stop: () => {}, getContainer: () => box };
  return { box, map };
});
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ icon, children, eventHandlers }) => (
    <div data-testid="marker" data-icon={icon?.beacon ? 'beacon' : icon?.live ? 'live' : 'plain'} onMouseEnter={eventHandlers?.mouseover} onMouseLeave={eventHandlers?.mouseout}>{children}</div>
  ),
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  useMap: () => h.map,
}));
vi.mock('../utils/leafletIcons', () => ({ defaultIcon: {}, activeIcon: {}, foodIcon: {}, liveActiveIcon: { live: true }, beaconIcon: () => ({ beacon: true }) }));

import SpotMap from './SpotMap';

const spots = [
  { _id: '1', slug: 'a', name: 'Alpha', location: { coordinates: [125.07, 9.91] } },
  { _id: '2', slug: 'b', name: 'Beta', location: { coordinates: [125.0, 10.5] } },
];
const other = [{ _id: '3', slug: 'c', name: 'Gamma', location: { coordinates: [125.1, 10.1] } }, { _id: '4', slug: 'd', name: 'Delta', location: { coordinates: [125.2, 10.3] } }];
const ui = (list, props = {}) => <MemoryRouter><SpotMap spots={list} live {...props} /></MemoryRouter>;
const calm = (matches) => { window.matchMedia = () => ({ matches }); };
const stage = (c) => c.querySelector('.map-stage');

describe('SpotMap "First light" (live)', () => {
  beforeEach(() => { vi.useFakeTimers(); h.map.flyToBounds = vi.fn(); h.map.flyTo = vi.fn(); h.map.fitBounds = vi.fn(); });
  afterEach(() => { vi.useRealTimers(); delete window.matchMedia; });

  it('is a still, plain map with reduced motion', () => {
    calm(true);
    const { container } = render(ui(spots));
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
    expect(stage(container)).not.toHaveClass('map-live');
    expect(container.querySelector('.map-clouds')).toBeNull();
    expect(container.querySelector('.map-dawn')).toBeNull();
    expect(h.map.flyToBounds).not.toHaveBeenCalled();
  });

  it('does nothing extra without `live`', () => {
    calm(false);
    const { container } = render(<MemoryRouter><SpotMap spots={spots} /></MemoryRouter>);
    expect(stage(container)).not.toHaveClass('map-live');
    expect(container.querySelector('.map-clouds')).toBeNull();
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
  });

  it('arrival: the camera glides, the light band rises, the pins drop in, then it settles', () => {
    calm(false);
    const { container } = render(ui(spots));
    expect(stage(container)).toHaveClass('map-live');
    expect(stage(container)).toHaveAttribute('data-arrive', 'on');
    expect(container.querySelector('.map-clouds')).not.toBeNull();
    expect(container.querySelector('.map-dawn')).not.toBeNull();
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'beacon');
    expect(h.map.flyToBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: FLY_FIRST_S }));

    act(() => { vi.advanceTimersByTime(WAVE_TOTAL_MS + 5); });
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
    expect(container.querySelector('.map-dawn')).toBeNull();
    expect(stage(container)).not.toHaveAttribute('data-arrive');
    expect(container.querySelector('.map-clouds')).not.toBeNull(); // the drift never stops
  });

  it('a touch on the map ends the arrival at once', () => {
    calm(false);
    const { container } = render(ui(spots));
    act(() => { fireEvent.pointerDown(h.box); });
    expect(container.querySelector('.map-dawn')).toBeNull();
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
  });

  it('new results: the camera glides again and the new pins drop in as a wave (no light band)', () => {
    calm(false);
    const { container, rerender } = render(ui(spots));
    act(() => { vi.advanceTimersByTime(WAVE_TOTAL_MS + 5); });
    h.map.flyToBounds.mockClear();
    rerender(ui(other));
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'beacon');
    expect(container.querySelector('.map-dawn')).toBeNull();
    expect(h.map.flyToBounds).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: FLY_NEXT_S }));
    act(() => { vi.advanceTimersByTime(WAVE_TOTAL_MS + 5); });
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'plain');
  });

  it('spotlight: the active pin lifts and shows its name, the others dim', () => {
    calm(false);
    const { container } = render(ui(spots, { activeId: '1' }));
    act(() => { vi.advanceTimersByTime(WAVE_TOTAL_MS + 5); });
    expect(screen.getAllByTestId('marker')[0]).toHaveAttribute('data-icon', 'live');
    expect(screen.getAllByTestId('marker')[1]).toHaveAttribute('data-icon', 'plain');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('Alpha');
    expect(stage(container)).toHaveAttribute('data-focus', 'on');
  });

  it('no spotlight when nothing is active', () => {
    calm(false);
    const { container } = render(ui(spots));
    expect(screen.queryByTestId('tooltip')).toBeNull();
    expect(stage(container)).not.toHaveAttribute('data-focus');
  });

  it('reports which pin is hovered', () => {
    calm(false);
    const onPinHover = vi.fn();
    render(ui(spots, { onPinHover }));
    fireEvent.mouseEnter(screen.getAllByTestId('marker')[1]);
    expect(onPinHover).toHaveBeenLastCalledWith('2');
    fireEvent.mouseLeave(screen.getAllByTestId('marker')[1]);
    expect(onPinHover).toHaveBeenLastCalledWith(null);
  });
});
