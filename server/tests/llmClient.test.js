require('./setup');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chatJSON } = require('../src/services/llmClient');

const realFetch = global.fetch;
const realError = console.error;
const KEYS = ['AI_API_KEY', 'AI_MODEL', 'AI_FALLBACK_MODELS', 'AI_MAX_RETRIES', 'AI_TIMEOUT_MS', 'AI_TOTAL_MS', 'AI_RETRY_BASE_MS'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

const setup = (env = {}) => {
  KEYS.forEach((k) => { delete process.env[k]; });
  process.env.AI_API_KEY = 'secret-key';
  process.env.AI_MODEL = 'a';
  process.env.AI_RETRY_BASE_MS = '0';
  Object.assign(process.env, env);
  console.error = () => {};
};
const done = () => {
  global.fetch = realFetch;
  console.error = realError;
  KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
};
const guard = (fn) => async () => { try { await fn(); } finally { done(); } };

const ok = (content) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }) });
const fail = (status, retryAfter) => ({ ok: false, status, headers: { get: (h) => (h === 'retry-after' ? retryAfter ?? null : null) }, json: async () => ({}) });
// script: one response (or Error) per call, in order; records the model each call asked for
const script = (steps) => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(JSON.parse(opts.body).model);
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return typeof step === 'function' ? step(opts) : step;
  };
  return calls;
};

test('a 429 is retried and the answer comes from the same model', guard(async () => {
  setup();
  const calls = script([fail(429), ok({ answer: 'hi' })]);
  assert.deepEqual(await chatJSON([]), { answer: 'hi' });
  assert.deepEqual(calls, ['a', 'a']);
}));

test('5xx and network errors are retried', guard(async () => {
  setup();
  const calls = script([fail(503), new TypeError('fetch failed'), fail(502), ok({ x: 1 })]);
  setup({ AI_MAX_RETRIES: '3' });
  assert.deepEqual(await chatJSON([]), { x: 1 });
  assert.equal(calls.length, 4);
}));

test('retry-after is honored, backoff grows, and one wait never exceeds 10 seconds', guard(async () => {
  setup({ AI_RETRY_BASE_MS: '100', AI_MAX_RETRIES: '3', AI_TOTAL_MS: '600000' });
  script([fail(429, '2'), fail(500), fail(429, '120'), ok({})]);
  const waits = [];
  await chatJSON([], { sleep: async (ms) => { waits.push(ms); } });
  assert.equal(waits[0], 2000); // retry-after: 2 seconds
  assert.ok(waits[1] >= 100 && waits[1] <= 200, `backoff ${waits[1]}`); // base * 2^1 with jitter 50-100%
  assert.equal(waits[2], 10000); // retry-after: 120 is cut to the 10 s cap
}));

test('after the retries run out it moves to the next model, in order, then stops', guard(async () => {
  setup({ AI_FALLBACK_MODELS: 'b, c' });
  const calls = script([fail(500)]);
  await assert.rejects(chatJSON([]), /AI provider 500/);
  assert.deepEqual(calls, ['a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'c']); // 1 try + 2 retries each
}));

test('a fallback model answers when the first is rate limited', guard(async () => {
  setup({ AI_FALLBACK_MODELS: 'b' });
  const calls = script([(o) => (JSON.parse(o.body).model === 'a' ? fail(429) : ok({ from: 'b' }))]);
  assert.deepEqual(await chatJSON([]), { from: 'b' });
  assert.deepEqual(calls, ['a', 'a', 'a', 'b']);
}));

test('401 and 403 stop at once: no retry, no other model', guard(async () => {
  for (const status of [401, 403]) {
    setup({ AI_FALLBACK_MODELS: 'b' });
    const calls = script([fail(status)]);
    await assert.rejects(chatJSON([]), new RegExp(String(status)));
    assert.deepEqual(calls, ['a']);
  }
}));

test('a 400 is not retried but the next model still gets a try', guard(async () => {
  setup({ AI_FALLBACK_MODELS: 'b' });
  const calls = script([fail(400), ok({ ok: true })]);
  assert.deepEqual(await chatJSON([]), { ok: true });
  assert.deepEqual(calls, ['a', 'b']);
}));

test('an answer that is not JSON is not retried on the same model', guard(async () => {
  setup({ AI_FALLBACK_MODELS: 'b' });
  const bad = { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) };
  const calls = script([bad, ok({ fine: 1 })]);
  assert.deepEqual(await chatJSON([]), { fine: 1 });
  assert.deepEqual(calls, ['a', 'b']);
}));

test('a timeout aborts the attempt and is retried', guard(async () => {
  setup({ AI_TIMEOUT_MS: '20', AI_MAX_RETRIES: '1' });
  const hang = (o) => new Promise((_, reject) => o.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  const calls = script([hang, ok({ late: false })]);
  assert.deepEqual(await chatJSON([]), { late: false });
  assert.equal(calls.length, 2);
}));

test('it stops retrying when the total time limit would pass', guard(async () => {
  setup({ AI_RETRY_BASE_MS: '5000', AI_TOTAL_MS: '1000', AI_FALLBACK_MODELS: 'b' });
  const calls = script([fail(500)]);
  let slept = 0;
  await assert.rejects(chatJSON([], { sleep: async () => { slept += 1; } }), /AI provider 500/);
  assert.equal(slept, 0); // a 2.5-5 s wait does not fit in 1 s
  assert.ok(calls.length <= 2);
}));

test('the key is sent as a header and the prompt never reaches the logs', guard(async () => {
  setup();
  const logged = [];
  console.error = (...a) => logged.push(a.join(' '));
  let header;
  script([fail(500), (o) => { header = o.headers.Authorization; return ok({}); }]);
  await chatJSON([{ role: 'user', content: 'my private prompt' }]);
  assert.equal(header, 'Bearer secret-key');
  assert.ok(logged.length > 0);
  assert.ok(!logged.join('\n').includes('secret-key') && !logged.join('\n').includes('private prompt'));
}));
