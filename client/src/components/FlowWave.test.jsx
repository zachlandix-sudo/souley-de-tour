import { render } from '@testing-library/react';
import FlowWave, { waveHeight, project, spot, ringStrength, POOL_R, RING_LIFE, RING_SPEED } from './FlowWave';

describe('FlowWave', () => {
  it('mounts a decorative canvas and survives a browser without a 2D context (jsdom)', () => {
    const { container } = render(<FlowWave />);
    const cv = container.querySelector('canvas');
    expect(cv).not.toBeNull();
    expect(cv).toHaveAttribute('aria-hidden', 'true');
    expect(cv).toHaveClass('flow-wave');
  });

  it('keeps the hills within about -1..1, and they roll (the height at one spot changes over time)', () => {
    const seen = new Set();
    for (let x = -9; x <= 9; x += 0.7) for (let z = 0; z <= 26; z += 1.3) {
      const h = waveHeight(x, z, 3.1);
      expect(h).toBeGreaterThanOrEqual(-1.031);
      expect(h).toBeLessThanOrEqual(1.031);
      seen.add(h.toFixed(3));
    }
    expect(seen.size).toBeGreaterThan(50);
    expect(waveHeight(1, 5, 0)).not.toBeCloseTo(waveHeight(1, 5, 2), 3);
  });

  it('projects with perspective: far points are smaller and sit closer to the horizon; points behind the camera are dropped', () => {
    const cam = { focal: 800, cx: 400, horizon: 200, camY: 3, back: 3, camX: 0 };
    const near = project(2, 0, 1, cam), far = project(2, 0, 20, cam);
    expect(near.k).toBeGreaterThan(far.k);
    expect(near.sx - cam.cx).toBeGreaterThan(far.sx - cam.cx);
    expect(near.sy).toBeGreaterThan(far.sy); // lower on the screen
    expect(far.sy).toBeGreaterThan(cam.horizon);
    expect(project(0, 0, -5, cam)).toBeNull();
  });

  it('spot: full strength in the middle, nothing at the edge or beyond, and it only gets weaker as you move out', () => {
    expect(spot(0, 0)).toBe(1);
    expect(spot(POOL_R, 0)).toBe(0);
    expect(spot(POOL_R * 2, 40)).toBe(0);
    let last = 1;
    for (let d = 10; d < POOL_R; d += 10) { const v = spot(d, 0); expect(v).toBeLessThanOrEqual(last); expect(v).toBeGreaterThan(0); last = v; }
    expect(spot(30, 40)).toBeCloseTo(spot(50, 0), 10); // only the distance counts, not the direction
  });

  it('ringStrength: a click shockwave is a bump that travels outwards, fades with age and is gone when it is old', () => {
    const at = (age) => age * RING_SPEED; // where the ring is after `age` seconds
    expect(ringStrength(at(0.5), 0.5)).toBeGreaterThan(0.5); // strongest right on the ring
    expect(ringStrength(at(0.5) + 200, 0.5)).toBe(0); // far ahead of it
    expect(ringStrength(at(0.5) - 200, 0.5)).toBe(0); // far behind it
    expect(ringStrength(at(1.5), 1.5)).toBeLessThan(ringStrength(at(0.5), 0.5)); // older = weaker
    expect(ringStrength(at(RING_LIFE), RING_LIFE)).toBe(0);
    expect(ringStrength(10, -1)).toBe(0);
  });
});
