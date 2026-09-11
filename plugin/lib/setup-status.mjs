import { access, readFile } from 'node:fs/promises';
import { homedir, platform, arch } from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.mjs';

const exists = async file => { try { await access(file); return true; } catch { return false; } };
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
    selectedModel: c.speechModelId || 'sensevoice-small',
    aiProviderConfigured: Boolean(c.provider && c.provider !== 'unconfigured'),
    aiProvider: c.provider || 'unconfigured',
    setupGuide: 'https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md',
    verification: 'File presence only. Does not verify model hashes, inference, AI credentials, permissions, or input insertion.',
  };
}
