// Integration test with a real Caddy process, a scoped test CA and synthetic model.
// No production server, public CA request, personal configuration or trust-store change.
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import https from 'node:https';
import net from 'node:net';
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');
import assert from 'node:assert/strict';
import { createBackend, tokenHash } from '../backend/server.mjs';
import { verifyEndpoint, checkedRequest } from './verify-https.mjs';
import { makeInvitationBatch } from '../backend/invites.mjs';
import { randomBytes } from 'node:crypto';

const caddy = process.argv[2];
if (!caddy || !path.isAbsolute(caddy)) throw new Error('Pass an absolute path to a verified Caddy binary');
const directory = await mkdtemp(path.join(tmpdir(), 'voice-caddy-local-'));
let backend, child, childExit, modelCalls = 0;
try {
  const token = 'synthetic-local-test-client-token';
  const clients = path.join(directory, 'clients.json');
  await writeFile(clients, JSON.stringify([{ id: 'test', tokenHash: tokenHash(token), dailyLimit: 20 }]), { mode: 0o600 });
  const batch = makeInvitationBatch(1), inviteFile = path.join(directory, 'invitations.json');
  await writeFile(inviteFile, JSON.stringify(batch.records), { mode: 0o600 });
  backend = createBackend({ VOICE_CLIENTS_FILE: clients, VOICE_PUBLIC_ENROLLMENT: 'true', VOICE_TRUST_LOOPBACK_PROXY: 'true', VOICE_STATE_DIR: path.join(directory, 'state'), VOICE_MODEL_ENABLED: 'true', MINIMAX_API_KEY: 'synthetic-test-model-key', MINIMAX_MODEL: 'MiniMax-M3' }, { fetchModel: async () => { modelCalls++; return new Response(JSON.stringify({ choices: [{ message: { content: '请检查登录页面，不要修改数据库，保留版本 2.0。' } }] }), { headers: { 'content-type': 'application/json' } }); } });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  const upstream = backend.address().port;
  const reserve = net.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const key = path.join(directory, 'test-key.pem'), cert = path.join(directory, 'test-cert.pem');
  const cnf = path.join(directory, 'openssl.cnf');
  await writeFile(cnf, '[req]\ndistinguished_name=dn\nprompt=no\n[dn]\nCN=localhost\n[v3]\nsubjectAltName=DNS:localhost\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n');
  const generated = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-keyout', key, '-out', cert, '-config', cnf, '-extensions', 'v3'], { encoding: 'utf8' });
  assert.equal(generated.status, 0, generated.stderr);
  let template = await readFile(new URL('../backend/Caddyfile.template', import.meta.url), 'utf8');
  // Scope the production routes to loopback with an explicit temporary certificate.
  template = template.replace('admin 127.0.0.1:2019', 'admin off\n    auto_https off')
    .replace('__VOICE_PROMPT_DOMAIN__ {', `https://localhost:${port} {\n    bind 127.0.0.1\n    tls ${cert} ${key}`)
    .replaceAll('127.0.0.1:8787', `127.0.0.1:${upstream}`);
  const config = path.join(directory, 'Caddyfile'); await writeFile(config, template);
  const validated = spawnSync(caddy, ['validate', '--config', config, '--adapter', 'caddyfile'], { encoding: 'utf8' });
  assert.equal(validated.status, 0, validated.stderr);
  const env = { ...process.env, HOME: directory, XDG_DATA_HOME: path.join(directory, 'data'), XDG_CONFIG_HOME: path.join(directory, 'config') };
  child = spawn(caddy, ['run', '--config', config, '--adapter', 'caddyfile'], { env, stdio: ['ignore', 'ignore', 'pipe'] });
  childExit = once(child, 'exit');
  let diagnostics = ''; child.stderr.on('data', data => { diagnostics += data; });
  const ca = await readFile(cert);
  const request = (url, { method = 'GET', token: auth, body, headers: extra = {} } = {}) => new Promise((resolve, reject) => {
    const headers = { ...extra };
    if (auth) headers.authorization = `Bearer ${auth}`;
    const bytes = body === undefined ? undefined : JSON.stringify(body);
    if (bytes) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(bytes); }
    let certificate;
    const req = https.request(url, { method, headers, ca, servername: 'localhost', rejectUnauthorized: true, lookup: (_host, options, callback) => options.all ? callback(null, [{ address: '127.0.0.1', family: 4 }]) : callback(null, '127.0.0.1', 4), agent: false }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), certificate, elapsedMs: 0 }));
    });
    req.on('socket', socket => socket.on('secureConnect', () => { certificate = { validTo: socket.getPeerCertificate().valid_to, protocol: socket.getProtocol() }; }));
    req.setTimeout(5000, () => req.destroy(new Error('Local proxy timeout'))); req.on('error', reject); req.end(bytes);
  });
  const origin = `https://localhost:${port}`;
  let started = false, lastFailure;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('Caddy exited: ' + diagnostics);
    try { if ((await request(origin + '/healthz')).status === 200) { started = true; break; } } catch (error) { lastFailure = error.message; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(started, 'Caddy did not start: ' + (lastFailure || diagnostics));
  // Public verifier cannot trust this temporary certificate without the scoped CA.
  await assert.rejects(checkedRequest(origin + '/healthz'), /DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN/);
  const report = await verifyEndpoint(origin, { token, request });
  assert.equal(report.modelVerified, true);
  assert.equal(modelCalls, 1, 'Only the authenticated model check can call the model');
  assert.equal((await request(origin + '/voice/prepare', { method: 'POST', token, body: { prompt: 'x'.repeat(66000), mode: 'clean' } })).status, 413);
  assert.equal(modelCalls, 1, 'Oversized body must not call model');
  assert.equal((await request(origin + '/voice/prepare')).status, 404);
  assert.equal((await request(origin + '/healthz', { headers: { host: 'wrong-host.invalid' } })).status, 421);
  const credential = randomBytes(32).toString('base64url');
  assert.equal((await request(origin + '/client/enroll')).status, 404);
  assert.equal((await request(origin + '/client/enroll', { method: 'POST', body: { credential }, headers: { origin: 'https://untrusted.invalid' } })).status, 403);
  assert.equal((await request(origin + '/client/enroll', { method: 'POST', body: { credential } })).status, 200);
  const invited = await verifyEndpoint(origin, { token: credential, request });
  assert.equal(invited.modelVerified, true);
  assert.equal(modelCalls, 2);
  // A spoofed client IP cannot bypass activation throttling through the proxy.
  for (let i = 0; i < 9; i++) assert.equal((await request(origin + '/client/enroll', { method: 'POST', body: {}, headers: { 'x-voice-prompt-client-ip': `192.0.2.${i + 1}` } })).status, 400);
  assert.equal((await request(origin + '/client/enroll', { method: 'POST', body: {}, headers: { 'x-voice-prompt-client-ip': '192.0.2.100' } })).status, 429);
  console.log(JSON.stringify({ localProxyTest: 'passed', checked: ['real TLS with scoped test CA', 'untrusted certificate refused', 'health routing', 'private paths hidden', 'anonymous and invalid token rejected', 'legacy and free client model calls', 'automatic free enrollment through proxy', 'spoofed client IP cannot bypass throttling', 'browser activation rejected', 'oversized body rejected', 'wrong method rejected', 'Host/SNI mismatch rejected'], publicCertificate: 'not requested', publicDeployment: 'not tested' }, null, 2));
} finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await childExit; }
  if (backend) { backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve)); }
  await rm(directory, { recursive: true, force: true });
}
