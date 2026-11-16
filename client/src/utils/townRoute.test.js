import { JOURNEY, STAGE, HOLD, projectTowns, progressFromScroll, journeyT, progressForStep, activeIndex, segmentFill, segmentPath, headAt, cameraAt, quadPoint, bow } from './townRoute.js';

describe('town journey maths', () => {
  const pts = projectTowns();
  const by = Object.fromEntries(pts.map((p) => [p.id, p]));

  it('puts all 8 towns on the stage with room to spare', () => {
    expect(pts.length).toBe(8);
    for (const p of pts) {
      expect(p.x).toBeGreaterThan(100); expect(p.x).toBeLessThan(STAGE.width - 100);
      expect(p.y).toBeGreaterThan(100); expect(p.y).toBeLessThan(STAGE.height - 100);
    }
  });
  it('keeps north up and east right, like a real map', () => {
    expect(by.silago.y).toBeLessThan(by.maasin.y); // Silago is north of Maasin
    expect(by.limasawa.y).toBeGreaterThan(by.sogod.y); // Limasawa is south of Sogod
    expect(by.pintuyan.x).toBeGreaterThan(by.maasin.x); // Pintuyan is east of Maasin
  });
  it('visits the towns in the journey order', () => {
    expect(pts.map((p) => p.id).join()).toBe(JOURNEY.join());
  });
  it('maps scroll to progress and back', () => {
    expect(progressFromScroll(0, 4000, 800)).toBe(0);
    expect(progressFromScroll(-3200, 4000, 800)).toBe(1);
    expect(progressFromScroll(-1600, 4000, 800)).toBe(0.5);
    expect(progressFromScroll(500, 4000, 800)).toBe(0); // before the section: clamped
    for (let i = 0; i < 8; i++) expect(Math.abs(journeyT(progressForStep(i, 8), 8) - i) < 1e-9).toBe(true);
  });
  it('rests on the first and last town at the ends of the scroll', () => {
    expect(journeyT(0, 8)).toBe(0);
    expect(journeyT(HOLD, 8)).toBe(0);
    expect(journeyT(1, 8)).toBe(7);
    expect(Math.abs(journeyT(1 - HOLD, 8) - 7) < 1e-9).toBe(true);
  });
  it('knows the active town and how much of each leg is drawn', () => {
    expect(activeIndex(0, 8)).toBe(0);
    expect(activeIndex(2.4, 8)).toBe(2);
    expect(activeIndex(2.6, 8)).toBe(3);
    expect(activeIndex(7, 8)).toBe(7);
    expect(segmentFill(2.25, 1)).toBe(1);
    expect(segmentFill(2.25, 2)).toBe(0.25);
    expect(segmentFill(2.25, 3)).toBe(0);
  });
  it('puts the tip of the line exactly on a town when t is a whole number', () => {
    for (let i = 0; i < 8; i++) {
      const h = headAt(pts, i);
      expect(Math.abs(h.x - pts[i].x) < 0.01 && Math.abs(h.y - pts[i].y) < 0.01).toBe(true);
    }
  });
  it('keeps the camera zoom between out and in, settled on each town', () => {
    for (let t = 0; t <= 7; t += 0.1) { const c = cameraAt(pts, t); expect(c.scale).toBeGreaterThan(0.899); expect(c.scale).toBeLessThan(1.081); }
    expect(cameraAt(pts, 3).scale).toBe(1.08);
    expect(cameraAt(pts, 3.5).scale).toBe(0.9);
  });
  it('draws each leg as an arc that starts and ends on its towns', () => {
    const a = pts[0], b = pts[1];
    expect(segmentPath(a, b, 0).startsWith(`M${a.x} ${a.y}Q`)).toBe(true);
    expect(segmentPath(a, b, 0).endsWith(`${b.x} ${b.y}`)).toBe(true);
    const c = bow(a, b, 0);
    expect(quadPoint(a, c, b, 0).x).toBe(a.x);
    expect(quadPoint(a, c, b, 1).y).toBe(b.y);
  });
});
