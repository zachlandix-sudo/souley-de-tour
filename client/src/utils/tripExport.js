import { fmtDuration } from './timeline';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Opens a print-ready guide; the browser's "Save as PDF" makes the file. No extra library needed.
export function exportTripGuide(items, { title = 'My Southern Leyte trip' } = {}) {
  if (!items.length) return false;
  const w = window.open('', '_blank');
  if (!w) return false;
  const rows = items.map((i, n) => `
    <li><div class="t">${esc(i.start)}<small>${esc(i.end)}</small></div>
    <div><h2>${n + 1}. ${esc(i.name)}</h2><p>${esc(i.municipality || '')}</p>
    <p class="m">${esc(fmtDuration(i.minutes))}${i.travelBefore ? ` · ${i.travelBefore} min travel before` : ''}</p></div></li>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>body{font-family:Segoe UI,Arial,sans-serif;color:#1a2a30;max-width:720px;margin:32px auto;padding:0 16px}
  h1{color:#0b2e3a;margin-bottom:4px}.sub{color:#12566b;margin-top:0}ol{list-style:none;padding:0;border-left:3px solid #1f8a7a;margin-left:48px}
  li{display:flex;gap:16px;position:relative;padding:0 0 22px 20px}li:before{content:"";position:absolute;left:-9px;top:4px;width:12px;height:12px;border-radius:50%;background:#f2b84b;border:2px solid #0b2e3a}
  .t{position:absolute;left:-76px;width:58px;text-align:right;font-weight:700}.t small{display:block;font-weight:400;color:#667}
  h2{font-size:18px;margin:0}p{margin:2px 0}.m{color:#12566b;font-size:13px}</style></head>
  <body><h1>${esc(title)}</h1><p class="sub">SOULEY de Tour · ${items.length} stop${items.length > 1 ? 's' : ''}</p><ol>${rows}</ol>
  <script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
  return true;
}
