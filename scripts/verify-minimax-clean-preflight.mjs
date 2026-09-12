#!/usr/bin/env node
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const archive = process.argv[2] || path.join(root, 'dist/minimax/voice-prompt-minimax-0.7.1.zip');
const out = process.argv[3] || path.join(root, 'docs/minimax-clean-preflight-report.json');
const run = (cmd, args, options = {}) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...options });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
};
const sha256 = file => createHash('sha256').update(spawnSync('cat', [file]).stdout).digest('hex');

let directory, child;
const checks = [];
const record = (check, ok, details = {}) => checks.push({ check, ok, details });
try {
  directory = await mkdtemp(path.join(tmpdir(), 'voice-minimax-clean-preflight-'));
  const validation = JSON.parse(run('python3', ['scripts/pack-minimax.py', '--validate', archive]));
  record('zip_local_preflight', validation.localPreflight === 'passed', validation);
  const extracted = path.join(directory, 'unpacked');
  run('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, extracted]);
  const manifest = JSON.parse(await readFile(path.join(extracted, '.minimax-plugin/plugin.json'), 'utf8'));
  record('manifest_loaded', manifest.name === 'voice-prompt' && manifest.version === validation.version, { name: manifest.name, version: manifest.version });
  const mcpEnvelope = JSON.parse(await readFile(path.join(extracted, 'voice-prompt.mcp.json'), 'utf8'));
  const mcp = mcpEnvelope.mcpServers['voice-prompt'];
  const emptyHome = path.join(directory, 'empty-home');
  await mkdir(emptyHome);
  const env = {
    HOME: emptyHome,
    PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
    VOICE_PROMPT_CONFIG: path.join(directory, 'missing-config.json'),
  };
  child = spawn(mcp.command, mcp.args, { cwd: extracted, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '', seq = 0;
  const waiting = new Map();
  child.stderr.on('data', c => { stderr += c; });
  child.stdout.on('data', c => {
    buffer += c;
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const raw = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      const message = JSON.parse(raw);
      const resolve = waiting.get(message.id);
      waiting.delete(message.id);
      resolve?.(message);
    }
  });
  const call = (method, params) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`MCP timeout for ${method}: ${stderr}`)); }, 5000);
    waiting.set(id, message => { clearTimeout(timer); resolve(message); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
  const init = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'clean-preflight', version: '1' } });
  record('mcp_initialize', init.result?.serverInfo?.name === 'voice-prompt' && init.result?.serverInfo?.version === manifest.version, init.result?.serverInfo || {});
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await call('tools/list', {});
  const toolNames = listed.result?.tools?.map(t => t.name) || [];
  record('mcp_tools_list', toolNames.length === 5 && toolNames.includes('voice_setup_status') && toolNames.includes('voice_prepare_prompt'), { tools: toolNames });
  const setup = await call('tools/call', { name: 'voice_setup_status', arguments: {} });
  const setupState = JSON.parse(setup.result.content[0].text);
  record('first_use_setup_status', setup.result.isError === false && setupState.desktopInstalled === false && setupState.aiProviderConfigured === false, setupState);
  const polish = await call('tools/call', { name: 'voice_prepare_prompt', arguments: { text: 'Keep version 2.0 and do not change the database.', mode: 'agent' } });
  record('missing_companion_does_not_fake_polish', polish.result.isError === true, { isError: polish.result.isError, message: polish.result.content?.[0]?.text });
  const noRuntimeEnv = { ...env, PATH: '/usr/bin:/bin' };
  const noRuntime = spawnSync('/bin/sh', ['./mcp-launch.sh'], { cwd: extracted, env: noRuntimeEnv, encoding: 'utf8' });
  const darwinNoRuntimeOk = process.platform !== 'darwin' || (noRuntime.status === 1 && /first-use setup/.test(noRuntime.stderr || '') && noRuntime.stdout === '');
  record('no_runtime_diagnostic', darwinNoRuntimeOk, { platform: process.platform, status: noRuntime.status, stderr: noRuntime.stderr.trim() });
  const report = {
    date: new Date().toISOString(),
    status: checks.every(c => c.ok) ? 'passed' : 'failed',
    scope: 'Automated isolated package preflight only. This is not a physical clean-machine install, microphone permission test, ASR quality test, or MiniMax marketplace review.',
    archive: path.relative(root, archive),
    archiveSha256: sha256(archive),
    tempHomeUsed: true,
    developerPrivateConfigUsed: false,
    checks,
  };
  await writeFile(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
} finally {
  if (child) { child.stdin.end(); child.kill(); }
  if (directory) await rm(directory, { recursive: true, force: true });
}
