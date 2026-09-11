import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = (...args) => {
  const r = spawnSync('python3', args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

test('MiniMax artifact survives extraction and works without publisher configuration', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'voice-minimax-test-'));
  let child;
  try {
    const report = JSON.parse(run('scripts/pack-minimax.py', '--output', directory));
    const firstHash = report.sha256;
    assert.equal(JSON.parse(run('scripts/pack-minimax.py', '--output', directory)).sha256, firstHash, 'reproducible archive');
    const extracted = path.join(directory, 'unpacked');
    run('-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', report.archive, extracted);
    const manifest = JSON.parse(await readFile(path.join(extracted, '.minimax-plugin/plugin.json'), 'utf8'));
    const mcp = JSON.parse(await readFile(path.join(extracted, 'voice-prompt.mcp.json'), 'utf8')).mcpServers['voice-prompt'];
    const env = { HOME: path.join(directory, 'empty-home'), PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, VOICE_PROMPT_CONFIG: path.join(directory, 'missing-config.json') };
    child = spawn(mcp.command, mcp.args, { cwd: extracted, env, stdio: ['pipe', 'pipe', 'pipe'] });
    const waiting = new Map(); let buffer = '', seq = 0, stderr = '';
    child.stderr.on('data', c => { stderr += c; });
    child.stdout.on('data', c => {
      buffer += c; let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
        const item = waiting.get(message.id); waiting.delete(message.id); item?.(message);
      }
    });
    const call = (method, params) => new Promise((resolve, reject) => {
      const id = ++seq;
      const timeout = setTimeout(() => { waiting.delete(id); reject(new Error('Packaged MCP timeout: ' + stderr)); }, 5000);
      waiting.set(id, message => { clearTimeout(timeout); resolve(message); });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
    const init = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'isolated-package-test', version: '1' } });
    assert.equal(init.result.serverInfo.version, manifest.version);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const listed = await call('tools/list', {});
    assert.equal(listed.result.tools.length, 5);
    const setup = await call('tools/call', { name: 'voice_setup_status', arguments: {} });
    assert.equal(setup.result.isError, false);
    const state = JSON.parse(setup.result.content[0].text);
    assert.equal(state.desktopInstalled, false);
    assert.equal(state.aiProviderConfigured, false);
    const polish = await call('tools/call', { name: 'voice_prepare_prompt', arguments: { text: 'Keep version 2.0', mode: 'agent' } });
    assert.equal(polish.result.isError, true, 'missing companion must not report successful polish');
    const noRuntime = spawnSync('/bin/sh', ['./mcp-launch.sh'], { cwd: extracted, env: { ...env, PATH: '/usr/bin:/bin' }, encoding: 'utf8' });
    // macOS has no system Node; other OS images can include /usr/bin/node.
    if (process.platform === 'darwin') {
      assert.equal(noRuntime.status, 1);
      assert.match(noRuntime.stderr, /first-use setup/);
      assert.equal(noRuntime.stdout, '', 'stdout reserved for MCP');
    }
    // Modify valid ZIPs as a marketplace would receive them, not just source fixtures.
    for (const mutation of ['hook', 'traversal', 'duplicate-json', 'missing-runtime']) {
      const bad = path.join(directory, mutation + '.zip');
      run('-c', `import zipfile,json,sys
source,target,mutation=sys.argv[1:]
with zipfile.ZipFile(source) as src, zipfile.ZipFile(target,'w') as dst:
 for i in src.infolist():
  data=src.read(i)
  if mutation=='missing-runtime' and i.filename=='lib/mcp.mjs': continue
  if i.filename=='.minimax-plugin/plugin.json':
   if mutation=='hook':
    obj=json.loads(data); obj['hooks']=[]; data=json.dumps(obj).encode()
   if mutation=='duplicate-json': data=b'{"name":"one","name":"two"}'
  dst.writestr(i,data)
 if mutation=='traversal': dst.writestr('../outside.txt','no')
`, report.archive, bad, mutation);
      const result = spawnSync('python3', ['scripts/pack-minimax.py', '--validate', bad], { cwd: root, encoding: 'utf8' });
      assert.notEqual(result.status, 0, 'must reject ' + mutation);
    }
  } finally {
    if (child) { child.stdin.end(); child.kill(); }
    await rm(directory, { recursive: true, force: true });
  }
});
