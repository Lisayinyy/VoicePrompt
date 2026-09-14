import { access, readFile } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.mjs';

const exists = async file => { try { await access(file); return true; } catch { return false; } };
// Only the running desktop process can report its own macOS authorization.
// A fresh report is diagnostic evidence, not proof of successful microphone capture.
export async function inputDiagnostics(home, now = Date.now()) {
  let d;
  try { d = JSON.parse(await readFile(path.join(home, '.config/voice-prompt/input-diagnostics.json'), 'utf8')); }
  catch { return { status: 'unavailable', next: 'Open the updated Voice Prompt desktop app to check permissions and insertion.' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { status: 'invalid' };
  if (d.schema !== 'voice-prompt-input/1' || d.bundleIdentifier !== 'ai.voiceprompt.desktop' ||
      !Number.isSafeInteger(d.pid) || d.pid < 1 || !Number.isFinite(d.updatedAt) ||
      now - d.updatedAt * 1000 > 15000 || d.updatedAt * 1000 > now + 1000) return { status: 'stale' };
  try { process.kill(d.pid, 0); } catch { return { status: 'stale' }; }
  const report = { status: 'recent-desktop-report' };
  for (const key of ['microphoneGranted', 'accessibilityGranted', 'autoInsert']) {
    if (typeof d[key] !== 'boolean') return { status: 'invalid' };
    report[key] = d[key];
  }
  for (const key of ['appVersion', 'appBuild', 'phase', 'insertionState', 'failureReason']) {
    if (typeof d[key] === 'string' && d[key].length <= 300) report[key] = d[key];
  }
  return report;
}
// Read-only and useful before the companion has ever been installed or configured.
export async function setupStatus({ home = homedir(), config, system = platform(), machine = arch() } = {}) {
  const c = config || await loadConfig();
  const resources = path.join(home, 'Applications/Voice Prompt.app/Contents/Resources');
  let desktopVersion = null;
  try { desktopVersion = JSON.parse(await readFile(path.join(resources, 'components.json'), 'utf8')).version || null; } catch {}
  const desktopInstalled = await exists(path.join(resources, 'bin/node')) && await exists(path.join(home, 'Applications/Voice Prompt.app/Contents/MacOS/VoicePrompt'));
  const pythonInstalled = Boolean(c.asrPython) && await exists(c.asrPython);
  const weightsPresent = Boolean(c.qwenModelPath) && await exists(path.join(c.qwenModelPath, 'model.safetensors'));
  return {
    platform: system, architecture: machine, supportedHardware: system === 'darwin' && machine === 'arm64',
    qwenMinimumMacOS: '15', desktopInstalled, desktopVersion, pythonInstalled, weightsPresent,
    inputDiagnostics: await inputDiagnostics(home),
    selectedModel: c.speechModelId || 'sensevoice-small',
    aiProviderConfigured: Boolean(c.provider && c.provider !== 'unconfigured'),
    aiProvider: c.provider || 'unconfigured',
    setupGuide: 'https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md',
    verification: 'Components use file presence; inputDiagnostics is a recent self-report from the desktop app when available. Does not verify model hashes, inference, AI credentials or physical microphone capture; confirmed insertion requires desktop readback.',
  };
}
