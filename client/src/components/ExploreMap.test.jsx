import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./SpotMap', () => ({ default: () => <div data-testid="flat-map" /> }));
vi.mock('./SpotMap3D', () => ({ default: ({ onFail }) => <div data-testid="3d-map"><button type="button" onClick={onFail}>break</button></div> }));

import ExploreMap from './ExploreMap';

describe('ExploreMap', () => {
  afterEach(() => { delete window.WebGLRenderingContext; localStorage.clear(); });

  it('gives browsers without WebGL the flat map and no switch', () => {
    render(<ExploreMap spots={[]} />);
    expect(screen.getByTestId('flat-map')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Map view' })).toBeNull();
  });

  it('opens in 3D, switches to Flat and remembers the choice', async () => {
    window.WebGLRenderingContext = function WebGLRenderingContext() {};
    const { unmount } = render(<ExploreMap spots={[]} />);
    expect(await screen.findByTestId('3d-map')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Flat' }));
    expect(screen.getByTestId('flat-map')).toBeInTheDocument();
    unmount();
    render(<ExploreMap spots={[]} />);
    expect(screen.getByTestId('flat-map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Flat' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to the flat map when the 3D map cannot start', async () => {
    window.WebGLRenderingContext = function WebGLRenderingContext() {};
    render(<ExploreMap spots={[]} />);
    await userEvent.click(await screen.findByRole('button', { name: 'break' }));
    expect(screen.getByTestId('flat-map')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Map view' })).toBeNull();
  });
});
