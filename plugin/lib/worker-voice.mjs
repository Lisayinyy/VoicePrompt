import { validateInput, systemPrompt, protectDraft } from './voice-policy.mjs';

// The Worker and desktop bridge share the same voice-specific editing policy.
// The older website optimizer remains available separately for deliberate expansion.
export async function handleVoiceRequest(request, env, fetchModel = fetch) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
  const send = (status, data) => new Response(JSON.stringify(data), { status, headers });
  let raw;
  try {
    const { prompt, mode = 'clean', terms = [] } = await request.json();
    validateInput({ text: prompt, mode, terms });
    raw = prompt.trim();
    if (mode === 'raw') return send(200, { schema: 'prompt-ai-voice/1', optimized: raw, raw, fallback: false, warnings: [], mode });
    if (!env.MINIMAX_API_KEY) throw new Error('Model is not configured');
    const endpoint = new URL(env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1');
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('Invalid model endpoint');
    const model = env.MINIMAX_MODEL || 'MiniMax-M2.7';
    const response = await fetchModel(endpoint.href.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
      redirect: 'error',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.MINIMAX_API_KEY}` },
      body: JSON.stringify({ model, temperature: 0, max_tokens: 2048, reasoning_split: true,
        ...(model === 'MiniMax-M3' ? { thinking: { type: 'disabled' } } : {}),
        messages: [{ role: 'system', content: systemPrompt(mode, terms) }, { role: 'user', content: JSON.stringify({ transcript: raw }) }] }),
    });
    if (!response.ok) throw new Error('Model request failed');
    const content = (await response.json()).choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Empty model response');
    const result = protectDraft(raw, content.trim());
    return send(200, { schema: 'prompt-ai-voice/1', ...result, optimized: result.text, mode });
  } catch (error) {
    if (!raw) return send(400, { error: error.message });
    return send(502, { schema: 'prompt-ai-voice/1', raw, optimized: raw, fallback: true, warnings: ['AI_unavailable_original_preserved'] });
  }
}
