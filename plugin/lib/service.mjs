import http from 'node:http';
import { createDirectCapture } from './direct-capture.mjs';
import { readFile } from 'node:fs/promises';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { prepare, validateInput } from './prepare.mjs';
import { listModels, transcribe } from './speech.mjs';
import { validateConfig, savePreferences } from './config.mjs';

export const TRANSCRIPT_MARKER = 'VOICE_PROMPT_TRANSCRIPT\n';
const assets = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
function authorized(header, token) {
  const actual = Buffer.from(header || ''), expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
async function body(req, limit = 100000) {
  let size = 0, chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('Request too large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createService(config, dependencies = {}) {
  validateConfig(config);
  if (typeof config.token !== 'string' || config.token.length < 32) throw new Error('Run init to create a local access token');
  const jobs = new Map(), drafts = [], sessions = new Map(), expirations = new Map();
  let audioBusy = false;
  const directCapture = createDirectCapture();
  const transcriber = dependencies.transcribe || transcribe;
  const models = dependencies.listModels || listModels;
  function listDrafts(session = 'desktop') {
    const now = Date.now();
    while (drafts.length && now - drafts[0].createdAt > 3600000) drafts.shift();
    return drafts.filter(d => d.session === session).map(d => ({ ...d }));
  }
  async function makeDraft(input, disconnectSignal) {
    validateInput(input);
    const session = input.session || 'manual';
    if (typeof session !== 'string' || !/^[\w:.-]{1,150}$/.test(session)) throw new Error('Invalid session');
    const id = input.id || randomUUID();
    if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) throw new Error('Invalid request id');
    if (jobs.has(id)) throw new Error('Duplicate request id');
    if (jobs.size >= 4) throw new Error('Voice service is busy');
    const old = sessions.get(session); if (old) jobs.get(old)?.abort(new Error('Superseded'));
    const controller = new AbortController(); jobs.set(id, controller); sessions.set(session, id);
    const signal = disconnectSignal ? AbortSignal.any([controller.signal, disconnectSignal]) : controller.signal;
    try {
      const result = await prepare(config, input, { signal, model: dependencies.model });
      signal.throwIfAborted();
      if (sessions.get(session) !== id) throw new Error('Superseded');
      const draft = { id, session, createdAt: Date.now(), ...result };
      drafts.push(draft);
      const expiry = setTimeout(() => {
        const index = drafts.findIndex(d => d.id === id);
        if (index >= 0) drafts.splice(index, 1);
        expirations.delete(id);
      }, 3600000);
      expiry.unref(); expirations.set(id, expiry);
      if (drafts.length > 20) { const removed = drafts.shift(); clearTimeout(expirations.get(removed.id)); expirations.delete(removed.id); }
      return draft;
    } finally { jobs.delete(id); if (sessions.get(session) === id) sessions.delete(session); }
  }
  async function dispatch(route, input, signal) {
    if (route.startsWith("/api/capture/")) return directCapture(route.slice("/api/capture/".length), input);
    if (route === '/api/status') return { version: '0.6.5', product: 'Voice Prompt', defaultMode: config.defaultMode || 'clean', service: 'ready', provider: config.provider, model: config.model || (config.provider === 'omp' ? 'OMP configured model' : null), aiConfigured: config.provider !== 'unconfigured', pending: jobs.size, audioBusy, microphone: 'managed_by_Voice_Prompt', history: 'memory_only_1_hour_max_20', modes: ['raw', 'clean', 'agent'] };
    if (route === '/api/preferences') { const saved = await (dependencies.savePreferences || savePreferences)(input); Object.assign(config, saved); return saved; }
    if (route === '/api/models') return { models: await models(config, signal) };
    if (route === '/api/prepare') return makeDraft(input, signal);
    if (route === '/api/history/restore') {
      if (!Array.isArray(input.drafts) || input.drafts.length > 20) throw new Error('Invalid recovery batch');
      const now = Date.now();
      const seen = new Set();
      const restored = input.drafts.map(d => {
        if (!d || typeof d.id !== 'string' || !/^[\w-]{1,100}$/.test(d.id) || d.session !== 'desktop' || !Number.isFinite(d.createdAt) || d.createdAt > now) throw new Error('Invalid recovery record');
        if (seen.has(d.id)) throw new Error('Duplicate recovery id');
        seen.add(d.id);
        validateInput({text:d.text,mode:'raw'}); validateInput({text:d.raw,mode:'raw'});
        return {id:d.id,session:'desktop',createdAt:d.createdAt,text:d.text,raw:d.raw,mode:['raw','clean','agent'].includes(d.mode)?d.mode:'raw',fallback:d.fallback===true,elapsedMs:0,warnings:[]};
      }).filter(d => now - d.createdAt < 3600000 && !drafts.some(old => old.id === d.id));
      for (const d of restored) {
        drafts.push(d);
        const timer = setTimeout(() => { const i=drafts.findIndex(x=>x.id===d.id); if(i>=0) drafts.splice(i,1); expirations.delete(d.id); }, 3600000-(now-d.createdAt));
        timer.unref(); expirations.set(d.id,timer);
      }
      drafts.sort((a,b)=>a.createdAt-b.createdAt);
      while(drafts.length>20) { const d=drafts.shift(); clearTimeout(expirations.get(d.id)); expirations.delete(d.id); }
      return {restored:restored.length};
    }
    if (route === '/api/transcribe') {
      if (audioBusy) throw new Error('An audio file is already being transcribed');
      audioBusy = true;
      try { return await transcriber(config, input, signal); } finally { audioBusy = false; }
    }
    if (route === '/api/cancel') {
      if (typeof input.id !== 'string') throw new Error('id is required');
      const job = jobs.get(input.id); job?.abort(new Error('Cancelled'));
      return { cancelled: !!job };
    }
    if (route === '/api/clear') { drafts.length = 0; for (const timer of expirations.values()) clearTimeout(timer); expirations.clear(); return { cleared: true }; }
    throw new Error('Unknown route');
  }
  const server = http.createServer(async (req, res) => {
    const send = (code, value) => { if (!res.destroyed && !res.writableEnded) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); } };
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(new Error('Client disconnected')); });
    try {
      const address = server.address();
      const hosts = [`127.0.0.1:${address.port}`, `localhost:${address.port}`];
      if (!hosts.includes(req.headers.host)) return send(403, { error: { message: 'Invalid host' } });
      if (req.headers.origin && !hosts.map(h => `http://${h}`).includes(req.headers.origin)) return send(403, { error: { message: 'Invalid origin' } });
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === 'GET' && assets.has(url.pathname)) {
        const [name, type] = assets.get(url.pathname);
        res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'", 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
        return res.end(await readFile(new URL(`../web/${name}`, import.meta.url)));
      }
      if (!authorized(req.headers.authorization, config.token)) return send(401, { error: { message: 'Local token required; open using node server.mjs open' } });
      if (req.method === 'GET' && url.pathname === '/v1/models') return send(200, { object: 'list', data: ['prompt-ai', 'agent', 'clean', 'raw'].map(id => ({ id, object: 'model', owned_by: 'voice-prompt' })) });
      if (req.method === 'GET' && url.pathname === '/api/drafts') return send(200, { drafts: listDrafts(url.searchParams.get('session') || 'desktop') });
      if (req.method === 'GET' && ['/api/status', '/api/models'].includes(url.pathname)) return send(200, await dispatch(url.pathname, {}, controller.signal));
      if (req.method !== 'POST') return send(404, { error: { message: 'Not found' } });
      const input = await body(req, url.pathname === '/api/history/restore' ? 2100000 : 100000);
      if (url.pathname === '/v1/chat/completions') {
        if (input.stream) return send(400, { error: { message: 'Streaming is not supported; use stream=false' } });
        if (!['prompt-ai', 'agent', 'clean', 'raw'].includes(input.model)) throw new Error('Choose prompt-ai, agent, clean, or raw');
        const content = input.messages?.findLast(m => m.role === 'user')?.content;
        if (typeof content !== 'string' || !content.startsWith(TRANSCRIPT_MARKER)) throw new Error('Set Voice Prompt prompt to VOICE_PROMPT_TRANSCRIPT followed by newline and ${output}');
        const draft = await makeDraft({ text: content.slice(TRANSCRIPT_MARKER.length), mode: input.model === 'prompt-ai' ? (config.defaultMode || 'clean') : input.model, session: 'desktop' }, controller.signal);
        return send(200, { id: draft.id, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model: input.model, choices: [{ index: 0, message: { role: 'assistant', content: draft.text }, finish_reason: 'stop' }] });
      }
      return send(200, await dispatch(url.pathname, input, controller.signal));
    } catch (error) { send(controller.signal.aborted ? 499 : 400, { error: { message: error.message } }); }
  });
  server.on('close', () => { for (const job of jobs.values()) job.abort(new Error('Service stopped')); for (const timer of expirations.values()) clearTimeout(timer); expirations.clear(); drafts.length = 0; });
  return { server, dispatch, listDrafts, close: async () => {
    for (const job of jobs.values()) job.abort(new Error('Service stopped'));
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  } };
}
