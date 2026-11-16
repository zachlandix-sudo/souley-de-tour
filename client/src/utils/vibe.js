// The "Vibe pad" on the Spots page: every spot gets a place on a two-way mood grid, worked out from its categories and activities
// (the API gives both for every spot). No React, no network: easy to test.
//   x: 0 = slow and easy ... 1 = wild and active        y: 0 = nature and sea ... 1 = heritage and culture
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const THRILL = new Set(['trekking', 'hiking', 'waterfall hiking', 'cave exploring', 'cliff jumping', 'zip lining', 'canyoning', 'rappelling',
  'diving', 'night diving', 'muck diving', 'kayaking', 'surfing', 'skimboarding', 'camping', 'river trekking', 'stand-up paddle',
  'paddle boarding', 'snorkeling', 'whale shark watching', 'beach volleyball', 'island hopping']);
const CALM = new Set(['sightseeing', 'photography', 'pilgrimage', 'picnic', 'relaxing', 'dining', 'fishing', 'fish watching', 'fish feeding',
  'sunset viewing', 'memorial visit', 'history tour', 'museum visit', 'study tour', 'hot spring bathing', 'family outing', 'bird watching',
  'nature walk', 'forest walk', 'waterfall visit', 'waterfall viewing', 'boat ride', 'island visit', 'overnight stay', 'wildlife viewing']);
const STORY = new Set(['pilgrimage', 'history tour', 'museum visit', 'study tour', 'memorial visit']);

const names = (spot) => (spot?.categoryIds || spot?.categories || []).map((c) => String(c?.slug || c?.name || c || '').toLowerCase());

// A fixed number between 0 and 1 for a piece of text, so spots with the same tags fan out instead of piling up (and stay put between visits).
function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

export function vibeOf(spot) {
  const cats = names(spot);
  const has = (word) => cats.some((c) => c.includes(word));
  let x = 0.5;
  let y = 0.4;
  if (has('adventure')) { x += 0.28; y -= 0.08; }
  if (has('heritage')) { x -= 0.14; y += 0.45; }
  if (has('culture')) { x -= 0.08; y += 0.3; }
  if (has('beach')) { x -= 0.06; y -= 0.2; }
  if (has('nature')) y -= 0.12;
  for (const a of spot?.activities || []) {
    const k = String(a).toLowerCase();
    if (THRILL.has(k)) x += 0.1;
    if (CALM.has(k)) x -= 0.08;
    if (STORY.has(k)) y += 0.12;
  }
  const key = String(spot?.slug || spot?.name || '');
  return { x: clamp(x + (hash01(key) - 0.5) * 0.08, 0.04, 0.96), y: clamp(y + (hash01(`${key}~`) - 0.5) * 0.08, 0.04, 0.96) };
}

// 100 when the spot sits exactly where the puck is, 0 once it is further than ~0.6 of the pad away.
export const MATCH_REACH = 0.6;
export const VIBE_RADIUS = 0.2; // the ring drawn around the puck: spots inside it are "in your vibe"
export const matchPct = (a, b) => Math.max(0, Math.round(100 * (1 - Math.hypot(a.x - b.x, a.y - b.y) / MATCH_REACH)));

// Every spot with its place on the pad and how well it fits the puck, best first (ties go to the better rated).
export function rankByVibe(spots, point) {
  return (spots || [])
    .map((spot) => { const vibe = vibeOf(spot); return { spot, vibe, match: matchPct(vibe, point) }; })
    .sort((a, b) => b.match - a.match || (b.spot.averageRating || 0) - (a.spot.averageRating || 0));
}

// The mood in words: rows run from nature and sea (bottom of the pad) to heritage (top), columns from slow to wild.
export const ZONES = [
  ['Slow and scenic', 'Easy outdoors', 'Wild adventure'],
  ['Quiet wander', 'A bit of everything', 'Active explorer'],
  ['Sacred and still', 'Story seeker', 'Historic trail'],
];
// Which of the nine areas of the pad a point is in (row 0 = nature and sea, col 0 = slow).
export function zoneOf(x, y) {
  const col = x < 0.34 ? 0 : x > 0.66 ? 2 : 1;
  const row = y < 0.34 ? 0 : y > 0.66 ? 2 : 1;
  return { row, col, name: ZONES[row][col] };
}
export const vibeName = (x, y) => zoneOf(x, y).name;
// How close (in pad units) the dot has to be to a spot for it to lock on and snap to it.
export const SNAP = 0.035;
