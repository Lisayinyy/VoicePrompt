import { readFile, writeFile, rename, copyFile, chmod } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { configPath } from './config.mjs';
import { callModel } from './prepare.mjs';

export function betaBase(config) {
  const url = new URL(config.betaServiceUrl || 'https://api.voiceprompt.work');
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) ||
      !(url.protocol === 'https:' || url.origin === 'http://127.0.0.1:18788')) throw new Error('Invalid activation service');
  return url.origin;
}
export async function activateBeta(config, input, { verify, persist, free = false } = {}) {
  if (!input || Object.keys(input).some(k => !['credential', 'keychainAccount'].includes(k)) ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.credential || '') || !/^[a-f0-9]{64}$/.test(input.keychainAccount || '')) throw new Error('Invalid device credential');
  const candidate = { ...config, provider: 'prompt-ai', baseUrl: free ? 'https://api.voiceprompt.work' : betaBase(config),
    apiKeyEnv: 'VOICE_PROMPT_BETA_TOKEN', betaKeychainAccount: input.keychainAccount, betaActivated: true };
  if (free) { candidate.betaServiceUrl = 'https://api.voiceprompt.work'; candidate.hostedFree = true; }
  delete candidate.apiKeyFile;
  // A short-lived environment slot isolates the live check from any currently active provider.
  const temporaryEnv = 'VOICE_PROMPT_VERIFY_' + randomUUID().replaceAll('-', '');
  process.env[temporaryEnv] = input.credential;
  try {
    await (verify || (c => callModel(c, '', '嗯请帮我整理这个想法，保留原意。', AbortSignal.timeout(40000), { mode: 'clean' })))(
      { ...candidate, apiKeyEnv: temporaryEnv });
  } finally { delete process.env[temporaryEnv]; }
  if (persist) await persist(candidate);
  else {
    const file = configPath(), saved = JSON.parse(await readFile(file, 'utf8'));
    const merged = { ...saved, provider: candidate.provider, baseUrl: candidate.baseUrl,
      apiKeyEnv: candidate.apiKeyEnv, betaKeychainAccount: candidate.betaKeychainAccount, betaActivated: true };
    if (free) { merged.betaServiceUrl = candidate.betaServiceUrl; merged.hostedFree = true; }
    delete merged.apiKeyFile;
    const backup = file + '.before-beta-' + Date.now();
    await copyFile(file, backup); await chmod(backup, 0o600);
    const tmp = file + '.' + randomUUID() + '.tmp';
    await writeFile(tmp, JSON.stringify(merged, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(tmp, file);
  }
  process.env.VOICE_PROMPT_BETA_TOKEN = input.credential;
  delete config.apiKeyFile;
  Object.assign(config, candidate);
  return { activated: true, verified: true, provider: 'prompt-ai', baseUrl: candidate.baseUrl };
}
