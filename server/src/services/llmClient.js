// One place for every call to the AI provider (OpenAI-compatible /chat/completions).
// - every attempt has a timeout, and the whole call has a total time limit (a visitor is waiting)
// - retries only what can pass: HTTP 429, 500, 502, 503, 504, 529, network errors and timeouts
//   (with exponential backoff + jitter, and the provider's retry-after header when it sends one)
// - 401 / 403 stop at once (a bad key will not get better); other 4xx skip to the next model without retrying
// - after the retries, tries the next model in AI_FALLBACK_MODELS (same provider and key, no new account needed)
// - when everything fails it throws, and the caller falls back to the database-only answer
// Logs the model and the reason, never the key or the prompt.
const RETRYABLE = new Set([429, 500, 502, 503, 504, 529]);
const MAX_WAIT_MS = 10000; // never sit on a retry-after longer than this

const num = (v, d) => { const n = Number(v); return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? n : d; };
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function config(env = process.env) {
  const main = env.AI_MODEL || 'gpt-4o-mini';
  const extra = (env.AI_FALLBACK_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  return {
    key: env.AI_API_KEY,
    base: (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    models: [...new Set([main, ...extra])],
    retries: Math.floor(num(env.AI_MAX_RETRIES, 2)), // retries per model, so 3 attempts by default
    baseMs: num(env.AI_RETRY_BASE_MS, 500),
    timeoutMs: num(env.AI_TIMEOUT_MS, 30000),
    totalMs: num(env.AI_TOTAL_MS, 60000),
  };
}

// retry-after is seconds or an HTTP date
function retryAfterMs(value) {
  if (value === undefined || value === null || value === '') return null;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

async function attempt(cfg, model, messages) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    let res;
    try {
      res = await fetch(`${cfg.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({ model, temperature: 0.3, response_format: { type: 'json_object' }, messages }),
        signal: ctrl.signal,
      });
    } catch (e) {
      throw Object.assign(new Error(e?.name === 'AbortError' ? 'timeout' : 'network error'), { retryable: true });
    }
    if (!res.ok) {
      throw Object.assign(new Error(`AI provider ${res.status}`), {
        status: res.status,
        retryable: RETRYABLE.has(res.status),
        retryAfter: retryAfterMs(res.headers?.get?.('retry-after')),
      });
    }
    const body = await res.json();
    return JSON.parse(body.choices[0].message.content); // a bad answer is not retried; the next model gets a go
  } finally {
    clearTimeout(timer);
  }
}

async function chatJSON(messages, { sleep = defaultSleep } = {}) {
  const cfg = config();
  const deadline = Date.now() + cfg.totalMs;
  let last;
  for (let m = 0; m < cfg.models.length; m += 1) {
    const model = cfg.models[m];
    for (let n = 0; n <= cfg.retries; n += 1) {
      try {
        const out = await attempt(cfg, model, messages);
        if (m > 0 || n > 0) console.error(`AI: answered by ${model} after ${n} retr${n === 1 ? 'y' : 'ies'} on it${m > 0 ? ` and ${m} model switch${m === 1 ? '' : 'es'}` : ''}`);
        return out;
      } catch (err) {
        last = err;
        if (err.status === 401 || err.status === 403) throw err; // key problem: other models will fail the same way
        if (!err.retryable) { console.error(`AI: ${model} failed (${err.message}), not retrying`); break; }
        if (n === cfg.retries) { console.error(`AI: ${model} failed (${err.message}), out of retries`); break; }
        const jitter = 0.5 + Math.random() * 0.5;
        const wait = Math.min(err.retryAfter ?? cfg.baseMs * 2 ** n * jitter, MAX_WAIT_MS);
        if (Date.now() + wait >= deadline) { console.error(`AI: ${model} failed (${err.message}), no time left to retry`); break; }
        console.error(`AI: ${model} failed (${err.message}), retrying in ${Math.round(wait)}ms`);
        await sleep(wait);
      }
    }
    if (Date.now() >= deadline) break;
  }
  throw last;
}

module.exports = { chatJSON, config };
