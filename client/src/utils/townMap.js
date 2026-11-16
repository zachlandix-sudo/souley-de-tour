// Shared numbers and helpers for the 3D "Explore by town" map (components/home/TownMap3D.jsx). No React, no maplibre: easy to test.

// Extrusion heights in metres. Exaggerated on purpose: at province scale a real height would be invisible.
export const H = { context: 500, neighbour: 1300, town: 3800, selected: 6600 };

// Slightly warm greys so neighbouring towns can be told apart; the orange is kept for the selected town.
export const TONES = ['#2b2623', '#352e2a', '#232020'];
export const COLORS = { neighbour: '#1b1918', context: '#111010', hover: '#6a4630', selected: '#ff6a13', ring: '#ff6a13' };

// Chip and card order for Southern Leyte: the eight towns the Home page already features, then the rest A to Z.
export const SL_ORDER = ['maasin', 'burgos', 'limasawa', 'silago', 'macrohon', 'pintuyan', 'sogod', 'hinunangan',
  'anahawan', 'bontoc', 'hinundayan', 'libagon', 'liloan', 'malitbog', 'saintbernard', 'sanfrancisco', 'sanjuan', 'sanricardo', 'tomasoppus'];

// Top picks written out for the card (used until the live list from the API arrives, and if it never does).
export const PICKS = {
  maasin: 'Maasin Cathedral · Monte Cueva Shrine · Camp Danao Forest Park',
  burgos: "Tangka-an Point · Adrien's Cove · Likay-Likay Beach",
  limasawa: 'First Cross Monument · Dakdak Beach · Limasawa Island Lagoon',
  silago: 'Kagut-an Falls · Tubod Falls and Cave · Silago Beach',
  macrohon: 'Seven Falls · Cambaro Cave · Florencia Island',
  pintuyan: 'Son-ok Marine Sanctuary · Dan-an Falls · Caningag Viewpoint',
  sogod: 'Sogod Bay · Agas-Agas Bridge · Lum-an Falls',
  hinunangan: 'San Pedro Island · Mount Nacolod · Golden Sand Beach',
  anahawan: 'Mainit Hot Spring · Mt. Cabalian Trail',
  bontoc: 'Alejos Falls',
  hinundayan: 'Naputjukan Underwater Cave · Napandong Rock Formation',
  libagon: 'Uwan-Uwanan Falls',
  liloan: 'Bosai Falls · El Paraiso Beach · Tagbak Marine Park',
  malitbog: 'Baluarte Watchtower Ruins · Santo Niño Parish Church · Demoloc Caves',
  saintbernard: 'Hindag-an Falls and Forest Park · Guinsaugon Eco-adventure National Park',
  sanfrancisco: 'Napantao Marine Sanctuary · Ilijan Point · Panaon Island Coast',
  sanjuan: "Lake Danao · Luman Falls · San Juan Children's Park",
  sanricardo: '',
  tomasoppus: 'Bosong-bosong Spring and Tinugpahan Falls',
};

// Screen pixels that one metre of height adds at this zoom, latitude and pitch (MapLibre uses 512 px tiles).
// The labels use it to ride on top of the extruded towns instead of sitting at their feet.
export function liftPerMetre(zoom, lat, pitchDeg) {
  const ground = (512 * 2 ** zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180));
  return ground * Math.sin((pitchDeg * Math.PI) / 180);
}

export const easeOutCubic = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

// Room the camera keeps clear around the view. With a town's card open it covers the left side on wide screens and the bottom
// on phones; the overview needs no room for it.
export function cameraPadding(width, withCard = false) {
  if (!withCard) return { top: 70, bottom: 40, left: 30, right: 30 };
  if (width >= 1024) return { top: 70, bottom: 50, left: 420, right: 60 };
  if (width >= 640) return { top: 70, bottom: 250, left: 30, right: 30 };
  return { top: 60, bottom: 270, left: 16, right: 16 };
}

// Which towns keep their name on the map when it is zoomed out (the eight the Home page features); the rest show a dot until you zoom in or point at them.
export const NEAR_ZOOM = 9.4;
export const MAJOR = new Set(SL_ORDER.slice(0, 8));
