import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepare } from '../plugin/lib/prepare.mjs';
import { createService, TRANSCRIPT_MARKER } from '../plugin/lib/service.mjs';
import { startMcp } from '../plugin/lib/mcp.mjs';
import { validateWav } from '../plugin/lib/speech.mjs';
import { run } from '../plugin/lib/process.mjs';
import extension from '../plugin/omp/extension.mjs';
import http from 'node:http';

const config = { port: 17865, token: 'test-token-'.repeat(5), provider: 'omp', timeoutMs: 1000, terms: [] };
async function fixture(t, dependencies = {}) {
  const service = createService(config, dependencies);
  service.server.listen(0, '127.0.0.1'); await once(service.server, 'listening');
  const url = `http://127.0.0.1:${service.server.address().port}`;
  t.after(() => service.close());
  return { ...service, url, call: async (route, data, signal, extra = {}) => {
    const res = await fetch(url + route, { method: data === undefined ? 'GET' : 'POST', signal, headers: { authorization: `Bearer ${config.token}`, ...extra }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { status: res.status, body: await res.json() };
  } };
}

test('raw mode makes no model call and preserves Chinese and English', async () => {
  for (const text of ['不要改数据库。', 'Do not modify the database.']) {
    const result = await prepare(config, { text, mode: 'raw' }, { model: () => assert.fail('must not call AI') });
    assert.equal(result.text, text); assert.equal(result.fallback, false);
  }
});
test('invalid cleanup cannot silently remove a number, code identifier, or negation', async () => {
  for (const [text, candidate] of [['Do not deploy version 2.', 'Deploy version 3.'], ['请保留 `UserTable`。', '请保留数据表。'], ['不要修改数据库', '修改数据库']]) {
    const result = await prepare(config, { text }, { model: async () => candidate });
    assert.equal(result.text, text); assert.equal(result.fallback, true);
  }
});
test('AI failure preserves the original while explicit cancellation yields no draft', async () => {
  const failure = await prepare(config, { text: '先研究一下。' }, { model: async () => { throw new Error('offline'); } });
  assert.equal(failure.text, '先研究一下。'); assert.equal(failure.fallback, true);
  const abort = new AbortController(); abort.abort(new Error('Cancelled'));
  await assert.rejects(prepare(config, { text: 'hello' }, { signal: abort.signal }), /Cancelled/);
});
test('OpenAI-compatible adapter sends a text-only request and reads real HTTP completion', async t => {
  let captured;
  const backend = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    captured = { url: req.url, body: JSON.parse(body) };
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: '请检查，不要部署。' } }] }));
  });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  t.after(() => { backend.closeAllConnections(); backend.close(); });
  const result = await prepare({ ...config, provider: 'openai-compatible', baseUrl: `http://127.0.0.1:${backend.address().port}/v1`, model: 'test-model', apiKeyEnv: 'VOICE_PROMPT_TEST_NO_KEY' }, { text: '嗯请检查，不要部署。' });
  assert.equal(result.fallback, false); assert.equal(result.text, '请检查，不要部署。');
  assert.equal(captured.url, '/v1/chat/completions'); assert.equal(captured.body.model, 'test-model');
  assert.equal(captured.body.messages[0].role, 'system'); assert.equal(captured.body.tools, undefined);
  assert.equal(JSON.parse(captured.body.messages[1].content).transcript, '嗯请检查，不要部署。');
});
test('Transcription-compatible endpoint authenticates, rejects browser cross-origin calls, and stores a draft', async t => {
  const f = await fixture(t, { model: async () => '请增加验证码，不要修改数据库。' });
  assert.equal((await fetch(f.url + '/api/status')).status, 401);
  assert.equal((await f.call('/api/status', undefined, undefined, { origin: 'https://example.com' })).status, 403);
  const result = await f.call('/v1/chat/completions', { model: 'agent', messages: [{ role: 'user', content: TRANSCRIPT_MARKER + '嗯请增加验证码，不要修改数据库。' }] });
  assert.equal(result.status, 200); assert.match(result.body.choices[0].message.content, /不要修改数据库/);
  assert.equal((await f.call('/api/drafts?session=desktop')).body.drafts.length, 1);
  assert.equal((await f.call('/api/drafts?session=another')).body.drafts.length, 0);
  assert.equal((await f.call('/v1/chat/completions', { model: 'agent', messages: [{ role: 'user', content: 'missing marker' }] })).status, 400);
});
test('superseded request never appears in history, even if provider ignores abort', async t => {
  let finish;
  const f = await fixture(t, { model: async (_c, _s, raw) => raw === 'old' ? new Promise(resolve => { finish = resolve; }) : raw });
  const old = f.dispatch('/api/prepare', { text: 'old', session: 'same' });
  const rejection = assert.rejects(old, /Superseded/);
  await new Promise(resolve => setImmediate(resolve));
  await f.dispatch('/api/prepare', { text: 'new', session: 'same' });
  finish('old'); await rejection;
  assert.deepEqual(f.listDrafts('same').map(d => d.text), ['new']);
});
test('cancel by request id suppresses completion and history', async t => {
  let finish;
  const f = await fixture(t, { model: () => new Promise(resolve => { finish = resolve; }) });
  const operation = f.dispatch('/api/prepare', { text: 'cancel me', id: 'test-cancel', session: 'x' });
  const rejection = assert.rejects(operation, /Cancelled/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await f.dispatch('/api/cancel', { id: 'test-cancel' })).cancelled, true);
  finish('cancel me'); await rejection; assert.equal(f.listDrafts('x').length, 0);
});
test('MCP speaks JSON-RPC, returns tool errors, and handles malformed input', async () => {
  const input = new PassThrough(), output = new PassThrough(); let received = '';
  output.on('data', c => { received += c; });
  startMcp({ input, output, invoke: async () => { throw new Error('service unavailable'); } });
  input.write('{broken}\n');
  for (const message of [{ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, { id: 2, method: 'tools/list' }, { id: 3, method: 'tools/call', params: { name: 'voice_status' } }]) input.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
  await new Promise(resolve => setImmediate(resolve));
  const messages = received.trim().split('\n').map(JSON.parse);
  assert.equal(messages[0].error.code, -32700);
  assert.equal(messages.find(m => m.id === 1).result.protocolVersion, '2025-06-18');
  assert.equal(messages.find(m => m.id === 2).result.tools.length, 5);
  assert.equal(messages.find(m => m.id === 3).result.isError, true);
  input.end();
});
test('WAV validation accepts correct audio and rejects stereo/truncated files', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-wav-test-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const wav = Buffer.alloc(76); wav.write('RIFF'); wav.writeUInt32LE(68, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(32, 40);
  const file = path.join(dir, 'input.wav'); await writeFile(file, wav); await validateWav(file);
  wav.writeUInt16LE(2, 22); await writeFile(file, wav); await assert.rejects(validateWav(file), /mono/);
  await writeFile(file, wav.subarray(0, 45)); await assert.rejects(validateWav(file));
});
test('process runner preserves UTF-8 across chunks and terminates on cancellation', async () => {
  const r = await run(process.execPath, ['-e', "let b=Buffer.from('中文');process.stdout.write(b.subarray(0,1));setTimeout(()=>process.stdout.write(b.subarray(1)),10)"]);
  assert.equal(r.stdout, '中文');
  const abort = new AbortController(); const task = run(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { signal: abort.signal });
  abort.abort(new Error('Cancelled')); await assert.rejects(task, /Cancelled/);
});
function extensionFixture(invoke) {
  const commands = new Map(), shortcuts = new Map(), events = new Map(), notices = [];
  let text = 'original', session = 'one';
  extension({ registerCommand: (name, c) => commands.set(name, c), registerShortcut: (key, c) => shortcuts.set(key, c), on: (event, cb) => events.set(event, cb), sendUserMessage: () => assert.fail('must not submit') }, invoke);
  const ctx = { hasUI: true, sessionManager: { getSessionId: () => session }, ui: { getEditorText: () => text, setEditorText: value => { text = value; }, setStatus: () => {}, notify: message => notices.push(message), editor: async (_title, value) => value } };
  return { commands, shortcuts, events, ctx, notices, get text() { return text; }, set text(value) { text = value; }, set session(value) { session = value; } };
}
test('OMP preserves edits made during cleanup and still offers the saved draft', async () => {
  let finish;
  const f = extensionFixture(() => new Promise(resolve => { finish = resolve; }));
  const operation = f.shortcuts.get('ctrl+shift+v').handler(f.ctx);
  await new Promise(resolve => setImmediate(resolve));
  f.text = 'new user input'; finish({ raw: 'original', text: 'clean draft', elapsedMs: 10 }); await operation;
  assert.equal(f.text, 'new user input');
  await f.commands.get('voice').handler('draft', f.ctx); assert.equal(f.text, 'clean draft');
  await f.commands.get('voice').handler('raw', f.ctx); assert.equal(f.text, 'original');
});
test('OMP cancels pending cleanup when switching sessions and ignores late output', async () => {
  let finish;
  const f = extensionFixture(() => new Promise(resolve => { finish = resolve; }));
  const operation = f.shortcuts.get('ctrl+shift+v').handler(f.ctx);
  await new Promise(resolve => setImmediate(resolve));
  await f.events.get('session_before_switch')({}, f.ctx); f.session = 'two'; f.text = 'another session';
  finish({ raw: 'original', text: 'late draft', elapsedMs: 10 }); await operation;
  assert.equal(f.text, 'another session');
  await f.commands.get('voice').handler('raw', f.ctx); assert.equal(f.text, 'another session');
});
test('OMP keeps multiline supplied transcripts intact before AI processing', async () => {
  let received;
  const f = extensionFixture(async (_route, input) => { received = input.text; return { raw: input.text, text: input.text, elapsedMs: 1 }; });
  await f.commands.get('voice').handler('polish one\n  two', f.ctx);
  assert.equal(received, 'one\n  two');
});
test('project vocabulary is opt-in and is passed without reading other project files', async t => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'voice-terms-')); t.after(() => rm(cwd, { recursive: true, force: true }));
  await writeFile(path.join(cwd, '.voice-prompt.json'), JSON.stringify({ terms: ['UserTable'] }));
  await writeFile(path.join(cwd, 'unrelated.txt'), 'private data should not be included');
  let received;
  const f = extensionFixture(async (_route, input) => { received = input; return { raw: input.text, text: input.text, elapsedMs: 1 }; });
  f.ctx.cwd = cwd; await f.commands.get('voice').handler('polish hello', f.ctx);
  assert.deepEqual(received.terms, ['UserTable']); assert.ok(!JSON.stringify(received).includes('private data'));
});

