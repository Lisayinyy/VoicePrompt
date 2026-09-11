// Run after setup-local-asr.py, with the native app stopped.
import { loadConfig, configPath } from '../plugin/lib/config.mjs';
import { access, copyFile, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
const base = path.join(homedir(), '.local/share/voice-prompt');
const c = await loadConfig();
if (!c.token) throw new Error('Install the desktop app first');
const installed = JSON.parse(await readFile(path.join(base, 'asr-install.json'), 'utf8'));
const python = path.join(base, 'asr-venv/bin/python');
const model = path.join(base, 'models/qwen3-asr-1.7b-8bit');
if (installed.revision !== 'a8379a2e2f9e313c9292cdf1af4055ab56d50d55') throw new Error('Unexpected model revision');
await access(python); await access(path.join(model, 'model.safetensors'));
await copyFile(configPath(), configPath() + '.before-qwen-' + Date.now());
await writeFile(configPath(), JSON.stringify({ ...c, speechModelId: 'qwen3-asr-1.7b', speechLanguage: c.speechLanguage || 'auto', terms: [...new Set([...(c.terms || []), 'Voice Prompt', 'MiniMax Code', 'OMP', 'MCP', 'Codex', 'ChatGPT', 'Prompt AI'])].slice(0, 100), asrPython: python, qwenModelPath: model }, null, 2) + '\n', { mode: 0o600 });
console.log('Qwen selected; AI provider preserved. Microphone and input insertion have not been tested.');
