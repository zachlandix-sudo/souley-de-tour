import { contourPaths, makeTerrain } from './contours.js';

describe('terrain contours', () => {
  it('is repeatable for a seed and differs between seeds', () => {
    const a = makeTerrain('x'), b = makeTerrain('x'), c = makeTerrain('y');
    expect(a(120, 340)).toBe(b(120, 340));
    expect(a(120, 340) === c(120, 340)).toBe(false);
  });
  it('fills a large area with lines, unlike the seeded map that fades to flat', () => {
    const paths = contourPaths({ seed: 'sogod-bay', width: 1940, height: 2140, levels: 14, cell: 26, terrain: true });
    expect(paths.length).toBeGreaterThan(20);
    const defaults = contourPaths({ seed: 'sogod-bay', width: 400, height: 500, levels: 11, cell: 20 });
    expect(defaults.length).toBeGreaterThan(0); // the old behaviour is unchanged
  });
});
