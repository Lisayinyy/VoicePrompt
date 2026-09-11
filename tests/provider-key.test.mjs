import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { prepare } from '../plugin/lib/prepare.mjs';

test('desktop authenticates from private file and refuses exposed or symlink credentials before sending', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-key-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const keyPath = path.join(dir, 'client-token');
  await writeFile(keyPath, 'test-customer-token\n', { mode: 0o600 });
  let calls = 0;
  const backend = http.createServer((req, res) => {
    calls++;
    assert.equal(req.headers.authorization, 'Bearer test-customer-token');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ schema: 'prompt-ai-voice/1', optimized: '请检查登录页，不要改数据库。', fallback: false }));
  });
  backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
  t.after(() => { backend.closeAllConnections(); backend.close(); });
  const config = { provider: 'prompt-ai', baseUrl: `http://127.0.0.1:${backend.address().port}`, apiKeyFile: keyPath, timeoutMs: 2000 };
  const input = { text: '嗯请检查登录页，不要改数据库。' };
  assert.equal((await prepare(config, input)).fallback, false);
  await chmod(keyPath, 0o644);
  assert.equal((await prepare(config, input)).fallback, true);
  await chmod(keyPath, 0o600);
  await symlink(keyPath, path.join(dir, 'link'));
  assert.equal((await prepare({ ...config, apiKeyFile: path.join(dir, 'link') }, input)).fallback, true);
  assert.equal(calls, 1);
});
