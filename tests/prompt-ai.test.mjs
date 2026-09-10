import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import worker from '../worker/index.mjs';
import { handleVoiceRequest } from '../plugin/lib/worker-voice.mjs';
import { prepare } from '../plugin/lib/prepare.mjs';
import { createService, TRANSCRIPT_MARKER } from '../plugin/lib/service.mjs';

const config = { provider: 'omp', port: 17865, token: 'x'.repeat(64), timeoutMs: 1000, terms: [], defaultMode: 'clean' };
test('Explicit polishing follows the configured preference', async t => {
  const prompts = [];
  const service = createService({ ...config }, {
    savePreferences: async p => { assert.deepEqual(p, { defaultMode: 'agent' }); return p; },
    model: async (_c, system, text) => { prompts.push(system); return text; },
  });
  service.server.listen(0, '127.0.0.1'); await once(service.server, 'listening');
  t.after(() => service.close());
  const url = `http://127.0.0.1:${service.server.address().port}`;
  const call = async (route, body) => {
    const res = await fetch(url + route, { method: 'POST', headers: { authorization: `Bearer ${config.token}` }, body: JSON.stringify(body) });
    assert.equal(res.status, 200); return res.json();
  };
  const input = { model: 'prompt-ai', messages: [{ role: 'user', content: TRANSCRIPT_MARKER + '请检查，不要修改。' }] };
  assert.equal((await call('/v1/chat/completions', input)).choices[0].message.content, '请检查，不要修改。');
  assert.match(prompts[0], /Do not restructure/);
  await call('/api/preferences', { defaultMode: 'agent' });
  await call('/v1/chat/completions', input);
  assert.match(prompts[1], /reorder scattered ideas into a logical flow/);
});

test('Prompt.ai Worker voice route handles raw mode without a model or credentials', async () => {
  const res = await worker.fetch(new Request('https://example.test/voice/prepare', { method: 'POST', body: JSON.stringify({ prompt: 'Do not change v2.', mode: 'raw' }) }), {});
  assert.equal(res.status, 200); const data = await res.json();
  assert.equal(data.schema, 'prompt-ai-voice/1'); assert.equal(data.optimized, 'Do not change v2.');
});

test('Worker protects negative constraints after AI editing', async () => {
  const res = await handleVoiceRequest(new Request('https://example.test/voice/prepare', { method: 'POST', body: JSON.stringify({ prompt: '不要部署版本 2。' }) }), { MINIMAX_API_KEY: 'test-only' }, async () => Response.json({ choices: [{ message: { content: '部署版本 3。' } }] }));
  const data = await res.json();
  assert.equal(data.fallback, true); assert.equal(data.optimized, '不要部署版本 2。');
});

test('desktop Prompt.ai adapter calls the real Worker contract; rejects legacy optimizer responses', async t => {
  let legacy = false, captured;
  const backend = http.createServer(async (req, res) => {
    let body = ''; for await (const c of req) body += c;
    captured = { path: req.url, input: JSON.parse(body) };
    const result = legacy ? Response.json({ optimized: 'Invented legacy requirements' }) : await handleVoiceRequest(new Request('https://example.test' + req.url, { method: 'POST', body }), { MINIMAX_API_KEY: 'test-only' }, async () => Response.json({ choices: [{ message: { content: '请检查登录页，不要改数据库。' } }] }));
    res.writeHead(result.status, { 'content-type': 'application/json' }); res.end(await result.text());
  });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  t.after(() => { backend.closeAllConnections(); backend.close(); });
  const c = { ...config, provider: 'prompt-ai', baseUrl: `http://127.0.0.1:${backend.address().port}` };
  const input = { text: '嗯请检查登录页，不要改数据库。', terms: ['Prompt.ai'] };
  const result = await prepare(c, input);
  assert.equal(result.fallback, false); assert.equal(result.text, '请检查登录页，不要改数据库。');
  assert.deepEqual(captured, { path: '/voice/prepare', input: { prompt: input.text, mode: 'clean', terms: ['Prompt.ai'] } });
  legacy = true; const fallback = await prepare(c, input);
  assert.equal(fallback.fallback, true); assert.equal(fallback.text, input.text);
});
