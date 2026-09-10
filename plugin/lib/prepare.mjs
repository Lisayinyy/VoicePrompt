import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run } from './process.mjs';

import { validateInput, systemPrompt, protectDraft } from './voice-policy.mjs';
export { validateInput, systemPrompt, guard } from './voice-policy.mjs';

export async function callModel(config, system, text, signal, context = {}) {
  if (config.provider === 'unconfigured') throw new Error('AI polishing is not configured');
  if (config.provider === 'prompt-ai') {
    const url = new URL(config.baseUrl.replace(/\/$/, '') + '/voice/prepare');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS for remote providers');
    const key = process.env[config.apiKeyEnv];
    const response = await fetch(url, { method: 'POST', redirect: 'error', signal,
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ prompt: text, mode: context.mode || 'clean', terms: context.terms || [] }),
    });
    if (!response.ok) throw new Error(`Prompt.ai HTTP ${response.status}`);
    const data = await response.json();
    // Never send voice input through an older optimizer that expands the user's intent.
    if (data.schema !== 'prompt-ai-voice/1' || data.fallback || typeof data.optimized !== 'string') throw new Error('Prompt.ai voice API is unavailable or incompatible');
    return data.optimized.trim();
  }
  if (config.provider === 'openai-compatible') {
    const url = new URL(config.baseUrl.replace(/\/$/, '') + '/chat/completions');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS for remote providers');
    if (!config.model) throw new Error('Configure model');
    const key = process.env[config.apiKeyEnv];
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', signal,
      headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ transcript: text }) }], temperature: 0, max_tokens: 2048, stream: false }),
    });
    if (!response.ok) throw new Error(`AI provider HTTP ${response.status}`);
    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;
    if (typeof output !== 'string') throw new Error('AI provider returned no text');
    return output.trim();
  }
  // Public OMP CLI reuses its own configured provider. No credential files are read.
  // Use an empty working directory and disable discovered skills/extensions/rules and built-in tools.
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-prompt-'));
  try {
    await writeFile(path.join(dir, 'overlay.yml'), 'stt:\n  enabled: false\nmcp:\n  enableProjectConfig: false\nadvisor:\n  enabled: false\n');
    const args = ['--print', '--mode', 'json', '--no-session', '--no-tools', '--no-lsp', '--no-extensions', '--no-skills', '--no-rules', '--no-title', '--thinking', 'minimal', '--config', path.join(dir, 'overlay.yml'), '--system-prompt', system];
    if (config.model) args.push('--model', config.model);
    // Feed transcript on stdin, never through command-line arguments or shell expansion.
    const { stdout } = await run(config.ompCommand, args, { cwd: dir, input: JSON.stringify({ transcript: text }), signal, timeoutMs: config.timeoutMs });
    let output;
    for (const line of stdout.split('\n')) {
      let event; try { event = JSON.parse(line); } catch { continue; }
      if (event.type === 'message_end' && event.message?.role === 'assistant') {
        if (event.message.stopReason === 'error') throw new Error('OMP model request failed');
        output = event.message.content?.filter(c => c.type === 'text').map(c => c.text).join('');
      }
    }
    if (!output?.trim()) throw new Error('OMP returned no assistant text; check provider login');
    return output.trim();
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export async function prepare(config, input, { signal, model = callModel } = {}) {
  validateInput(input);
  const started = performance.now(), raw = input.text.trim(), mode = input.mode || config.defaultMode || 'clean';
  if (mode === 'raw') return { raw, text: raw, mode, fallback: false, warnings: [], elapsedMs: 0 };
  signal?.throwIfAborted();
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const terms = [...new Set([...(config.terms || []), ...(input.terms || [])])].slice(0, 100);
    const text = await model(config, systemPrompt(mode, terms), raw, combined, { mode, terms });
    combined.throwIfAborted();
    return { ...protectDraft(raw, text), mode, elapsedMs: Math.round(performance.now() - started) };
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    return { raw, text: raw, mode, fallback: true, warnings: [timeout.aborted ? 'AI_timeout_original_preserved' : 'AI_unavailable_original_preserved'], elapsedMs: Math.round(performance.now() - started) };
  }
}
