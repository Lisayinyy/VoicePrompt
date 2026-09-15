import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setupStatus, inputDiagnostics } from '../plugin/lib/setup-status.mjs';

test('first-use inspection works without desktop/config and never creates files', async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-empty-')); t.after(() => rm(home, { recursive: true }));
  const result = await setupStatus({ home, config: {}, system: 'darwin', machine: 'arm64' });
  assert.equal(result.desktopInstalled, false); assert.equal(result.pythonInstalled, false);
  assert.equal(result.weightsPresent, false); assert.equal(result.aiProviderConfigured, false);
  assert.equal(result.aiSetupMode, 'automatic_free'); assert.equal(result.aiConnectionVerified, false);
  assert.match(result.aiNextStep, /No user API Key/);
  assert.deepEqual(await readdir(home), []);
});
test('readiness separates installed files from actual inference, AI and input verification', async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-setup-')); t.after(() => rm(home, { recursive: true }));
  const app = path.join(home, 'Applications/Voice Prompt.app/Contents');
  await mkdir(path.join(app, 'Resources/bin'), { recursive: true }); await mkdir(path.join(app, 'MacOS'));
  await writeFile(path.join(app, 'Resources/bin/node'), 'fixture'); await writeFile(path.join(app, 'MacOS/VoicePrompt'), 'fixture');
  await writeFile(path.join(app, 'Resources/components.json'), JSON.stringify({ version: '0.7.0' }));
  const config = { provider: 'omp', token: 'private-token-must-never-appear', speechModelId: 'qwen3-asr-1.7b' };
  const result = await setupStatus({ home, config, system: 'darwin', machine: 'arm64' });
  assert.equal(result.desktopInstalled, true); assert.equal(result.desktopVersion, '0.7.0');
  assert.equal(result.weightsPresent, false); assert.equal(result.aiProviderConfigured, true);
  assert.equal(result.aiSetupMode, 'existing_custom_provider'); assert.equal(result.aiConnectionVerified, false);
  assert.ok(!JSON.stringify(result).includes(config.token)); assert.match(result.verification, /Does not verify/);
  const unsupported = await setupStatus({ home, config, system: 'win32', machine: 'x64' });
  assert.equal(unsupported.supportedHardware, false);
});
test('saved free activation is configuration evidence, not a current connection check', async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-free-status-')); t.after(() => rm(home, { recursive: true }));
  const result = await setupStatus({ home, config: { provider: 'prompt-ai', hostedFree: true, betaActivated: true } });
  assert.equal(result.aiSetupMode, 'automatic_free');
  assert.equal(result.aiProviderConfigured, true);
  assert.equal(result.aiConnectionVerified, false);
  assert.match(result.aiNextStep, /No user API Key/);
});
test('both import formats include the same first-use instructions without the desktop runtime', async () => {
  const root = new URL('../', import.meta.url);
  const a = await readFile(new URL('skills/voice-prompt/references/setup.md', root), 'utf8');
  const b = await readFile(new URL('plugin/skills/voice-prompt/references/setup.md', root), 'utf8');
  assert.equal(a, b);
});

test('input diagnostics reject stale reports and expose no arbitrary fields', async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'voice-input-report-')); t.after(() => rm(home, { recursive: true }));
  const dir = path.join(home, '.config/voice-prompt'); await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'input-diagnostics.json');
  const now = Date.now();
  const report = { schema: 'voice-prompt-input/1', bundleIdentifier: 'ai.voiceprompt.desktop', pid: process.pid,
    updatedAt: now / 1000, appVersion: '0.7.1', appBuild: '24', microphoneGranted: true,
    accessibilityGranted: false, autoInsert: true, insertionState: 'accessibility_required', secret: 'must-not-appear' };
  await writeFile(file, JSON.stringify(report));
  const result = await inputDiagnostics(home, now);
  assert.equal(result.accessibilityGranted, false); assert.equal(result.status, 'recent-desktop-report');
  assert.ok(!JSON.stringify(result).includes(report.secret));
  assert.equal((await inputDiagnostics(home, now + 16000)).status, 'stale');
  await writeFile(file, JSON.stringify({ ...report, updatedAt: (now + 10000) / 1000 }));
  assert.equal((await inputDiagnostics(home, now)).status, 'stale');
  await writeFile(file, JSON.stringify({ ...report, accessibilityGranted: 'true' }));
  assert.equal((await inputDiagnostics(home, now)).status, 'invalid');
  await writeFile(file, 'null');
  assert.equal((await inputDiagnostics(home, now)).status, 'invalid');
});
