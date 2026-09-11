import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export const configPath = () => process.env.VOICE_PROMPT_CONFIG || path.join(homedir(), '.config/voice-prompt/config.json');
export async function loadConfig() {
  let saved = {};
  try { saved = JSON.parse(await readFile(configPath(), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return {
    port: 17865, provider: 'unconfigured', ompCommand: path.join(homedir(), '.local/bin/omp'),
    engineCommand: path.join(homedir(), 'Applications/Voice Prompt.app/Contents/Resources/bin/voice-asr'),
    speechModel: path.join(homedir(), 'Applications/Voice Prompt.app/Contents/Resources/models/sensevoice-small.gguf'),
    speechModelId: 'sensevoice-small', speechLanguage: 'auto',
    asrPython: path.join(homedir(), '.local/share/voice-prompt/asr-venv/bin/python'),
    qwenModelPath: path.join(homedir(), '.local/share/voice-prompt/models/qwen3-asr-1.7b-8bit'),
    model: '', baseUrl: '', apiKeyEnv: 'VOICE_PROMPT_API_KEY', timeoutMs: 45000,
    defaultMode: 'agent', terms: [], ...saved,
  };
}
export async function initConfig() {
  const c = await loadConfig();
  if (!c.token) {
    c.token = randomBytes(32).toString('hex');
    await mkdir(path.dirname(configPath()), { recursive: true, mode: 0o700 });
    await writeFile(configPath(), JSON.stringify(c, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  if (c.defaultMode && !['clean', 'agent'].includes(c.defaultMode)) throw new Error('Invalid defaultMode');
  if (c.speechModelId && !['sensevoice-small', 'qwen3-asr-1.7b'].includes(c.speechModelId)) throw new Error('Invalid speech model');
  if (c.speechLanguage && !['auto', 'zh', 'en'].includes(c.speechLanguage)) throw new Error('Invalid speech language');
  return c;
}
export function validateConfig(c) {
  if (!Number.isInteger(c.port) || c.port < 1024 || c.port > 65535) throw new Error('Invalid port');
  if (!['unconfigured', 'omp', 'openai-compatible', 'prompt-ai'].includes(c.provider)) throw new Error('Unsupported provider');
  if (!Number.isFinite(c.timeoutMs) || c.timeoutMs < 100 || c.timeoutMs > 300000) throw new Error('Invalid timeoutMs');
  if (!Array.isArray(c.terms) || c.terms.length > 100 || c.terms.some(t => typeof t !== 'string' || t.length > 100)) throw new Error('Invalid terms');
  if (c.defaultMode && !['clean', 'agent'].includes(c.defaultMode)) throw new Error('Invalid defaultMode');
  if (c.speechModelId && !['sensevoice-small', 'qwen3-asr-1.7b'].includes(c.speechModelId)) throw new Error('Invalid speech model');
  if (c.speechLanguage && !['auto', 'zh', 'en'].includes(c.speechLanguage)) throw new Error('Invalid speech language');
  return c;
}

export async function savePreferences(patch) {
  if (!patch || !Object.keys(patch).length || Object.keys(patch).some(k => !['defaultMode', 'speechModelId', 'speechLanguage'].includes(k))) throw new Error('Invalid preferences');
  if ('speechModelId' in patch && !['sensevoice-small', 'qwen3-asr-1.7b'].includes(patch.speechModelId)) throw new Error('Invalid speech model');
  if ('speechLanguage' in patch && !['auto', 'zh', 'en'].includes(patch.speechLanguage)) throw new Error('Invalid speech language');
  if ('defaultMode' in patch && !['clean', 'agent'].includes(patch.defaultMode)) throw new Error('Invalid default mode');
  const c = await loadConfig();
  validateConfig({ ...c, ...patch });
  await writeFile(configPath(), JSON.stringify({ ...c, ...patch }, null, 2) + '\n', { mode: 0o600 });
  return patch;
}