test('long WAV chunks preserve every PCM byte and remain below engine limit', async () => {
  const { splitPcm } = await import('../plugin/lib/speech.mjs');
  const pcm = Buffer.alloc(63 * 32000); for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE((i % 2000) - 1000, i);
  const h = Buffer.alloc(44); h.write('RIFF'); h.writeUInt32LE(36+pcm.length,4); h.write('WAVEfmt ',8); h.writeUInt32LE(16,16); h.writeUInt16LE(1,20); h.writeUInt16LE(1,22); h.writeUInt32LE(16000,24); h.writeUInt32LE(32000,28); h.writeUInt16LE(2,32); h.writeUInt16LE(16,34); h.write('data',36); h.writeUInt32LE(pcm.length,40);
  const chunks = splitPcm(Buffer.concat([h,pcm]));
  assert.equal(chunks.length,3); assert.ok(chunks.every(c => c.length <= 25*32000+44));
  assert.deepEqual(Buffer.concat(chunks.map(c => c.subarray(44))),pcm);
});
test('fresh installation reports no AI backend and preserves text honestly', async t => {
  const { loadConfig } = await import('../plugin/lib/config.mjs');
  const { listModels } = await import('../plugin/lib/speech.mjs');
  assert.equal((await listModels({ engineCommand:'/missing-engine',speechModel:'/missing-model' }))[0].downloaded,false);
  const result = await prepare({ ...config, provider:'unconfigured' }, { text:'请检查登录，不要部署。' });
  assert.equal(result.fallback,true); assert.equal(result.text,'请检查登录，不要部署。');
});

