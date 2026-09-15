import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifact = path.join(root, 'dist/voice-prompt-desktop-0.8.0-macos-arm64.zip');
let artifactExists = false;
try { await access(artifact); artifactExists = true; } catch {}

test('desktop upgrade preserves personal AI, model and input preferences in an isolated home', {
  skip: process.platform !== 'darwin' || process.arch !== 'arm64' || !artifactExists,
}, async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-desktop-upgrade-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const configDir = path.join(home, '.config/voice-prompt');
  await mkdir(configDir, { recursive: true });
  const before = { provider: 'omp', ompCommand: '/fixture/omp', token: 'fixture-private-token',
    speechModelId: 'qwen3-asr-1.7b', qwenModelPath: '/fixture/model', asrPython: '/fixture/python',
    speechLanguage: 'en', autoInsert: true };
  await writeFile(path.join(configDir, 'config.json'), JSON.stringify(before));
  const oldApp = path.join(home, 'Applications/Voice Prompt.app');
  await mkdir(oldApp, { recursive: true });
  await writeFile(path.join(oldApp, 'previous-installation'), 'backup-me');
  const install = spawnSync(process.execPath, ['scripts/install.mjs', '--test-root=' + home], { cwd: root, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  const after = JSON.parse(await readFile(path.join(configDir, 'config.json'), 'utf8'));
  for (const key of Object.keys(before)) assert.equal(after[key], before[key], key);
  const backups = await readdir(path.join(configDir, 'backups'));
  assert.equal(backups.length, 1);
  assert.equal(await readFile(path.join(configDir, 'backups', backups[0], 'Voice Prompt.app/previous-installation'), 'utf8'), 'backup-me');
  const manifest = JSON.parse(await readFile(path.join(oldApp, 'Contents/Resources/components.json'), 'utf8'));
  assert.equal(manifest.version, '0.8.0');
  assert.equal(manifest.build, '30');
  const signature = spawnSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', oldApp], { encoding: 'utf8' });
  assert.equal(signature.status, 0, signature.stderr);
  assert.ok(!install.stdout.includes(before.token));
});

test('fresh desktop installation has public activation defaults and no publisher credentials', {
  skip: process.platform !== 'darwin' || process.arch !== 'arm64' || !artifactExists,
}, async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-desktop-fresh-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const install = spawnSync(process.execPath, ['scripts/install.mjs', '--test-root=' + home], { cwd: root, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  const config = JSON.parse(await readFile(path.join(home, '.config/voice-prompt/config.json'), 'utf8'));
  assert.equal(config.provider, 'unconfigured');
  for (const key of ['apiKeyFile', 'betaKeychainAccount', 'betaActivated', 'betaServiceUrl']) assert.equal(config[key], undefined);
  const app = path.join(home, 'Applications/Voice Prompt.app');
  const manifest = JSON.parse(await readFile(path.join(app, 'Contents/Resources/components.json'), 'utf8'));
  assert.equal(manifest.publicFreeEnrollment, true);
  assert.equal(manifest.betaServiceUrl, 'https://api.voiceprompt.work');
  const { betaBase } = await import('../plugin/lib/beta-client.mjs');
  assert.equal(betaBase(config), manifest.betaServiceUrl);
  assert.ok(!JSON.stringify(config).includes('/Users/lisayin'));
  assert.ok(!install.stdout.includes(config.token));
});
