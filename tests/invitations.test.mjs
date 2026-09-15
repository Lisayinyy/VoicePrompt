import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createBackend } from '../backend/server.mjs';
import { makeInvitationBatch, invitationStore } from '../backend/invites.mjs';
import { activateBeta, betaBase } from '../plugin/lib/beta-client.mjs';

async function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'vp-invites-'));
  let clock = Date.now(), modelCalls = 0;
  const batch = makeInvitationBatch(20, { now: clock, dailyLimit: 1 });
  const file = path.join(dir, 'invitations.json');
  writeFileSync(file, JSON.stringify(batch.records), { mode: 0o600 });
  writeFileSync(path.join(dir, 'clients.json'), '[]', { mode: 0o600 });
  const start = async () => {
    const server = createBackend({ VOICE_STATE_DIR: dir, VOICE_CLIENTS_FILE: path.join(dir, 'clients.json'), VOICE_INVITATIONS_FILE: file }, {
      now: () => clock, isReady: () => true, prepareVoice: async () => { modelCalls++; return Response.json({ schema: 'prompt-ai-voice/1', optimized: '请整理想法', fallback: false }); },
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening'); return server;
  };
  let server = await start();
  const stop = async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); };
  t.after(async () => { await stop(); rmSync(dir, { recursive: true, force: true }); });
  const request = (route, data, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}` + route, {
    method: data === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  return { file, batch, request, get calls() { return modelCalls; }, credential: () => randomBytes(32).toString('base64url'),
    restart: async () => { await stop(); server = await start(); }, advance: n => { clock += n; } };
}
test('20 unique invitations: atomic redemption, replay recovery, device binding and persistent authentication', async t => {
  const f = await fixture(t), code = f.batch.codes[0], credential = f.credential();
  assert.equal(new Set(f.batch.codes).size, 20);
  const results = await Promise.all([f.request('/beta/redeem', { code, credential }), f.request('/beta/redeem', { code: code.toLowerCase().replaceAll('-', ' '), credential })]);
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  assert.equal((await f.request('/beta/redeem', { code, credential: f.credential() })).status, 409);
  assert.equal((await f.request('/beta/redeem', { code: f.batch.codes[1], credential })).status, 409);
  assert.equal((await f.request('/voice/prepare', { prompt: '请整理想法', mode: 'agent' })).status, 401);
  await f.restart();
  const headers = { authorization: `Bearer ${credential}` };
  assert.equal((await f.request('/readyz', undefined, headers)).status, 200);
  assert.equal((await f.request('/voice/prepare', { prompt: '请整理想法', mode: 'agent' }, headers)).status, 200);
  assert.equal((await f.request('/voice/prepare', { prompt: '请整理想法', mode: 'agent' }, headers)).status, 429);
  assert.equal(f.calls, 1);
  const state = readFileSync(f.file, 'utf8');
  for (const code of f.batch.codes) assert.ok(!state.includes(code));
  assert.ok(!state.includes(credential));
});
test('revocation, redemption expiry and entitlement expiry fail closed without model requests', async t => {
  const f = await fixture(t), credential = f.credential(), code = f.batch.codes[0];
  await f.request('/beta/redeem', { code, credential });
  f.advance(8 * 86400000);
  assert.equal((await f.request('/beta/redeem', { code: f.batch.codes[1], credential: f.credential() })).status, 410);
  assert.equal((await f.request('/beta/redeem', { code, credential })).status, 200); // redeemed device recovers after code expiry
  f.advance(23 * 86400000);
  assert.equal((await f.request('/readyz', undefined, { authorization: `Bearer ${credential}` })).status, 401);
  assert.equal((await f.request('/beta/redeem', { code, credential })).status, 403);
  assert.equal(f.calls, 0);
});
test('invitation endpoint rejects browser, malformed/oversized requests and brute-force attempts', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/beta/redeem', {}, { origin: 'https://evil.test' })).status, 403);
  assert.equal((await f.request('/beta/redeem', { code: 'x'.repeat(5000) })).status, 413);
  for (let i = 0; i < 9; i++) assert.equal((await f.request('/beta/redeem', {})).status, 400);
  assert.equal((await f.request('/beta/redeem', {})).status, 429);
  assert.equal(f.calls, 0);
});
test('revoked device is rejected immediately without restarting the backend', async t => {
  const f = await fixture(t), credential = f.credential();
  await f.request('/beta/redeem', { code: f.batch.codes[0], credential });
  const rows = JSON.parse(readFileSync(f.file)); rows[0].enabled = false;
  writeFileSync(f.file, JSON.stringify(rows), { mode: 0o600 });
  assert.equal((await f.request('/readyz', undefined, { authorization: `Bearer ${credential}` })).status, 401);
});
test('activation saves no credential; failed live verification preserves the previous provider', async () => {
  const original = { provider: 'omp', model: 'user-model', apiKeyFile: '/private/existing-key', speechLanguage: 'en', betaServiceUrl: 'http://127.0.0.1:18788' };
  const config = { ...original }, credential = randomBytes(32).toString('base64url'), input = { credential, keychainAccount: 'a'.repeat(64) };
  await assert.rejects(activateBeta(config, input, { verify: async () => { throw new Error('model offline'); }, persist: () => assert.fail('must not save') }), /offline/);
  assert.deepEqual(config, original);
  let persisted;
  const result = await activateBeta(config, input, { verify: async c => { assert.equal(process.env[c.apiKeyEnv], credential); }, persist: async c => { persisted = c; } });
  assert.equal(result.verified, true); assert.equal(config.provider, 'prompt-ai'); assert.equal(config.apiKeyFile, undefined);
  assert.equal(config.speechLanguage, 'en'); assert.equal(config.model, 'user-model');
  assert.ok(!JSON.stringify(persisted).includes(credential)); assert.ok(!JSON.stringify(result).includes(credential));
  assert.equal(config.betaKeychainAccount, input.keychainAccount);
  assert.equal(Object.keys(process.env).filter(k => k.startsWith('VOICE_PROMPT_VERIFY_')).length, 0);
  delete process.env.VOICE_PROMPT_BETA_TOKEN;
  assert.throws(() => betaBase({ betaServiceUrl: 'http://example.com' }));
  assert.throws(() => betaBase({ betaServiceUrl: 'https://secret@host/path' }));
});
