import { useEffect } from 'react';
import { vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { estimateTravel, formatDuration } from '../utils/travel';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children, eventHandlers }) => <div data-testid="marker" onClick={eventHandlers?.click}>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <div>{children}</div>,
  useMap: () => ({ invalidateSize: () => {}, setView: () => {}, fitBounds: () => {} }),
}));
vi.mock('../utils/leafletIcons', () => ({ defaultIcon: {}, activeIcon: {}, foodIcon: {}, liveActiveIcon: {}, beaconIcon: () => ({}) }));
// The Leaflet drawing itself is not run here; the stand-in only reports what it was asked to draw and says when the line has landed.
vi.mock('./TravelLayer', () => ({
  default: function TravelLayerStub({ origin, dest, routeKey, modeId, onPhase }) {
    useEffect(() => { if (dest) onPhase?.(routeKey, 'done'); }, [dest, routeKey]); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-testid="travel-layer" data-origin={origin.join(',')} data-dest={dest ? dest.join(',') : ''} data-mode={modeId} />;
  },
}));

import SpotMap from './SpotMap';

const HERE = [10.2, 124.9];
const alpha = { _id: '1', slug: 'a', name: 'Alpha', location: { coordinates: [125.07, 9.91] } };
const beta = { _id: '2', slug: 'b', name: 'Beta', location: { coordinates: [125.0, 10.5] } };
const ui = (props = {}) => <MemoryRouter><SpotMap spots={[alpha, beta]} travel {...props} /></MemoryRouter>;
const locate = (result) => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (ok, fail) => (result.error ? fail(result.error) : ok({ coords: { latitude: HERE[0], longitude: HERE[1] } })) } });
const layer = () => screen.queryByTestId('travel-layer');
const eta = (spot, mode) => formatDuration(estimateTravel(HERE, [spot.location.coordinates[1], spot.location.coordinates[0]], mode).minutes);

describe('SpotMap travel time', () => {
  beforeEach(() => { window.matchMedia = () => ({ matches: true }); }); // reduced motion: no counting, the final numbers are there at once
  afterEach(() => { delete window.matchMedia; delete navigator.geolocation; });

  it('adds nothing without the travel prop', () => {
    render(ui({ travel: false }));
    expect(screen.queryByRole('button', { name: 'Travel time from me' })).toBeNull();
    expect(layer()).toBeNull();
  });

  it('asks for the visitor\'s location first, then invites them to tap a pin', () => {
    locate({});
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    expect(screen.getByText('Tap a pin to see the travel time from you.')).toBeInTheDocument();
    expect(layer()).toHaveAttribute('data-origin', HERE.join(','));
    expect(layer()).toHaveAttribute('data-dest', ''); // you are on the map, but no route until a pin is picked
  });

  it('says why when the browser blocks the location', () => {
    locate({ error: { code: 1 } });
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Location is blocked');
    expect(layer()).toBeNull();
  });

  it('picking a pin draws the route to it and shows the estimated time (car by default)', () => {
    locate({});
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    fireEvent.click(screen.getAllByTestId('marker')[1]);
    expect(layer()).toHaveAttribute('data-dest', '10.5,125');
    expect(layer()).toHaveAttribute('data-mode', 'car');
    expect(screen.getAllByText('Beta')).toHaveLength(2); // the pin's popup and the card
    expect(screen.getByText(eta(beta, 'car'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Car/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching the mode changes the time and the speed of the light on the route', () => {
    locate({});
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    fireEvent.click(screen.getAllByTestId('marker')[1]);
    fireEvent.click(screen.getByRole('button', { name: /Walk/ }));
    expect(layer()).toHaveAttribute('data-mode', 'walk');
    expect(screen.getByText(eta(beta, 'walk'))).toBeInTheDocument();
    expect(eta(beta, 'walk')).not.toBe(eta(beta, 'car'));
  });

  it('picking another pin moves the route and the card to that spot', () => {
    locate({});
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    fireEvent.click(screen.getAllByTestId('marker')[1]);
    fireEvent.click(screen.getAllByTestId('marker')[0]);
    expect(layer()).toHaveAttribute('data-dest', '9.91,125.07');
    expect(screen.getByText(eta(alpha, 'car'))).toBeInTheDocument();
  });

  it('closing the card takes the route away until a pin is picked again', () => {
    locate({});
    render(ui());
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    fireEvent.click(screen.getAllByTestId('marker')[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Hide travel time' }));
    expect(layer()).toHaveAttribute('data-dest', '');
    expect(screen.getByText('Tap a pin to see the travel time from you.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('marker')[1]);
    expect(layer()).toHaveAttribute('data-dest', '10.5,125');
  });

  it('on a map with a single spot (the spot page) that spot is the destination without any click', () => {
    locate({});
    render(ui({ spots: [beta] }));
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    expect(layer()).toHaveAttribute('data-dest', '10.5,125');
    expect(screen.getByText(eta(beta, 'car'))).toBeInTheDocument();
  });

  it('on the map page the active spot is the destination, and clearing it clears the route', () => {
    locate({});
    const { rerender } = render(ui({ focusActive: true, activeId: null }));
    fireEvent.click(screen.getByRole('button', { name: 'Travel time from me' }));
    expect(layer()).toHaveAttribute('data-dest', '');
    rerender(ui({ focusActive: true, activeId: '2' }));
    expect(layer()).toHaveAttribute('data-dest', '10.5,125');
    rerender(ui({ focusActive: true, activeId: null }));
    expect(layer()).toHaveAttribute('data-dest', '');
  });

  it('reuses the page\'s own "Near me" when it is already on, without asking again', () => {
    const enable = vi.fn();
    render(ui({ nearMe: { status: 'on', active: true, origin: HERE, enable, disable: () => {} } }));
    expect(screen.queryByRole('button', { name: 'Travel time from me' })).toBeNull();
    expect(screen.getByText('Tap a pin to see the travel time from you.')).toBeInTheDocument();
    expect(enable).not.toHaveBeenCalled();
  });

  it('shows nothing when there is no pin to travel to', () => {
    render(ui({ spots: [{ _id: '9', slug: 'z', name: 'No coords' }] }));
    expect(screen.queryByRole('button', { name: 'Travel time from me' })).toBeNull();
  });
});
