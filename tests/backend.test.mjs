import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createBackend, tokenHash } from '../backend/server.mjs';

async function fixture(t, extra = {}, upstream) {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-backend-test-'));
  const key = 'test-client-token-'.repeat(4);
  const clients = path.join(dir, 'clients.json');
  writeFileSync(clients, JSON.stringify([{ id: 'tester', tokenHash: tokenHash(key), dailyLimit: 10 }]));
  const env = { VOICE_STATE_DIR: dir, VOICE_CLIENTS_FILE: clients, VOICE_MODEL_ENABLED: 'true', MINIMAX_API_KEY: 'mock-only', MINIMAX_BASE_URL: 'https://api.minimax.cn/v1', MINIMAX_MODEL: 'MiniMax-M3', ...extra };
  let calls = 0, captured;
  const model = async (...args) => { calls++; captured = args; return upstream ? upstream(...args) : Response.json({ choices: [{ message: { content: '请检查登录页，不要改数据库。' } }] }); };
  let server, base;
  async function start() { server = createBackend(env, { fetchModel: model }); server.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`; }
  async function stop() { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  await start();
  t.after(async () => { await stop(); rmSync(dir, { recursive: true, force: true }); });
  return { dir, env, get calls() { return calls; }, get captured() { return captured; },
    restart: async () => { await stop(); await start(); },
    request: (route = '/voice/prepare', options = {}) => fetch(base + route, { method: 'POST', body: JSON.stringify({ prompt: '嗯请检查登录页，不要改数据库。', mode: 'agent' }), ...options, headers: { 'content-type': 'application/json', authorization: `Bearer ${key}`, ...options.headers } }),
  };
}

test('cloud backend requires client authentication; never invokes upstream for invalid requests', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/voice/prepare', { headers: { authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await f.request('/voice/prepare', { headers: { origin: 'https://attacker.test' } })).status, 403);
  assert.equal((await f.request('/voice/prepare', { body: '{}' })).status, 400);
  assert.equal((await f.request('/voice/prepare', { body: JSON.stringify({ prompt: 'a'.repeat(70000) }) })).status, 413);
  assert.equal(f.calls, 0);
  const response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal((await response.json()).fallback, false);
  assert.equal(f.calls, 1);
  assert.equal(f.captured[0], 'https://api.minimax.cn/v1/chat/completions');
  const payload = JSON.parse(f.captured[1].body);
  assert.equal(payload.model, 'MiniMax-M3');
  assert.equal(payload.reasoning_split, true);
  assert.equal(payload.thinking.type, 'disabled');
  assert.equal(f.captured[1].redirect, 'error');
  const state = readFileSync(path.join(f.dir, 'usage.json'), 'utf8');
  assert.doesNotMatch(state, /登录页|mock-only|test-client-token/);
});

test('service can be healthy without enabling paid model calls', async t => {
  const f = await fixture(t, { VOICE_MODEL_ENABLED: 'false' });
  assert.equal((await f.request('/healthz', { method: 'GET', body: undefined })).status, 200);
  const readiness = await f.request('/readyz', { method: 'GET', body: undefined });
  assert.equal(readiness.status, 503);
  assert.equal((await readiness.json()).ready, false);
  assert.equal((await f.request()).status, 503);
  assert.equal(f.calls, 0);
});

test('shared quota persists across restart, including failed upstream attempts', async t => {
  const f = await fixture(t, { VOICE_GLOBAL_MONTHLY_LIMIT: '1' }, async () => { throw new Error('mock failure'); });
  assert.equal((await f.request()).status, 502);
  await f.restart();
  const exhausted = await f.request();
  assert.equal(exhausted.status, 429);
  assert.equal((await exhausted.json()).error, 'quota_exhausted');
  assert.equal(f.calls, 1);
});

test('per-user rate limit prevents repeated model calls', async t => {
  const f = await fixture(t, { VOICE_PER_MINUTE: '1' });
  assert.equal((await f.request()).status, 200);
  const limited = await f.request();
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, 'rate_limit');
  assert.equal(f.calls, 1);
});

test('only one active upstream request per user; slots released on completion', async t => {
  let release, started;
  const began = new Promise(r => { started = r; });
  const f = await fixture(t, {}, async () => { started(); return new Promise(r => { release = () => r(Response.json({ choices: [{ message: { content: '请检查登录页，不要改数据库。' } }] })); }); });
  const first = f.request();
  await began;
  const second = await f.request();
  assert.equal(second.status, 429);
  assert.equal((await second.json()).error, 'busy');
  release(); assert.equal((await first).status, 200);
  assert.equal(f.calls, 1);
});
