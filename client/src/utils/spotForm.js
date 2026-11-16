// Opening days and best months for the trip planner. Nothing ticked = open every day / good all year.
export const WEEKDAYS = [['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']];
export const MONTH_LIST = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const emptyValues = () => ({
  name: '', shortDescription: '', description: '', categoryIds: [], municipality: '', barangay: '', address: '',
  latitude: '', longitude: '', images: [''], activities: [], entranceFee: '', estimatedBudget: '',
  recommendedDuration: '', bestTimeToVisit: '', openDays: [], bestMonths: [], difficulty: 'easy', accessibility: '', whatToBring: [],
  safetyTips: [], contactName: '', contactPhone: '', contactEmail: '', nearbySpotIds: [], status: 'draft', isFeatured: false,
});

const blank = (v) => v === undefined || v === null || String(v).trim() === '';

// A site path like /spots/name.jpg (what the import fills in) is fine; everything else must be http(s).
const isLocal = (s) => /^\/[^/\s]/.test(s);

// A Google Images result link (google.com/imgres?imgurl=...) hides the real photo address in its imgurl part.
function googleImagesTarget(u) {
  if (!/(^|\.)google\./.test(u.hostname) || !/^\/imgres\/?$/.test(u.pathname)) return '';
  const target = u.searchParams.get('imgurl');
  try { return target && ['http:', 'https:'].includes(new URL(target).protocol) ? target : ''; } catch { return ''; }
}

// Turns common "share" links into direct photo links so they show up on the cards.
export function normalizeImageUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s || isLocal(s)) return s;
  let u;
  try { u = new URL(s); } catch { return s; }
  const host = u.hostname.replace(/^www\./, '');
  const fromGoogle = googleImagesTarget(u);
  if (fromGoogle) return fromGoogle;
  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || u.searchParams.get('id');
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }
  if (host === 'dropbox.com') { u.hostname = 'dl.dropboxusercontent.com'; u.searchParams.delete('dl'); u.searchParams.set('raw', '1'); return u.toString(); }
  if (host === 'imgur.com' && /^\/[A-Za-z0-9]{5,8}$/.test(u.pathname)) return `https://i.imgur.com${u.pathname}.jpg`;
  return s;
}

// '' when the link looks usable, otherwise a sentence telling the admin what to do.
export function imageProblem(raw) {
  const s = String(raw ?? '').trim();
  if (!s || isLocal(s)) return '';
  let u;
  try { u = new URL(s); } catch { return 'Each image must be a valid http(s) link, or a site path like /spots/name.jpg.'; }
  if (!['http:', 'https:'].includes(u.protocol)) return 'Each image must be a valid http(s) link, or a site path like /spots/name.jpg.';
  if (googleImagesTarget(u)) return '';
  const host = u.hostname.replace(/^www\./, '');
  if (/(^|\.)(facebook|instagram)\.com$/.test(host) || /^(fb\.com|fb\.watch)$/.test(host)) {
    return 'Facebook and Instagram do not let other sites show their photos from a post link. Save the photo to your computer and put it in client/public/spots/ with the name from PHOTOS.md, or right-click the photo, choose "Copy image address" and paste that (that address can stop working after a few days).';
  }
  const page = /(^|\.)pinterest\.com$/.test(host) || /^(fb\.com|fb\.watch|goo\.gl|maps\.app\.goo\.gl|bit\.ly)$/.test(host)
    || (/(^|\.)google\./.test(host) && !/googleusercontent/.test(host) && /\/(search|imgres|maps)/.test(u.pathname));
  return page ? 'That link opens a web page, not a photo. Right-click the photo, choose "Copy image address", and paste that instead.' : '';
}

export function validateSpotForm(v) {
  const e = {};
  if (blank(v.name)) e.name = 'Name required.';
  if (blank(v.description)) e.description = 'Description required.';
  if (blank(v.municipality)) e.municipality = 'Municipality required.';
  if (blank(v.shortDescription)) e.shortDescription = 'Short description required (max 300).';
  else if (v.shortDescription.length > 300) e.shortDescription = 'Short description must be 300 characters or fewer.';
  const imgs = (v.images || []).filter((x) => !blank(x));
  if (imgs.length === 0) e.images = 'At least one image URL required.';
  else { const bad = imgs.map(imageProblem).find(Boolean); if (bad) e.images = bad; }
  const hasLat = !blank(v.latitude);
  const hasLng = !blank(v.longitude);
  if (hasLat !== hasLng) {
    if (!hasLat) e.latitude = 'Enter latitude, or clear longitude.';
    else e.longitude = 'Enter longitude, or clear latitude.';
  }
  if (hasLat && (Number.isNaN(Number(v.latitude)) || Number(v.latitude) < -90 || Number(v.latitude) > 90)) e.latitude = 'Latitude must be between -90 and 90.';
  if (hasLng && (Number.isNaN(Number(v.longitude)) || Number(v.longitude) < -180 || Number(v.longitude) > 180)) e.longitude = 'Longitude must be between -180 and 180.';
  if (!blank(v.estimatedBudget) && (Number.isNaN(Number(v.estimatedBudget)) || Number(v.estimatedBudget) < 0)) e.estimatedBudget = 'Budget must be 0 or more.';
  if (!blank(v.contactEmail) && !/^\S+@\S+\.\S+$/.test(v.contactEmail)) e.contactEmail = 'Enter a valid email.';
  return e;
}

export function toApiBody(v) {
  const out = {};
  Object.entries(v).forEach(([k, val]) => {
    if (Array.isArray(val)) out[k] = val.map((x) => (typeof x === 'string' ? (k === 'images' ? normalizeImageUrl(x) : x.trim()) : x)).filter((x) => x !== '');
    else if (typeof val === 'string') { if (val.trim() !== '') out[k] = val.trim(); }
    else if (val !== undefined && val !== null) out[k] = val;
  });
  if (out.estimatedBudget !== undefined) out.estimatedBudget = Number(out.estimatedBudget);
  if (out.latitude !== undefined && out.longitude !== undefined) {
    out.latitude = Number(out.latitude);
    out.longitude = Number(out.longitude);
  } else { delete out.latitude; delete out.longitude; }
  return out;
}

const id = (x) => (x && typeof x === 'object' ? x._id : x);

export function fromSpot(s) {
  const base = emptyValues();
  const [lng, lat] = s.location?.coordinates || [];
  const str = (x) => (x === undefined || x === null ? '' : String(x));
  return {
    ...base,
    name: str(s.name), shortDescription: str(s.shortDescription), description: str(s.description),
    categoryIds: (s.categoryIds || []).map(id), municipality: str(s.municipality), barangay: str(s.barangay), address: str(s.address),
    latitude: lat === undefined ? '' : String(lat), longitude: lng === undefined ? '' : String(lng),
    images: s.images?.length ? [...s.images] : [''], activities: [...(s.activities || [])],
    entranceFee: str(s.entranceFee), estimatedBudget: str(s.estimatedBudget), recommendedDuration: str(s.recommendedDuration),
    bestTimeToVisit: str(s.bestTimeToVisit), openDays: [...(s.openDays || [])], bestMonths: (s.bestMonths || []).map(Number), difficulty: s.difficulty || 'easy', accessibility: str(s.accessibility),
    whatToBring: [...(s.whatToBring || [])], safetyTips: [...(s.safetyTips || [])],
    contactName: str(s.contactName), contactPhone: str(s.contactPhone), contactEmail: str(s.contactEmail),
    nearbySpotIds: (s.nearbySpotIds || []).map(id), status: s.status || 'draft', isFeatured: !!s.isFeatured,
  };
}
