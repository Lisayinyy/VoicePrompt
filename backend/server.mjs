import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { handleVoiceRequest } from '../plugin/lib/worker-voice.mjs';
import { validateInput } from '../plugin/lib/voice-policy.mjs';

export const tokenHash = token => createHash('sha256').update(token).digest('hex');
const limit = (value, fallback) => {
  const n = Number(value ?? fallback);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid service limit');
  return n;
};

// One process per instance. Only quota counters are persisted, never transcripts.
export function createBackend(env, { fetchModel = fetch, now = () => Date.now() } = {}) {
  const stateDir = env.VOICE_STATE_DIR || '/var/lib/voice-prompt';
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const clients = JSON.parse(readFileSync(env.VOICE_CLIENTS_FILE || '/etc/voice-prompt/clients.json', 'utf8'));
  if (!Array.isArray(clients) || clients.some(c => !/^[a-f0-9]{64}$/.test(c.tokenHash) || (!/^[a-zA-Z0-9_-]{1,64}$/.test(c.id) || ['__proto__', 'constructor', 'prototype'].includes(c.id))) || new Set(clients.map(c => c.id)).size !== clients.length || new Set(clients.map(c => c.tokenHash)).size !== clients.length) throw new Error('Invalid clients file');
  for (const c of clients) c.dailyLimit = limit(c.dailyLimit, 100);
  const globalDaily = limit(env.VOICE_GLOBAL_DAILY_LIMIT, 1000);
  const globalMonthly = limit(env.VOICE_GLOBAL_MONTHLY_LIMIT, 10000);
  const maxConcurrent = limit(env.VOICE_MAX_CONCURRENT, 2);
  const perMinute = limit(env.VOICE_PER_MINUTE, 6);
  const stateFile = path.join(stateDir, 'usage.json');
  let ledger;
  try { ledger = JSON.parse(readFileSync(stateFile, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw e; ledger = { day: '', month: '', daily: 0, monthly: 0, clients: {} }; }
  if (!ledger || !Number.isSafeInteger(ledger.daily) || ledger.daily < 0 || !Number.isSafeInteger(ledger.monthly) || ledger.monthly < 0 || typeof ledger.clients !== 'object' || !ledger.clients || Object.values(ledger.clients).some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('Invalid quota ledger');
  let active = 0;
  const activeClients = new Set(), rates = new Map();
  const send = (res, status, body, extra = {}) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra });
    res.end(JSON.stringify(body));
  };
  const ready = () => env.VOICE_MODEL_ENABLED === 'true' && Boolean(env.MINIMAX_API_KEY);
  const server = http.createServer(async (req, res) => {
    let acquired = false, client;
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    try {
      if (req.url === '/healthz' && req.method === 'GET') return send(res, 200, { status: 'ok', service: 'voice-prompt' });
      if (!['/readyz', '/voice/prepare'].includes(req.url)) return send(res, 404, { error: 'not_found' });
      // Desktop clients do not send Origin. A public browser frontend needs a separate explicit design.
      if (req.headers.origin) return send(res, 403, { error: 'browser_requests_disabled' });
      const auth = req.headers.authorization || '';
      const hash = Buffer.from(tokenHash(auth.startsWith('Bearer ') && auth.length <= 520 ? auth.slice(7) : ''), 'hex');
      client = clients.find(c => c.enabled !== false && timingSafeEqual(hash, Buffer.from(c.tokenHash, 'hex')));
      if (!client) return send(res, 401, { error: 'unauthorized' });
      if (req.url === '/readyz' && req.method === 'GET') return send(res, ready() ? 200 : 503, { ready: ready(), reason: ready() ? undefined : 'model_not_configured' });
      if (req.url !== '/voice/prepare' || req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
      if (!ready()) return send(res, 503, { error: 'model_not_configured' });
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(res, 415, { error: 'json_required' });
      if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') return send(res, 415, { error: 'encoding_not_supported' });
      if (active >= maxConcurrent || activeClients.has(client.id)) return send(res, 429, { error: 'busy' }, { 'retry-after': '5' });
      active++; activeClients.add(client.id); acquired = true;
      const chunks = []; let size = 0;
      if (Number(req.headers['content-length']) > 65536) return send(res, 413, { error: 'input_too_large' });
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 65536) { send(res, 413, { error: 'input_too_large' }); return; }
        chunks.push(chunk);
      }
      let input;
      try {
        input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        validateInput({ text: input.prompt, mode: input.mode, terms: input.terms });
      } catch { return send(res, 400, { error: 'invalid_input' }); }
      const timestamp = now();
      const recent = (rates.get(client.id) || []).filter(t => timestamp - t < 60000);
      if (recent.length >= perMinute) return send(res, 429, { error: 'rate_limit' }, { 'retry-after': '60' });
      const date = new Date(timestamp + 8 * 3600000).toISOString(); // Hong Kong/China calendar day
      const day = date.slice(0, 10), month = date.slice(0, 7);
      const next = { ...ledger, clients: { ...ledger.clients } };
      if (next.month !== month) { next.month = month; next.monthly = 0; }
      if (next.day !== day) { next.day = day; next.daily = 0; next.clients = {}; }
      if (next.daily >= globalDaily || next.monthly >= globalMonthly || (next.clients[client.id] || 0) >= client.dailyLimit) return send(res, 429, { error: 'quota_exhausted' }, { 'retry-after': '3600' });
      next.daily++; next.monthly++; next.clients[client.id] = (next.clients[client.id] || 0) + 1;
      // Charge an attempt before upstream work: crashes, restarts and upstream failures cannot bypass quotas.
      writeFileSync(stateFile + '.tmp', JSON.stringify(next), { mode: 0o600, flush: true });
      renameSync(stateFile + '.tmp', stateFile); ledger = next;
      rates.set(client.id, [...recent, timestamp]);
      const result = await handleVoiceRequest(new Request('https://voice-prompt.internal/voice/prepare', {
        method: 'POST', body: JSON.stringify(input), signal: controller.signal,
      }), env, fetchModel);
      send(res, result.status, await result.json());
    } catch {
      if (!res.headersSent && !res.destroyed) send(res, 500, { error: 'service_error' });
    } finally {
      if (acquired) { active--; activeClients.delete(client.id); }
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.timeout = 45000;
  server.maxConnections = 64;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createBackend(process.env);
  // Never expose plaintext transcript traffic; terminate TLS at a separately configured reverse proxy.
  server.listen(Number(process.env.PORT || 8787), '127.0.0.1', () => console.log('Voice Prompt backend listening on loopback'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(); setTimeout(() => process.exit(0), 35000).unref(); });
}
