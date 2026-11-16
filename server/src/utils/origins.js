// CLIENT_URL may hold one site or several, separated by commas. People often paste a trailing slash or a space,
// and the browser's Origin header never has one, so CORS would silently fail. Clean each entry here.
const parseOrigins = (value, fallback = 'http://localhost:5173') =>
  String(value || fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

module.exports = { parseOrigins };
