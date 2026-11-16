// Reads a visitor's question (English, Filipino or Bisaya) and works out what they want, WITHOUT an AI model:
//   - what kind of reply: a chat line, a fact about a place, a list of places, or a day-by-day trip
//   - the filters hidden in the sentence: town, activity, budget, days, pace, who is going, month, how hard
//   - which place they mean ("how much is Tinago Falls?", or "how much is it?" after an earlier answer)
// Pure functions: no database, no network. aiService.js feeds the result into the search, the AI prompt and the answer writer.

const fold = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const plainOf = (s) => fold(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const squash = (s) => fold(s).replace(/[^a-z0-9]/g, '');

// edit distance, giving up early once it is above `max`
function distance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < low) low = cur[j];
    }
    if (low > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// ---------- language ----------
const CEB = new Set(['unsa', 'asa', 'giunsa', 'unsaon', 'pila', 'kanus', 'kanusa', 'naa', 'wala', 'gamay', 'dako', 'maayo', 'maayong', 'lami', 'palihug', 'mao', 'kini', 'kani', 'adto', 'adtoan', 'didto', 'nindot', 'kaon', 'makaon', 'makakaon', 'duol', 'layo', 'adlaw', 'nako', 'nimo', 'imong', 'among', 'atong', 'kinsa', 'ngano', 'diin', 'unsang', 'gikan', 'musulod', 'lakaw', 'balay', 'tigulang', 'higala', 'bayad', 'naay', 'dinhi', 'ra']);
const FIL = new Set(['ano', 'saan', 'paano', 'magkano', 'kailan', 'gaano', 'po', 'ba', 'dito', 'doon', 'malapit', 'mura', 'libre', 'araw', 'pasyal', 'puntahan', 'kainan', 'namin', 'natin', 'tayo', 'kami', 'pwede', 'puwede', 'mayroon', 'meron', 'magandang', 'pagkain', 'kumain', 'biyahe', 'barkada', 'pamilya', 'anak', 'din', 'rin', 'ito', 'yung', 'nasaan']);
function detectLang(plain) {
  const toks = plain.split(' ');
  let ceb = 0;
  let fil = 0;
  toks.forEach((t) => { if (CEB.has(t)) ceb += 1; if (FIL.has(t)) fil += 1; });
  if (ceb > fil) return 'ceb';
  if (fil > 0) return 'fil';
  return 'en';
}

// ---------- towns ----------
// canonical name -> extra spellings people use. Towns found in the database are added on top of this list.
const TOWN_ALIASES = {
  'Maasin City': ['maasin city', 'maasin', 'city of maasin'],
  'San Juan': ['san juan', 'cabalian'],
  'Saint Bernard': ['saint bernard', 'st bernard', 'san bernardo'],
  'Tomas Oppus': ['tomas oppus', 't oppus'],
  Sogod: ['sogod'],
  Libagon: ['libagon'], Liloan: ['liloan'], 'San Francisco': ['san francisco'], 'San Ricardo': ['san ricardo'], Hinunangan: ['hinunangan'],
  Hinundayan: ['hinundayan'], Anahawan: ['anahawan'], Bontoc: ['bontoc'], Limasawa: ['limasawa'], Macrohon: ['macrohon'], Malitbog: ['malitbog'],
  'Padre Burgos': ['padre burgos'], Pintuyan: ['pintuyan'], Silago: ['silago'],
};
// areas people name instead of a town: a gentle boost for these towns, never a hard filter
const AREAS = {
  'Sogod Bay': { re: /\bsogod bay\b/, towns: ['Sogod', 'Libagon', 'Liloan', 'San Francisco', 'Padre Burgos', 'Pintuyan', 'San Ricardo'] },
  'Panaon Island': { re: /\bpanaon(?: island)?\b/, towns: ['Liloan', 'San Francisco', 'Pintuyan', 'San Ricardo', 'Padre Burgos'] },
};
// places outside Southern Leyte, so "things to do in Bohol" gets an honest answer
const OUTSIDE = /\b(cebu|bohol|boracay|palawan|el nido|coron|siargao|manila|davao|baguio|vigan|batangas|iloilo|dumaguete|camiguin|zamboanga|cagayan|tokyo|japan|singapore|hong kong|bangkok|thailand|korea|usa|america|paris|france|europe|london|new york|india|china|russia|germany|italy|spain|australia|canada|brazil|dubai)\b/;

function townList(dbTowns = []) {
  const map = new Map();
  Object.entries(TOWN_ALIASES).forEach(([canon, al]) => map.set(canon, new Set(al)));
  dbTowns.filter(Boolean).forEach((t) => {
    const key = [...map.keys()].find((k) => plainOf(k) === plainOf(t) || plainOf(k).replace(/ city$/, '') === plainOf(t).replace(/ city$/, ''));
    const canon = key || t;
    if (!map.has(canon)) map.set(canon, new Set());
    map.get(canon).add(plainOf(canon)); map.get(canon).add(plainOf(canon).replace(/ city$/, ''));
  });
  return map;
}

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findTowns(plain, dbTowns) {
  const found = [];
  const toks = plain.split(' ');
  townList(dbTowns).forEach((aliases, canon) => {
    const hit = [...aliases].filter(Boolean).sort((a, b) => b.length - a.length).find((a) => {
      if (new RegExp(`\\b${esc(a)}\\b`).test(plain)) return true;
      return !a.includes(' ') && a.length >= 6 && toks.some((t) => t.length >= 5 && distance(t, a, a.length >= 9 ? 2 : 1) <= (a.length >= 9 ? 2 : 1));
    });
    if (hit) {
      const at = plain.search(new RegExp(`\\b${esc(hit)}\\b`));
      const before = at > 0 ? plain.slice(Math.max(0, at - 14), at) : '';
      found.push({ canon, from: /\b(from|galing|gikan)\s*$/.test(before) });
    }
  });
  return found;
}

// ---------- numbers ----------
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, isa: 1, usa: 1, dalawa: 2, duha: 2, tatlo: 3, tulo: 3, apat: 4, upat: 4, lima: 5, anim: 6, unom: 6, pito: 7, walo: 8, siyam: 9, sampu: 10, napulo: 10 };
const NUMRE = `(\\d{1,3}|${Object.keys(NUM).join('|')})`;
const toNum = (t) => (/^\d+$/.test(t) ? Number(t) : NUM[t]);

