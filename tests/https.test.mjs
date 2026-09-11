import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDomain, renderCaddy } from '../scripts/render-caddy.mjs';
import { endpointOrigin, verifyEndpoint } from '../scripts/verify-https.mjs';

test('HTTPS deployment rejects placeholder domains and configuration injection', async () => {
  for (const host of ['api.example.com', 'localhost', '127.0.0.1', '*.voiceprompt.com', 'voiceprompt.test', 'a.com\n{ respond 200 }', 'https://voiceprompt.com', 'a.com:443']) {
    assert.throws(() => validateDomain(host));
  }
  assert.equal(validateDomain('api.voiceprompt.com'), 'api.voiceprompt.com');
  const rendered = await renderCaddy('api.voiceprompt.com');
  assert.ok(rendered.includes('api.voiceprompt.com {'));
  assert.ok(!rendered.includes('__VOICE_PROMPT_DOMAIN__'));
  for (const value of ['http://api.voiceprompt.com', 'https://user:secret@api.voiceprompt.com', 'https://api.voiceprompt.com/path', 'https://api.voiceprompt.com?token=x', 'https://api.voiceprompt.com:9443']) assert.throws(() => endpointOrigin(value));
});

const responder = (override = () => undefined) => async (url, options) => {
  const route = new URL(url).pathname;
  const status = route === '/healthz' ? 200 : route === '/voice/prepare' ? (options.token === 'synthetic-client-token' ? 200 : 401) : 404;
  const result = { status, elapsedMs: 1, certificate: { validTo: new Date(Date.now() + 30 * 86400000).toUTCString(), protocol: 'TLSv1.3' }, body: JSON.stringify(route === '/healthz' ? { status: 'ok', service: 'voice-prompt' } : { schema: 'prompt-ai-voice/1', optimized: '请检查登录页面，不要修改数据库，保留版本 2.0', fallback: false }) };
  return { ...result, ...override(route, options) };
};

test('HTTPS preflight distinguishes transport checks from authenticated model success', async () => {
  const base = 'https://api.voiceprompt.com';
  const anonymous = await verifyEndpoint(base, { request: responder() });
  assert.equal(anonymous.modelVerified, false);
  assert.equal(anonymous.checks.length, 5);
  const withModel = await verifyEndpoint(base, { token: 'synthetic-client-token', request: responder() });
  assert.equal(withModel.modelVerified, true);
  await assert.rejects(verifyEndpoint(base, { request: responder(route => route === '/readyz' ? { status: 200 } : {}) }), /private_readiness_hidden/);
  await assert.rejects(verifyEndpoint(base, { request: responder(() => ({ status: 302 })) }), /redirects are not followed/);
  await assert.rejects(verifyEndpoint(base, { token: 'synthetic-client-token', request: responder((route, options) => route === '/voice/prepare' && options.token === 'synthetic-client-token' ? { body: JSON.stringify({ schema: 'prompt-ai-voice/1', fallback: true }) } : {}) }), /fallback/);
  await assert.rejects(verifyEndpoint(base, { request: responder(() => ({ certificate: { validTo: new Date(Date.now() + 86400000).toUTCString() } })) }), /fewer than 14 days/);
  await assert.rejects(verifyEndpoint(base, { request: responder(() => ({ body: 'secret response payload' })) }), error => error.message === 'Expected a JSON object response');
});
