// Date helpers for the Experience page almanac. Pure functions, so they are easy to test.
// Everything works on the visitor's LOCAL calendar day (a day starts at local midnight).

const DAY = 86400000;

// Whole days since 1 Jan 1970 for the local calendar day of `date` (DST-proof: built from y/m/d, not from the clock).
export function localDayNumber(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
}

// The entry of the day: the same entry all day long, a different one tomorrow, and it cycles through every entry.
export function entryOfTheDay(facts, date = new Date()) {
  if (!facts.length) return null;
  return facts[((localDayNumber(date) % facts.length) + facts.length) % facts.length];
}

// The next `limit` calendar dates on or after today, soonest first.
// Each result: { ...item, daysAway (0 = today), year (the year it falls on next), yearsOn (years since the original year) }.
export function upcomingDates(calendar, date = new Date(), limit = 3) {
  const today = localDayNumber(date);
  const y = date.getFullYear();
  return calendar
    .map((c) => {
      let year = y;
      let n = Math.floor(Date.UTC(year, c.m - 1, c.d) / DAY);
      if (n < today) { year += 1; n = Math.floor(Date.UTC(year, c.m - 1, c.d) / DAY); }
      return { ...c, year, daysAway: n - today, yearsOn: year - c.y };
    })
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, limit);
}