function parseDays(plain) {
  let m = plain.match(/\b(\d)\s?d\s?(\d)\s?n\b/); // 2D1N
  if (m) return Number(m[1]);
  m = plain.match(new RegExp(`\\b${NUMRE}\\s?(?:ka\\s+)?(?:days?|araw|adlaw)\\b`));
  if (m) return toNum(m[1]);
  m = plain.match(new RegExp(`\\b${NUMRE}\\s?(?:ka\\s+)?(?:nights?|gabi|gabii)\\b`));
  if (m) return toNum(m[1]) + 1;
  m = plain.match(new RegExp(`\\b${NUMRE}\\s?weeks?\\b`));
  if (m) return toNum(m[1]) * 7;
  if (/\b(a|one|1)\s+week\b|\bweek long\b|\bisang linggo\b|\busa ka semana\b/.test(plain)) return 7;
  if (/\b(a|one|1)\s+month\b/.test(plain)) return 30;
  if (/\blong weekend\b/.test(plain)) return 3;
  if (/\bweekend\b|\bsabado at linggo\b|\bsabado ug domingo\b/.test(plain)) return 2;
  if (/\bovernight\b/.test(plain)) return 2;
  if (/\b(day trip|day tour|half day|one day|a day|an day|isang araw|usa ka adlaw|sa isang araw)\b/.test(plain)) return 1;
  return null;
}

