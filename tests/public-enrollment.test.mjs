import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { publicClientStore } from '../backend/public-clients.mjs';
import { createBackend } from '../backend/server.mjs';
import { activateBeta } from '../plugin/lib/beta-client.mjs';

test('public enrollment needs no invite and cannot reset allowance by re-enrolling or restarting', async t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-free-'));
  const clients = path.join(dir, 'clients.json'); writeFileSync(clients, '[]', { mode: 0o600 });
  let calls = 0, server;
  const env = { VOICE_STATE_DIR: dir, VOICE_CLIENTS_FILE: clients, VOICE_PUBLIC_ENROLLMENT: 'true', VOICE_PUBLIC_CLIENT_DAILY_LIMIT: '1' };
  async function start() {
    server = createBackend(env, { isReady: () => true, prepareVoice: async () => { calls++; return Response.json({ schema: 'prompt-ai-voice/1', optimized: '请保留原意', fallback: false }); } });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
  }
  async function stop() { server.closeAllConnections(); await new Promise(r => server.close(r)); }
  t.after(async () => { await stop(); rmSync(dir, { recursive: true, force: true }); });
  await start();
  const request = (route, body, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const credential = randomBytes(32).toString('base64url');
  assert.equal((await request('/client/enroll', { credential }, { origin: 'https://unknown.invalid' })).status, 403);
  assert.equal((await request('/client/enroll', {})).status, 400);
  const registration = await (await request('/client/enroll', { credential })).json();
  assert.equal(registration.plan, 'free'); assert.equal(registration.activated, true);
  const headers = { authorization: `Bearer ${credential}` };
  assert.equal((await request('/voice/prepare', { prompt: '请保留原意', mode: 'clean' }, headers)).status, 200);
  await stop(); await start();
  assert.equal((await (await request('/client/enroll', { credential })).json()).id, registration.id);
  assert.equal((await request('/voice/prepare', { prompt: '请保留原意', mode: 'clean' }, headers)).status, 429);
  assert.equal(calls, 1);
  const saved = readFileSync(path.join(dir, 'public-clients.json'), 'utf8');
  for (const value of [credential, '127.0.0.1', '请保留原意']) assert.ok(!saved.includes(value));
});

test('revocation persists, forged credentials fail, and enrollment has persistent network limits', t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-free-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'public.json'), store = publicClientStore(file);
  const credential = randomBytes(32).toString('base64url'), digest = createHash('sha256').update(credential).digest('hex');
  assert.equal(store.enroll({ credential }, '192.0.2.1').status, 200);
  assert.equal(store.authenticate(digest).dailyLimit, 30);
  assert.equal(store.authenticate('0'.repeat(64)), undefined);
  const state = JSON.parse(readFileSync(file)); state.clients[0].enabled = false; writeFileSync(file, JSON.stringify(state), { mode: 0o600 });
  assert.equal(store.authenticate(digest), undefined);
  assert.equal(store.enroll({ credential }, '192.0.2.1').status, 403);
  for (let i = 0; i < 99; i++) assert.equal(store.enroll({ credential: randomBytes(32).toString('base64url') }, '192.0.2.1').status, 200);
  assert.equal(publicClientStore(file).enroll({ credential: randomBytes(32).toString('base64url') }, '192.0.2.1').status, 429);
  assert.equal(store.enroll({ credential: randomBytes(32).toString('base64url') }, '192.0.2.2').status, 200);
});

test('free desktop setup selects the public origin and saves only a keychain reference after real verification', async () => {
  const config = { provider: 'omp', betaServiceUrl: 'http://127.0.0.1:18788', apiKeyFile: '/private/publisher-key', speechLanguage: 'en' };
  const input = { credential: randomBytes(32).toString('base64url'), keychainAccount: 'a'.repeat(64) };
  const original = { ...config };
  await assert.rejects(activateBeta(config, input, { free: true, verify: async () => { throw new Error('offline'); }, persist: () => assert.fail() }), /offline/);
  assert.deepEqual(config, original);
  let saved;
  await activateBeta(config, input, { free: true, verify: async c => assert.equal(c.baseUrl, 'https://api.voiceprompt.work'), persist: async c => { saved = c; } });
  assert.equal(saved.hostedFree, true); assert.equal(saved.betaServiceUrl, 'https://api.voiceprompt.work');
  assert.equal(saved.apiKeyFile, undefined); assert.equal(saved.speechLanguage, 'en');
  assert.ok(!JSON.stringify(saved).includes(input.credential)); delete process.env.VOICE_PROMPT_BETA_TOKEN;
});