test('OMP voice-prompt entry polishes direct dictation without executing a task', async () => {
  const inputs = [];
  const f = extensionFixture(async (route, input) => {
    assert.equal(route, '/api/prepare'); inputs.push(input.text);
    return { raw: input.text, text: '请检查登录页，不要部署。', elapsedMs: 1, fallback: false };
  });
  await f.commands.get('voice-prompt').handler('帮我检查登录页\n不要部署', f.ctx);
  assert.deepEqual(inputs, ['帮我检查登录页\n不要部署']);
  assert.equal(f.text, '请检查登录页，不要部署。');
});

test('update recovery retains original expiry, isolates desktop and never calls AI', async t => {
  const f = await fixture(t, { model: () => assert.fail('recovery must not call AI') });
  const now = Date.now();
  const record = {id:'restored-one',session:'desktop',createdAt:now-5000,text:'请检查。',raw:'嗯请检查。',mode:'clean',fallback:false};
  const expired = {...record,id:'expired',createdAt:now-3600001};
  assert.deepEqual((await f.call('/api/history/restore',{drafts:[record,expired]})).body,{restored:1});
  assert.equal(f.listDrafts('desktop')[0].createdAt,record.createdAt);
  assert.equal(f.listDrafts('desktop')[0].raw,record.raw);
  assert.equal(f.listDrafts('other').length,0);
  assert.deepEqual((await f.call('/api/history/restore',{drafts:[record]})).body,{restored:0});
  assert.equal((await f.call('/api/history/restore',{drafts:[{...record,id:'fresh'},{...record,id:'wrong',session:'other'}]})).status,400);
  assert.equal(f.listDrafts('desktop').length,1);
  assert.equal((await f.call('/api/history/restore',{drafts:[{...record,id:'dup'},{...record,id:'dup'}]})).status,400);
  assert.equal(f.listDrafts('desktop').length,1);
});