function parseBudget(raw) {
  const t = fold(raw).replace(/₱/g, ' php ');
  const amount = (n, k) => Math.round(Number(String(n).replace(/,/g, '')) * (k ? 1000 : 1));
  let m = t.match(/\b(?:php|pesos?)\s?(\d[\d,]*(?:\.\d+)?)\s?(k|thousand)?\b/) || t.match(/\bp(\d[\d,]*(?:\.\d+)?)\s?(k|thousand)?\b/);
  if (m) return amount(m[1], m[2]);
  m = t.match(/\b(\d[\d,]*(?:\.\d+)?)\s?(k|thousand)?\s?(?:pesos?|php)\b/);
  if (m) return amount(m[1], m[2]);
  m = t.match(/\b(?:budget|under|below|less than|within|max(?:imum)?|up to|only|around|about|good for|hanggang|hangtod|kaya ng|ubos sa)\s*(?:of\s+)?(?:is\s+)?(\d[\d,]*(?:\.\d+)?)\s?(k|thousand)?\b(?!\s?(?:days?|araw|adlaw|hours?|hrs?|km|people|persons?|pax|nights?))/);
  if (m) { const v = amount(m[1], m[2]); if (v >= 100 || m[2]) return v; }
  m = t.match(/\b(\d+(?:\.\d+)?)\s?k\b(?!m)/);
  if (m) return amount(m[1], true);
  return null;
}

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12, enero: 1, pebrero: 2, marso: 3, abril: 4, mayo: 5, hunyo: 6, hulyo: 7, agosto: 8, setyembre: 9, oktubre: 10, nobyembre: 11, disyembre: 12 };
const SHORT = { jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
function parseMonth(plain) {
  const full = Object.keys(MONTHS).filter((k) => k !== 'may').find((k) => new RegExp(`\\b${k}\\b`).test(plain));
  if (full) return MONTHS[full];
  if (/\b(in|this|during|for|sa|ngayong|nga)\s+(may|mayo)\b/.test(plain)) return 5;
  const m = plain.match(/\b(?:in|this|during|for|on)\s+(jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b/);
  return m ? SHORT[m[1]] : null;
}

// ---------- activities: the visitor's word -> a key; each key lists the words to look for in the spot records ----------
const ACTIVITIES = [
  ['waterfall', /\b(waterfalls?|falls|busay|talon|cascades?)\b/, ['waterfall', 'falls']],
  ['cave', /\b(caves?|caving|spelunking|langub|yungib)\b/, ['cave']],
  ['snorkeling', /\b(snorkel\w*)\b/, ['snorkel']],
  ['diving', /\b(div(?:e|ing|er)s?|scuba|freediv\w*|muck diving)\b/, ['dive', 'diving', 'scuba']],
  ['swimming', /\b(swim\w*|languy|paligo|maligo|pool)\b/, ['swim']],
  ['beach', /\b(beach(?:es)?|baybayon|baybay|white sand|sandbar|shore)\b/, ['beach', 'sand']],
  ['island', /\b(islands?|isla|pulo|island hopping)\b/, ['island']],
  ['whale shark', /\b(whale ?sharks?|butanding)\b/, ['whale shark', 'whaleshark']],
  ['hiking', /\b(hik(?:e|es|ing)|trek\w*|trails|climb\w*|mountains?|bukid|bundok|lakad)\b/, ['hike', 'hiking', 'trek', 'trail', 'climb']],
  ['kayaking', /\b(kayak\w*|paddle\w*|stand up paddle|sup)\b/, ['kayak', 'paddle']],
  ['camping', /\b(camp\w*)\b/, ['camp']],
  ['surfing', /\b(surf\w*|skimboard\w*)\b/, ['surf', 'skimboard']],
  ['heritage', /\b(church(?:es)?|cathedral|simbahan|heritage|histor\w*|museum|shrine|monument|memorial|pilgrim\w*|magellan|first mass|culture|cultural)\b/, ['church', 'cathedral', 'heritage', 'history', 'historic', 'museum', 'shrine', 'memorial', 'pilgrim', 'monument', 'culture']],
  ['photography', /\b(photo\w*|instagram\w*|scenic|views?|sunsets?|sunrises?|picture\w*)\b/, ['photo', 'view', 'scenic', 'sunset', 'sunrise']],
  ['relaxing', /\b(relax\w*|chill\w*|peaceful|quiet|calm|tahimik|picnic|laid back)\b/, ['relax', 'peaceful', 'quiet', 'calm', 'picnic']],
  ['adventure', /\b(adventure\w*|thrill\w*|zip ?lin\w*|canyoning|rappel\w*|cliff jump\w*|extreme)\b/, ['adventure', 'zip', 'canyon', 'rappel', 'cliff']],
  ['wildlife', /\b(wildlife|birds?|bird watching|mangroves?|forest|nature)\b/, ['bird', 'wildlife', 'nature', 'forest', 'mangrove']],
  ['hot spring', /\b(hot springs?)\b/, ['hot spring']],
];
const FOOD_RE = /\b(eat|eating|food|foods|restaurants?|eateries|eatery|carinderia|karenderya|kainan|kain|kaon|kumain|makaon|makakaon|pagkain|lunch|dinner|breakfast|brunch|snacks?|merienda|coffee|cafes?|bakery|bakeries|bread|seafood|delicacy|delicacies|pasalubong|local dish(?:es)?|lami|dining|dine|bar|resto|restobar|grill|turo turo)\b/;
const FOOD_KINDS = [['cafe', /\b(coffee|cafes?)\b/], ['bakery', /\b(bakery|bakeries|bread|pasalubong)\b/], ['seafood', /\b(seafood)\b/], ['restobar', /\b(bar|restobar|drinks?)\b/]];

// ---------- what the question asks about a place ----------
const ASKS = [
  ['cost', /\b(how much|magkano|pila (?:ang|ba)?|presyo|entrance|admission|tickets?|fees?|cost|costs|rates?|bayad|singil|price|prices)\b/],
  ['hours', /\b(opens?|opening|closes?|closing|open (?:on|at|today|daily|sundays?|mondays?)|hours|what time|anong oras|unsa(?:ng)? oras|bukas|sarado|tindahan ba)\b/],
  ['season', /\b(best time|best month|best season|when (?:is|to|should|can)|season|rainy|weather|kailan|kanus ?a|panahon|ulan)\b/],
  ['duration', /\b(how long|how many hours|how many days|duration|hours do i need|gaano katagal|unsa ka tagal|pila ka oras|pila ka adlaw)\b/],
  ['howto', /\b(how (?:do i|to|can i) (?:get|go|reach|travel|commute)|directions?|route to|commute|transport\w*|jeepney|van|bus|ferry|terminal|where is|where's|location of|address|asa (?:man )?(?:ang|na)|nasaan|saan (?:ang|matatagpuan)|unsaon pag ?adto|paano pumunta|paano makarating|far from|layo|how far|malayo)\b/],
  ['bring', /\b(what (?:to|should i) (?:bring|wear|pack)|bring|pack|wear|dalhin|dad-?on|dalhon|isul(?:ud|od))\b/],
  ['safety', /\b(safe|safety|danger\w*|risk\w*|precautions?|ligtas|peligro|delikado|luwas)\b/],
  ['contact', /\b(contact|phone|number|call|email|book(?:ing)?|reserv\w+|guide|tour guide|hotline)\b/],
  ['difficulty', /\b(how (?:hard|difficult|easy|tough|steep)|is it (?:hard|difficult|easy|steep)|difficulty|lisod ba|mahirap ba|hirap ba|gaano kahirap)\b/],
  ['accessibility', /\b(wheelchair|accessible|accessibility|stroller|pwd|elderly|seniors?|lola|lolo)\b/],
  ['nearby', /\b(near|nearby|around|close to|next to|malapit|duol|beside)\b/],
  ['about', /\b(tell me about|what is|what's|describe|about|unsa(?:ng)? ang|ano ang|ano yung|kuwento|storya)\b/],
  ['stay', /\b(hotels?|resorts?|accommodations?|lodging|lodge|hostels?|homestay|airbnb|where to (?:stay|sleep)|matulog|tulogan|pahulayan|overnight stay)\b/],
];
const COMPARE_RE = /\b(compare|comparison|versus|vs|which is better|which one is better|difference between|ihambing|itandi|alin ang mas|hain ang mas)\b/;

const GROUPS = [
  ['family', /\b(famil(?:y|ies)|kids?|child(?:ren)?|toddlers?|babies|baby|bata|anak|pamilya|pamilyang)\b/],
  ['couple', /\b(couples?|honeymoon|romantic|anniversary|mag asawa|magsyota|asawa)\b/],
  ['solo', /\b(solo|alone|by myself|myself|mag isa|isa lang ako|ako ra)\b/],
  ['friends', /\b(friends?|barkada|tropa|group|team|classmates?|officemates?|higala)\b/],
  ['senior', /\b(seniors?|elderly|old folks|old people|lola|lolo|grandparents?|grandma|grandpa|parents|tigulang)\b/],
  ['pwd', /\b(wheelchair|pwd|disabled|disability|stroller|limited mobility)\b/],
];

const GREETING = /^(?:hi|hello|hey|hola|yo|uy|oy|hiya|kumusta|kamusta|musta|mabuhay|good (?:morning|afternoon|evening|day)|magandang (?:umaga|hapon|gabi|araw|tanghali)|maayong (?:buntag|hapon|gabii|adlaw|udto))\b/;
const FILLER = new Set(['po', 'ho', 'there', 'souley', 'guys', 'everyone', 'all', 'ninyo', 'nyo', 'kamo', 'kayo', 'day', 'na', 'sa']);
const THANKS = /\b(thanks?|thank you|thankyou|salamat|daghang salamat|maraming salamat|ty)\b/;
const BYE = /\b(bye|goodbye|see you|paalam|babay|ingat)\b/;
const ABOUT_BOT = /\b(who are you|what are you|what can you do|how do you work|how can you help|help me|can you help|tulong|unsa(?:ng)? imong mahimo|ano ang kaya mo|sino ka|kinsa ka)\b/;
const OFFTOPIC = /\b(python|javascript|code|coding|programming|homework|essay|equation|calculus|stocks?|crypto|bitcoin|politic\w*|president|election|lottery|horoscope|joke|poem|song|lyrics|movie|netflix|girlfriend|boyfriend|sex|porn)\b/;
const TRAVEL = /\b(place|places|spot|spots|visit|visiting|go|going|see|do|things|trip|travel|tour|tourist|beach|beaches|falls|cave|island|church|resort|hike|swim|dive|stay|eat|food|where|what|best|good|nice|fun|recommend|suggest|plan|itinerary|southern leyte|leyte|attractions?|lugar|puntahan|pasyal|adtoan|biyahe|lakaw)\b/;

const ORD = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4, last: -1 };
function parseOrdinals(plain) {
  const out = [];
  const re = /\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\b(?:\s+(?:one|place|spot|option|choice|two|three))?/g;
  let m = re.exec(plain);
  while (m) { out.push(ORD[m[1]]); m = re.exec(plain); }
  const n = plain.match(/\b(?:number|no|option|#)\s?(\d)\b/) || plain.match(/#(\d)/);
  if (n) out.push(Number(n[1]) - 1);
  if (/\bfirst (?:two|2)\b/.test(plain) || /\bboth\b/.test(plain)) out.push(0, 1);
  if (/\bfirst (?:three|3)\b/.test(plain)) out.push(0, 1, 2);
  return [...new Set(out)];
}
const ANAPHORA = /\b(it|its|there|that one|that place|that spot|this one|this place|this spot|these|those|them|they|both|dito|doon|niya|iyan|yan|didto|adto|ana|niini|niana)\b/;

// ---------- naming a place ----------
const GENERIC_NAME = new Set(['falls', 'fall', 'beach', 'cave', 'caves', 'island', 'church', 'park', 'resort', 'shrine', 'national', 'city', 'the', 'of', 'de', 'and', 'marine', 'sanctuary', 'point', 'view', 'river', 'spring', 'springs', 'mountain', 'mt', 'mount', 'bay', 'cathedral', 'plaza', 'bridge', 'town', 'municipal', 'protected', 'landscape', 'seascape', 'eco', 'adventure', 'dive', 'site', 'house', 'old', 'new', 'sa', 'ng']);

/**
 * Which places does the question name? items = [{ id, name }]. A place is named when its full name appears (spelling gaps and dashes
 * ignored: "taglinaw falls" = "Tag-linaw Falls"), or when every distinctive word of its name appears. Words that are only a town
 * ("Sogod" in "Sogod Bay Marine Sanctuary") never count, so "waterfalls in Sogod" does not pick that sanctuary.
 */
function findNamed(question, items = [], towns = []) {
  const plain = plainOf(question);
  const sq = squash(question);
  const toks = new Set(plain.split(' '));
  const townWords = new Set(towns.flatMap((t) => plainOf(t).split(' ')));
  const hits = [];
  items.forEach(({ id, name }) => {
    const full = squash(name);
    if (full.length < 4) return;
    let score = 0;
    if (full.length >= 7 && sq.includes(full)) score = 3;
    else {
      const parts = plainOf(name).split(' ').filter((w) => w.length > 1 || /\d/.test(w));
      const key = parts.filter((w) => !GENERIC_NAME.has(w) && !townWords.has(w));
      const onlyActivityWord = key.length === 1 && ACTIVITIES.some(([, re]) => re.test(key[0]));
      if (key.length && !onlyActivityWord) {
        const joined = key.join('');
        const all = key.every((w) => toks.has(w) || (w.length >= 6 && [...toks].some((t) => t.length >= 5 && distance(t, w, 1) <= 1)));
        if (all || (joined.length >= 7 && sq.includes(joined))) score = 1 + key.length / 10;
      }
    }
    if (score) hits.push({ id, score });
  });
  hits.sort((a, b) => b.score - a.score);
  return hits.length > 4 ? [] : hits; // a word that fits many places is a topic, not a name
}

/**
 * understand(question, { towns, names, hasContext })
 *   towns      municipalities that exist in the database
 *   names      [{ id, name }] of the published places, to spot a place named in the question
 *   hasContext true when an earlier answer in this chat can be pointed at ("how much is it?")
 */
function understand(question = '', { towns = [], names = [], hasContext = false } = {}) {
  const raw = String(question || '').trim();
  const plain = plainOf(raw);
  const tokens = plain ? plain.split(' ') : [];
  const lang = detectLang(plain);
  const has = (re) => re.test(plain);

  // towns and areas
  const areas = Object.entries(AREAS).filter(([, a]) => a.re.test(plain)).map(([name]) => name);
  const plainNoAreas = Object.values(AREAS).reduce((t, a) => t.replace(new RegExp(a.re.source, 'g'), ' '), plain);
  const foundTowns = findTowns(plainNoAreas, towns);
  const dest = foundTowns.filter((t) => !t.from);
  const townNames = dest.map((t) => t.canon);
  const origin = (foundTowns.find((t) => t.from) || {}).canon || null;
  const areaTowns = [...new Set(areas.flatMap((a) => AREAS[a].towns))];
  const mentionsSL = has(/\b(southern leyte|so leyte|sleyte)\b/);

  // what is asked
  const asks = ASKS.filter(([, re]) => re.test(plain)).map(([k]) => k);
  const compare = COMPARE_RE.test(plain);
  const more = has(/\b(more|what else|anything else|something else|else|other|others|another|different|next|ano pa|unsa pa|dugang|ang iba)\b/);
  const acts = ACTIVITIES.filter(([, re]) => re.test(plain));
  const food = FOOD_RE.test(plain);
  const foodKind = (FOOD_KINDS.find(([, re]) => re.test(plain)) || [null])[0];
  const groups = GROUPS.filter(([, re]) => re.test(plain)).map(([k]) => k);

  // days, trip or plain list
  const days = parseDays(plain);
  const planWord = has(/\b(itinerar\w*|plan|plans|planning|schedule|map out|lay out|ipaplano|plano|pagplano|ayusin ang biyahe|day by day)\b/);
  const tripWord = has(/\b(trip|tour|getaway|vacation|escape|holiday|biyahe|lakaw|trail|route)\b/);
  const named = findNamed(raw, names, townNames.length ? [...townNames, ...(towns || [])] : towns);
  const factAsk = asks.some((a) => ['cost', 'hours', 'season', 'duration', 'howto', 'bring', 'safety', 'contact', 'difficulty', 'accessibility', 'stay'].includes(a));
  const durationQuestion = asks.includes('duration') && !planWord;
  const trip = !durationQuestion && (planWord || (days !== null && (tripWord || (!factAsk && !named.length))));

  // limits and taste
  const budget = parseBudget(raw);
  const cheapWord = has(/\b(cheap|cheaper|cheapest|budget friendly|budget|mura|barato|tipid|mubo|affordable|low cost|libre|free|walay bayad)\b/);
  const cheap = cheapWord && (budget === null || has(/\b(cheap|cheaper|cheapest|mura|barato|tipid|mubo|affordable)\b/));
  const pace = has(/\b(relaxed?|slow|chill|easy going|laid back|leisurely|lazy|unhurried|dahan dahan|hinay hinay)\b/) ? 'relaxed'
    : has(/\b(packed|busy|jam packed|as much as possible|maximi[sz]e|fully packed|everything)\b/) ? 'packed'
      : has(/\bbalanced\b/) ? 'balanced' : null;
  let difficulty = null;
  if (!asks.includes('difficulty')) {
    if (has(/\b(easy|beginner|beginners|light hike|not too hard|sayon|dali)\b/)) difficulty = 'easy';
    else if (has(/\b(challenging|hard|difficult|extreme|tough|strenuous|lisod|mahirap)\b/)) difficulty = 'hard';
    else if (has(/\bmoderate\b/)) difficulty = 'moderate';
  }
  const accessibility = groups.includes('senior') || groups.includes('pwd') || asks.includes('accessibility') || has(/\b(easy access|accessible|walkable|short walk)\b/);
  const rank = has(/\b(cheapest|lowest price|pinakamura|labing barato)\b/) ? 'cheap'
    : has(/\b(hidden|offbeat|off the beaten|less crowded|secret|undiscovered)\b/) ? 'hidden'
      : has(/\b(best|top|most popular|famous|must see|must visit|highest rated|recommended|pinakamaganda|pinakamaayo|labing nindot)\b/) ? 'best' : null;
  const cm = plain.match(new RegExp(`\\b(?:top|best)\\s+${NUMRE}\\b`)) || plain.match(new RegExp(`\\b${NUMRE}\\s+(?:best|top|places|spots|beaches|waterfalls|falls|restaurants|cafes|caves|islands|things|ideas)\\b`));
  const count = cm && toNum(cm[1]) >= 1 && toNum(cm[1]) <= 8 ? toNum(cm[1]) : null;
  const tm = plain.match(/\b(?:family|group|party|team)\s+of\s+(\d{1,3})\b/) || plain.match(/\b(\d{1,3})\s?(?:pax|people|persons|adults|katao|ka tawo)\b/) || plain.match(/\bwe are (\d{1,3})\b/) || plain.match(/\bfor (\d{1,3})(?!\s?(?:days?|nights?|hours?|araw|adlaw|k\b|pesos?))\b/);
  const travelers = tm ? Number(tm[1]) : null;

  // words used to look in the spot records (the database is in English, the visitor may not be)
  const actWords = acts.flatMap(([, , w]) => w);
  const month = parseMonth(plain);
  const iso = raw.match(/\b(20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\b/);

  const topical = !!(townNames.length || areas.length || acts.length || food || asks.some((a) => a !== 'about' && a !== 'nearby') || trip || days !== null || groups.length || named.length || budget !== null || month || difficulty);
  const wordCount = tokens.length;
  let smalltalk = null;
  if (!topical) {
    if (GREETING.test(plain) && plain.replace(GREETING, ' ').split(' ').filter((t) => t && !FILLER.has(t)).length <= 1) smalltalk = 'greeting';
    else if (THANKS.test(plain) && wordCount <= 8) smalltalk = 'thanks';
    else if (BYE.test(plain) && wordCount <= 5) smalltalk = 'bye';
    else if (ABOUT_BOT.test(plain) && wordCount <= 9) smalltalk = 'about';
    else if (OFFTOPIC.test(plain)) smalltalk = 'offtopic';
    else if (OUTSIDE.test(plain) && !mentionsSL) smalltalk = 'offarea';
  } else if (!townNames.length && !named.length && !mentionsSL && OUTSIDE.test(plain) && !asks.includes('howto')) {
    smalltalk = 'offarea';
  } else if (ABOUT_BOT.test(plain) && wordCount <= 5 && !acts.length && !townNames.length) {
    smalltalk = 'about';
  }
  const unclear = !smalltalk && !topical && !TRAVEL.test(plain) && !hasContext;

  // pointing back at an earlier answer
  const ordinals = hasContext ? parseOrdinals(plain) : [];
  // "make it cheaper" does not point at a place
  const anaphora = hasContext && (ANAPHORA.test(plain.replace(/\b(make|made|let|take|keep) it\b/g, ' ')) || ordinals.length > 0);
  const subjectless = !townNames.length && !acts.length && !food && !named.length && !trip;

  return {
    lang, raw, plain, wordCount,
    smalltalk, unclear,
    trip: !!trip, tripWord, planWord, days: days === null ? null : Math.max(1, Math.min(50, days)), pace,
    budget, cheap, rank, count, travelers,
    towns: townNames, origin, municipality: townNames.length === 1 ? townNames[0] : null, areas, areaTowns,
    activities: acts.map(([k]) => k), food, foodKind,
    groups, difficulty, accessibility, month, startDate: iso ? iso[1] : null,
    asks, compare, factAsk, more,
    named, ordinals, anaphora, subjectless,
    words: [...new Set(actWords)],
    topical,
  };
}

module.exports = { understand, findNamed, detectLang, distance, plainOf, squash, ACTIVITIES };
