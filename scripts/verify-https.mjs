// Public deployment preflight. Never follow redirects or disable TLS validation.
import https from 'node:https';
import { resolve4, resolve6 } from 'node:dns/promises';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { providerKey } from '../plugin/lib/provider-key.mjs';
import { validateDomain } from './render-caddy.mjs';

function parseObject(text) {
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {}
  throw new Error('Expected a JSON object response');
}

export function endpointOrigin(input) {
  const url = new URL(input);
  validateDomain(url.hostname);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Use an HTTPS origin with the default port and no credentials, path, query or fragment');
  return url.origin;
}

export function checkedRequest(url, { method = 'GET', token, body } = {}) {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS validation must remain enabled');
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) { body = JSON.stringify(body); headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(body); }
    let certificate;
    const req = https.request(url, { method, headers, rejectUnauthorized: true, minVersion: 'TLSv1.2', agent: false }, res => {
      const chunks = []; let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size > 131072) res.destroy(new Error('Response too large')); else chunks.push(chunk); });
      res.on('error', () => { clearTimeout(timer); reject(new Error('HTTPS response failed')); });
      res.on('end', () => { clearTimeout(timer); resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), elapsedMs: Math.round(performance.now() - start), certificate }); });
    });
    const timer = setTimeout(() => req.destroy(new Error('HTTPS request timed out')), 45000);
    req.on('socket', socket => socket.on('secureConnect', () => {
      const cert = socket.getPeerCertificate();
      certificate = { validTo: cert.valid_to, protocol: socket.getProtocol() };
    }));
    req.on('error', error => { clearTimeout(timer); reject(new Error(error.code || 'HTTPS request failed')); });
    req.end(body);
  });
}

export async function verifyEndpoint(origin, { token, request = checkedRequest } = {}) {
  const checks = [];
  async function check(name, route, options, expected) {
    const result = await request(origin + route, options);
    if (result.status !== expected) throw new Error(`${name}: expected HTTP ${expected}, got ${result.status}; redirects are not followed`);
    checks.push({ name, status: result.status, elapsedMs: result.elapsedMs });
    return result;
  }
  const health = await check('health', '/healthz', {}, 200);
  const data = parseObject(health.body);
  if (data.status !== 'ok' || data.service !== 'voice-prompt') throw new Error('Unexpected health service');
  const days = Math.floor((Date.parse(health.certificate?.validTo) - Date.now()) / 86400000);
  if (!Number.isFinite(days) || days < 14) throw new Error('Certificate has fewer than 14 days left or cannot be inspected');
  await check('private_readiness_hidden', '/readyz', {}, 404);
  await check('unknown_route_hidden', '/not-a-public-route', {}, 404);
  await check('polish_requires_auth', '/voice/prepare', { method: 'POST', body: { prompt: 'Unauthenticated synthetic check', mode: 'clean' } }, 401);
  await check('invalid_token_rejected', '/voice/prepare', { method: 'POST', token: 'invalid-release-preflight-token', body: { prompt: 'Invalid-token synthetic check', mode: 'clean' } }, 401);
  let modelVerified = false;
  if (token) {
    const result = await check('authenticated_polishing', '/voice/prepare', { method: 'POST', token, body: { prompt: '嗯，请检查登录页面，不要修改数据库，保留版本 2.0。', mode: 'agent', terms: [] } }, 200);
    const draft = parseObject(result.body);
    if (draft.schema !== 'prompt-ai-voice/1' || draft.fallback !== false || !draft.optimized?.includes('2.0') || !draft.optimized?.includes('数据库')) throw new Error('Polishing returned fallback or lost test constraints');
    modelVerified = true;
  }
  return { origin, certificateDaysRemaining: days, tls: health.certificate.protocol, checks, modelVerified, scope: 'HTTPS API checks only; not MCP, desktop insertion, mainland/HK network quality, certificate renewal or marketplace approval' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (!args[0] || ![1, 3].includes(args.length) || (args.length === 3 && args[1] !== '--client-token-file')) throw new Error('Usage: node scripts/verify-https.mjs HTTPS_ORIGIN [--client-token-file ABSOLUTE_PRIVATE_FILE]');
    const origin = endpointOrigin(args[0]);
    const host = new URL(origin).hostname;
    const answers = await Promise.allSettled([resolve4(host), resolve6(host)]);
    const addresses = answers.flatMap(a => a.status === 'fulfilled' ? a.value : []);
    if (!addresses.length) throw new Error('No DNS A or AAAA answers');
    const token = args[2] ? await providerKey({ apiKeyFile: args[2] }) : undefined;
    const report = await verifyEndpoint(origin, { token });
    console.log(JSON.stringify({ ...report, addresses }, null, 2));
  } catch (error) {
    // Never print responses, request headers, transcript bodies or credential contents.
    console.error(JSON.stringify({ ok: false, reason: error.message })); process.exitCode = 1;
  }
}
