// CSV for the admin exports. UTF-8 with a BOM so Excel shows Filipino / Bisaya letters correctly, CRLF line ends (RFC 4180).
const BOM = '\uFEFF';
// A cell that starts with = + - @ (or a tab / CR) can run as a formula when the file is opened in Excel or Sheets.
// Visitors type reviews and names, so those cells get a leading apostrophe. Real numbers are left alone (-5 stays -5).
const FORMULA = /^[=+\-@\t\r]/;

function cell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  let s = v instanceof Date ? (Number.isNaN(v.getTime()) ? '' : v.toISOString()) : Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== '').join('; ') : String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// columns: [{ header: 'Name', value: (row) => row.name }]
function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(c.value(r))).join(','));
  return BOM + [head, ...body].join('\r\n') + '\r\n';
}

module.exports = { toCsv, cell, BOM };
