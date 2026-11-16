// Opening days and best months for a spot, in one place so the importer, the model and the trip planner agree.
//   openDays   -> ['Mon','Tue',...]   empty = open every day (or unknown)
//   bestMonths -> [1..12]             empty = good all year (or unknown)
// Both accept the forms people type into a spreadsheet: lists, "Mon-Sat", "Mon to Sat, Sun", "weekdays", "Nov-Feb", "all year".
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ALL = /^(daily|every ?day|all (week|year|year round)|year[- ]?round|any ?time|always|n\/?a|none|-)?$/;

const indexOf = (names, token) => {
  const t = token.trim().toLowerCase().replace(/\.$/, '');
  if (!t) return -1;
  return names.findIndex((n) => t === n.toLowerCase() || (t.length >= 3 && t.startsWith(n.toLowerCase())));
};

// "Mon-Sat" -> [1..6]; wraps ("Nov-Feb" -> 10,11,0,1) when the range runs past the end of the list
const range = (a, b, size) => {
  const out = [];
  for (let i = a; ; i = (i + 1) % size) { out.push(i); if (i === b || out.length > size) break; }
  return out;
};

function parse(input, names, offset, groups = {}) {
  if (input == null) return [];
  const tokens = Array.isArray(input) ? input : String(input).split(/[,;/&]|\band\b/i);
  const seen = new Set();
  for (const raw of tokens) {
    if (typeof raw === 'number') {
      const i = raw - offset;
      if (Number.isInteger(i) && i >= 0 && i < names.length) seen.add(i);
      continue;
    }
    const text = String(raw).trim().toLowerCase();
    if (/^\d+$/.test(text)) { const i = Number(text) - offset; if (i >= 0 && i < names.length) seen.add(i); continue; }
    if (groups[text]) { groups[text].forEach((i) => seen.add(i)); continue; }
    const parts = text.split(/\s*(?:-|–|—|\bto\b|\bthrough\b|\bthru\b)\s*/);
    if (parts.length === 2) {
      const a = indexOf(names, parts[0]);
      const b = indexOf(names, parts[1]);
      if (a >= 0 && b >= 0) range(a, b, names.length).forEach((i) => seen.add(i));
      continue;
    }
    const i = indexOf(names, text);
    if (i >= 0) seen.add(i);
  }
  return [...seen];
}

const allWords = (input) => !Array.isArray(input) && ALL.test(String(input ?? '').trim().toLowerCase());

function normalizeDays(input) {
  if (allWords(input)) return [];
  const idx = parse(input, DAYS, 0, { weekdays: [1, 2, 3, 4, 5], weekends: [0, 6], weekday: [1, 2, 3, 4, 5], weekend: [0, 6] });
  if (idx.length === 7) return [];
  // week order Mon..Sun reads best
  return idx.sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((i) => DAYS[i]);
}

function normalizeMonths(input) {
  if (allWords(input)) return [];
  const idx = parse(input, MONTHS, 1);
  if (idx.length === 12) return [];
  return idx.sort((a, b) => a - b).map((i) => i + 1);
}

const dayIndexes = (spot) => normalizeDays(spot?.openDays).map((d) => DAYS.indexOf(d));

// weekday: 0 = Sunday (Date#getUTCDay)
const isOpenOn = (spot, weekday) => {
  const days = dayIndexes(spot);
  return !days.length || days.includes(weekday);
};

// month: 1-12
const inSeason = (spot, month) => {
  const months = normalizeMonths(spot?.bestMonths);
  return !months.length || months.includes(month);
};

// the set of months (1-12) a trip touches; null when there is no usable start date
function tripMonths(startDate, days = 1) {
  const start = new Date(startDate);
  if (!startDate || Number.isNaN(start.getTime())) return null;
  const out = new Set();
  for (let i = 0; i < Math.max(1, days); i += 1) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.add(d.getUTCMonth() + 1);
  }
  return out;
}

// [1,2,3,4] -> "Jan–Apr"; [11,12,1] -> "Nov–Jan"; [1,3,5] -> "Jan, Mar, May"
function compress(indexes, names, circular) {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b);
  if (!sorted.length) return '';
  let runs = [];
  sorted.forEach((i) => {
    const last = runs[runs.length - 1];
    if (last && i === last[last.length - 1] + 1) last.push(i);
    else runs.push([i]);
  });
  if (circular && runs.length > 1 && sorted[0] === 0 && sorted[sorted.length - 1] === names.length - 1) {
    const tail = runs.pop();
    runs[0] = [...tail, ...runs[0]];
  }
  return runs.map((r) => (r.length >= 3 ? `${names[r[0]]}–${names[r[r.length - 1]]}` : r.map((i) => names[i]).join(', '))).join(', ');
}

const daysLabel = (spot) => {
  const idx = normalizeDays(spot?.openDays).map((d) => (DAYS.indexOf(d) + 6) % 7); // Mon = 0
  const mon = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return compress(idx, mon, false);
};
const monthsLabel = (spot) => compress(normalizeMonths(spot?.bestMonths).map((m) => m - 1), MONTHS, true);

module.exports = { DAYS, MONTHS, normalizeDays, normalizeMonths, isOpenOn, inSeason, tripMonths, daysLabel, monthsLabel };
