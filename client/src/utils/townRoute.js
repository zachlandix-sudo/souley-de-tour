// "Town by town": the maths behind the pinned journey on the home page. No React or DOM in here, so it can be tested.
//
// The 8 towns sit at their real relative positions (town centres from the seed data), the route visits them one after
// another, and scrolling moves a point t along it: t = 0 is the first town, t = 7 the last, t = 2.5 is halfway
// between the third and the fourth. Everything on screen is worked out from t.

// [latitude, longitude] of each town centre (same values as server/src/seed/data/southern-leyte-spots.json).
export const TOWN_COORDS = {
  maasin: [10.1335, 124.846], macrohon: [10.0766, 124.9401], burgos: [10.0296, 125.017], limasawa: [9.9243, 125.0744],
  pintuyan: [9.9446, 125.2492], hinunangan: [10.3946, 125.1985], silago: [10.5284, 125.1627], sogod: [10.3856, 124.9806],
};
// The order of the tour: from the south-west round the south and up the east side, then back to Sogod Bay.
export const JOURNEY = ['maasin', 'macrohon', 'burgos', 'limasawa', 'pintuyan', 'hinunangan', 'silago', 'sogod'];
export const STAGE = { width: 900, height: 1100 };
export const HOLD = 0.05; // share of the scroll at each end where the journey rests on the first / last town

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (u) => u * u * (3 - 2 * u);
const r1 = (n) => Math.round(n * 10) / 10;

// Town centres -> x/y on the stage (north is up, east is right, one degree of longitude is a little shorter than latitude).
export function projectTowns(order = JOURNEY, { width = STAGE.width, height = STAGE.height, pad = 170 } = {}) {
  const pts = order.map((id) => ({ id, lat: TOWN_COORDS[id][0], lng: TOWN_COORDS[id][1] }));
  const kx = Math.cos((pts.reduce((s, p) => s + p.lat, 0) / pts.length) * Math.PI / 180);
  const xs = pts.map((p) => p.lng * kx), ys = pts.map((p) => -p.lat);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX, spanY = Math.max(...ys) - minY;
  const k = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const ox = (width - spanX * k) / 2 - minX * k, oy = (height - spanY * k) / 2 - minY * k;
  return pts.map((p, i) => ({ id: p.id, x: r1(xs[i] * k + ox), y: r1(ys[i] * k + oy) }));
}

// Scroll position -> progress. top = the section's distance from the top of the screen, height = its height.
export const progressFromScroll = (top, height, viewport) => clamp01(-top / Math.max(1, height - viewport));
export const journeyT = (p, n) => clamp01((p - HOLD) / (1 - 2 * HOLD)) * (n - 1);
export const progressForStep = (i, n) => HOLD + (i / (n - 1)) * (1 - 2 * HOLD); // the opposite way: jump to town i
export const activeIndex = (t, n) => Math.min(n - 1, Math.max(0, Math.round(t)));
export const segmentFill = (t, i) => clamp01(t - i); // how much of the line between town i and i + 1 is drawn

// Each leg is a gentle arc, bowing left and right in turn.
export function bow(a, b, i) {
  const k = i % 2 ? -0.16 : 0.16;
  return { x: (a.x + b.x) / 2 - (b.y - a.y) * k, y: (a.y + b.y) / 2 + (b.x - a.x) * k };
}
export const segmentPath = (a, b, i) => { const c = bow(a, b, i); return `M${r1(a.x)} ${r1(a.y)}Q${r1(c.x)} ${r1(c.y)} ${r1(b.x)} ${r1(b.y)}`; };
export function quadPoint(a, c, b, u) {
  const m = 1 - u;
  return { x: m * m * a.x + 2 * m * u * c.x + u * u * b.x, y: m * m * a.y + 2 * m * u * c.y + u * u * b.y };
}
// Where the tip of the drawn line is at t. Eased inside each leg so it lingers on each town.
export function headAt(points, t) {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(t)));
  const a = points[i], b = points[i + 1];
  return quadPoint(a, bow(a, b, i), b, ease(clamp01(t - i)));
}
// The camera follows the tip, zooming out a little between towns and settling in on each one.
export function cameraAt(points, t, { zoomIn = 1.08, zoomOut = 0.9 } = {}) {
  const i = Math.min(points.length - 2, Math.max(0, Math.floor(t)));
  const h = headAt(points, t);
  return { x: h.x, y: h.y, scale: zoomIn - (zoomIn - zoomOut) * Math.sin(Math.PI * clamp01(t - i)) };
}
