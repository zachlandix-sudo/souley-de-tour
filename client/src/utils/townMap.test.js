import { describe, it, expect } from 'vitest';
import data from '../data/townMap.json';
import { translations } from '../i18n/translations';
import { MAJOR, PICKS, SL_ORDER, cameraPadding, easeOutCubic, liftPerMetre } from './townMap';

const sl = data.towns.features.filter((f) => f.properties.sl);
const nb = data.towns.features.filter((f) => !f.properties.sl);

describe('town map data', () => {
  it('has all 19 Southern Leyte towns and 7 bordering Leyte towns with unique ids', () => {
    expect(sl).toHaveLength(19);
    expect(nb.map((f) => f.properties.name).sort()).toEqual(['Abuyog', 'Bato', 'Hilongos', 'Hindang', 'Inopacan', 'Mahaplag', 'Matalom']);
    const ids = data.towns.features.map((f) => f.properties.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every town has a polygon, a label point inside Southern Leyte\'s surroundings and a sane bounding box', () => {
    for (const f of data.towns.features) {
      const { lx, ly, bbox } = f.properties;
      expect(['Polygon', 'MultiPolygon'], f.properties.id).toContain(f.geometry.type);
      expect(lx).toBeGreaterThan(124.4); expect(lx).toBeLessThan(125.6);
      expect(ly).toBeGreaterThan(9.6); expect(ly).toBeLessThan(10.9);
      expect(bbox[0]).toBeLessThan(bbox[2]); expect(bbox[1]).toBeLessThan(bbox[3]);
    }
  });

  it('uses the same town names as the spot data (the /spots?municipality= filter is exact)', () => {
    expect(sl.map((f) => f.properties.name)).toEqual(expect.arrayContaining(['Maasin City', 'Padre Burgos', 'Saint Bernard', 'San Francisco', 'Tomas Oppus']));
  });

  it('SL_ORDER covers every Southern Leyte town once, with picks, and the four languages\' taglines exist', () => {
    expect([...SL_ORDER].sort()).toEqual(sl.map((f) => f.properties.id).sort());
    for (const id of SL_ORDER) {
      expect(PICKS, id).toHaveProperty(id);
      for (const code of ['en', 'fil', 'ceb']) expect(translations[code][`hp.towns.${id}`], `${code}:${id}`).toBeTruthy();
    }
    expect(MAJOR.size).toBe(8);
  });

  it('has context land and depth rings', () => {
    expect(data.context.features.map((f) => f.properties.name)).toEqual(['Leyte', 'Bohol', 'Cebu']);
    expect(data.rings.features.length).toBeGreaterThan(2);
  });
});

describe('town map helpers', () => {
  it('liftPerMetre grows with zoom and with pitch, and is zero when looking straight down', () => {
    expect(liftPerMetre(10, 10.2, 60)).toBeGreaterThan(liftPerMetre(9, 10.2, 60));
    expect(liftPerMetre(9, 10.2, 60)).toBeGreaterThan(liftPerMetre(9, 10.2, 30));
    expect(liftPerMetre(9, 10.2, 0)).toBe(0);
  });
  it('easeOutCubic is clamped to 0..1', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
  });
  it('cameraPadding leaves room for the card only when one is open', () => {
    expect(cameraPadding(1440, true).left).toBeGreaterThan(300);
    expect(cameraPadding(1440, false).left).toBeLessThan(100);
    expect(cameraPadding(390, true).bottom).toBeGreaterThan(200);
  });
});
