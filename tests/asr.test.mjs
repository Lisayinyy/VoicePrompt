import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { QwenWorker } from '../plugin/lib/qwen-worker.mjs';
import { speechOptions, transcribe, listModels } from '../plugin/lib/speech.mjs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createService } from '../plugin/lib/service.mjs';

function fakeRuntime() {
  const children = [], requests = [];
  const spawnProcess = () => {
    const child = new EventEmitter(); child.exitCode = null;
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.stdin = new Writable({ write(chunk, _encoding, next) { requests.push({ child, value: JSON.parse(chunk.toString()) }); next(); } });
    child.kill = () => { child.exitCode = 143; queueMicrotask(() => child.emit('close', 143)); };
    children.push(child); return child;
  };
  const reply = (n, text) => requests[n].child.stdout.write(JSON.stringify({ id: requests[n].value.id, text }) + '\n');
  return { children, requests, spawnProcess, reply };
}
const config = { asrPython: '/python', qwenModelPath: '/model' };
test('recording waits for startup warmup and then reuses the ready process', async t => {
  const fake = fakeRuntime(), worker = new QwenWorker({ ...fake, timeoutMs: 500 }); t.after(() => worker.stop());
  const warm = worker.warm(config);
  const record = worker.request(config, { path: '/speech.wav', language: 'zh' });
  assert.equal(fake.requests.length, 1); assert.equal(fake.requests[0].value.op, 'warm');
  fake.reply(0, ''); await warm; await new Promise(resolve => setImmediate(resolve));
  assert.equal(fake.requests.length, 2); fake.reply(1, '你好');
  assert.equal((await record).text, '你好'); assert.equal(fake.children.length, 1);
});
test('model defaults, language override and ASR vocabulary are validated before inference', () => {
  assert.equal(speechOptions({}).model, 'sensevoice-small');
  assert.deepEqual(speechOptions({ speechModelId: 'qwen3-asr-1.7b', speechLanguage: 'zh', terms: ['MiniMax'] }, { language: 'en', terms: ['OMP', 'MiniMax'] }), { model: 'qwen3-asr-1.7b', language: 'en', terms: ['MiniMax', 'OMP'] });
  assert.throws(() => speechOptions({}, { model: 'remote' }));
  assert.throws(() => speechOptions({}, { language: 'invalid' }));
  assert.throws(() => speechOptions({}, { terms: ['x'.repeat(101)] }));
});
test('worker reuses a model and cancellation kills it; next utterance starts cleanly', async t => {
  const fake = fakeRuntime(), worker = new QwenWorker({ ...fake, timeoutMs: 500 }); t.after(() => worker.stop());
  const a = worker.request(config, { path: '/one.wav', language: 'zh', terms: ['OMP'] });
  fake.reply(0, '不要部署'); assert.equal((await a).text, '不要部署');
  const abort = new AbortController();
  const b = worker.request(config, { path: '/two.wav' }, abort.signal);
  assert.equal(fake.children.length, 1); const cancelled = assert.rejects(b, /Cancelled/);
  abort.abort(new Error('Cancelled')); await cancelled;
  const c = worker.request(config, { path: '/three.wav' }); fake.reply(2, 'hello');
  assert.equal((await c).text, 'hello'); assert.equal(fake.children.length, 2);
  assert.deepEqual(fake.requests[0].value.terms, ['OMP']);
});
test('timeout recovers; idle model releases; model-path changes retire previous process', async t => {
  const fake = fakeRuntime(), worker = new QwenWorker({ ...fake, timeoutMs: 15, idleMs: 15 }); t.after(() => worker.stop());
  await assert.rejects(worker.request(config, {}), /timed out/);
  const a = worker.request(config, {}); fake.reply(1, 'ok'); await a;
  const b = worker.request({ ...config, qwenModelPath: '/other' }, {}); fake.reply(2, 'ok'); await b;
  assert.equal(fake.children[1].exitCode, 143);
  await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(worker.child, undefined);
});
test('missing Qwen reports unavailable without silently using the old model', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-asr-test-')); t.after(() => rm(dir, { recursive: true }));
  const wav = Buffer.alloc(76); wav.write('RIFF'); wav.writeUInt32LE(68, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(32, 40);
  const filename = path.join(dir, 'silence.wav'); await writeFile(filename, wav);
  const c = { ...config, speechModelId: 'qwen3-asr-1.7b' };
  assert.equal((await listModels(c))[0].downloaded, false);
  await assert.rejects(transcribe(c, { path: filename }), /not installed/);
});
test('model settings reject unavailable models and expose a successful selection in status', async () => {
  const c = { port: 17999, token: 'test-only-token'.repeat(3), provider: 'unconfigured', timeoutMs: 1000, terms: [] };
  let installed = false, writes = 0;
  const service = createService(c, {
    listModels: async () => [{ id: 'qwen3-asr-1.7b', downloaded: installed }],
    savePreferences: async patch => { writes++; return patch; },
  });
  await assert.rejects(service.dispatch('/api/preferences', { speechModelId: 'qwen3-asr-1.7b' }), /not installed/);
  assert.equal(writes, 0);
  installed = true;
  await service.dispatch('/api/preferences', { speechModelId: 'qwen3-asr-1.7b', speechLanguage: 'en' });
  const status = await service.dispatch('/api/status', {});
  assert.equal(status.speechModel, 'qwen3-asr-1.7b'); assert.equal(status.speechLanguage, 'en');
  assert.equal(status.speechEngine, 'mlx-local'); assert.equal(writes, 1);
});
