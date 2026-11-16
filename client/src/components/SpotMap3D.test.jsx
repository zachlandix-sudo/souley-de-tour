import { vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// MapLibre needs WebGL, which jsdom does not have: a recording stand-in is enough to check what the component asks of it.
const rec = vi.hoisted(() => ({ maps: [], markers: [], popups: [] }));
vi.mock('maplibre-gl', () => {
  class Map {
    constructor(opts) { this.opts = opts; this.calls = []; this.cooperativeGestures = { enable: vi.fn(), disable: vi.fn() }; rec.maps.push(this); }
    on() {} off() {} addControl() {} remove() {} resize() {} setStyle(s) { this.calls.push(['setStyle', s]); }
    flyTo(o) { this.calls.push(['flyTo', o]); } fitBounds(b, o) { this.calls.push(['fitBounds', b, o]); } easeTo(o) { this.calls.push(['easeTo', o]); }
    getContainer() { return { clientWidth: 400, clientHeight: 300 }; } getZoom() { return 10; } getBounds() { return { contains: () => true }; }
  }
  class Marker {
    constructor(o) { this.el = o.element; this.removed = false; rec.markers.push(this); }
    setLngLat(l) { this.lnglat = l; return this; } setPopup(p) { this.popup = p; return this; } addTo() { return this; } remove() { this.removed = true; }
  }
  class Popup { constructor() { rec.popups.push(this); } setDOMContent(n) { this.node = n; return this; } }
  class LngLatBounds { constructor(a) { this.pts = [a]; } extend(p) { this.pts.push(p); return this; } }
  class NavigationControl {}
  return { default: { Map, Marker, Popup, LngLatBounds, NavigationControl } };
});

import SpotMap3D from './SpotMap3D';

const spots = [
  { _id: '1', slug: 'alpha', name: 'Alpha', municipality: 'Sogod', location: { coordinates: [125.0, 10.3] } },
  { _id: '2', slug: 'bistro', name: 'Bistro', location: { coordinates: [125.1, 10.4] }, categoryIds: [{ slug: 'food' }] },
  { _id: '3', slug: 'nowhere', name: 'No coordinates' },
];
const wrap = (props) => render(<MemoryRouter><SpotMap3D spots={spots} {...props} /></MemoryRouter>);

describe('SpotMap3D', () => {
  beforeEach(() => { rec.maps.length = 0; rec.markers.length = 0; rec.popups.length = 0; });

  it('puts one pin on the map for each spot that has coordinates, and frames them', () => {
    wrap();
    const pins = rec.markers.filter((m) => m.el.classList.contains('m3-pin'));
    expect(pins).toHaveLength(2);
    expect(pins[0].lnglat).toEqual([125.0, 10.3]);
    expect(pins[1].el.classList.contains('m3-pin--food')).toBe(true);
    expect(rec.maps[0].calls.some(([name]) => name === 'fitBounds')).toBe(true);
  });

  it('tells the page which pin is hovered and clicked', () => {
    const onPinClick = vi.fn();
    const onPinHover = vi.fn();
    wrap({ onPinClick, onPinHover });
    const el = rec.markers[0].el;
    el.dispatchEvent(new MouseEvent('mouseenter'));
    el.dispatchEvent(new MouseEvent('click'));
    el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onPinHover.mock.calls).toEqual([['1'], [null]]);
    expect(onPinClick).toHaveBeenCalledWith('1');
  });

  it('lifts the active pin, and flies to it only when it is the selected one', () => {
    const { rerender } = wrap({ activeId: '2' });
    expect(rec.markers[1].el.classList.contains('is-active')).toBe(true);
    expect(rec.markers[0].el.classList.contains('is-active')).toBe(false);
    expect(rec.maps[0].calls.some(([name]) => name === 'flyTo')).toBe(false);
    rerender(<MemoryRouter><SpotMap3D spots={spots} activeId="2" focusActive /></MemoryRouter>);
    expect(rec.maps[0].calls.filter(([name]) => name === 'flyTo')).toHaveLength(1);
  });

  it('builds the pin card from text, not markup', () => {
    wrap();
    const node = rec.popups[0].node;
    expect(node.querySelector('strong').textContent).toBe('Alpha');
    expect(node.querySelector('a').getAttribute('href')).toBe('/spots/alpha');
  });

  it('shows the visitor with a dot while Near me is on', () => {
    wrap({ nearMe: { active: true, origin: [10.2, 125.05] } });
    const you = rec.markers.find((m) => m.el.classList.contains('m3-you'));
    expect(you.lnglat).toEqual([125.05, 10.2]);
  });

  it('switches Map / Satellite and opens the full-screen view', async () => {
    wrap();
    await userEvent.click(screen.getByRole('button', { name: 'Satellite' }));
    expect(rec.maps[0].calls.some(([name, style]) => name === 'setStyle' && style.sources?.sat)).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Expand map' }));
    expect(document.body.classList.contains('xp-map-lock')).toBe(true);
    expect(rec.maps[0].cooperativeGestures.disable).toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(document.body.classList.contains('xp-map-lock')).toBe(false);
    expect(screen.getByRole('button', { name: 'Expand map' })).toBeInTheDocument();
  });

  it('says so when there is nothing to show', () => {
    wrap({ spots: [] });
    expect(screen.getByText('No map locations for these results')).toBeInTheDocument();
  });
});
