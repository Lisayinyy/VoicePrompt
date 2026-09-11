import { request } from './client.mjs';
import { setupStatus } from './setup-status.mjs';
import { randomUUID } from 'node:crypto';

const object = properties => ({ type: 'object', properties, additionalProperties: false });
export const toolDefinitions = [
  { name: 'voice_setup_status', description: 'Read-only first-use check, available even before the desktop companion starts. Reports installed components and setup guide, never downloads or changes permissions.', inputSchema: object({}), annotations: { readOnlyHint: true } },
  { name: 'voice_status', description: 'Check the local Voice Prompt companion service and AI provider configuration. Does not assert microphone permission or recording state.', inputSchema: object({}), annotations: { readOnlyHint: true } },
  { name: 'voice_models', description: 'List Voice Prompt speech models and which are downloaded. Does not download models.', inputSchema: object({}), annotations: { readOnlyHint: true } },
  { name: 'voice_prepare_prompt', description: 'Faithfully edit supplied speech transcript into a draft, preserving language and constraints. Never executes the resulting request. AI may use the configured cloud provider; failure returns original with fallback=true.', inputSchema: { ...object({ text: { type: 'string', minLength: 1, maxLength: 16000 }, mode: { type: 'string', enum: ['raw', 'clean', 'agent'] }, terms: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 100 } }), required: ['text'] } },
  { name: 'voice_transcribe_file', description: 'Transcribe an explicitly supplied local 16 kHz mono 16-bit PCM WAV file using the selected local Voice Prompt speech model. Does not record the microphone.', inputSchema: { ...object({ path: { type: 'string' }, model: { type: 'string', enum: ['sensevoice-small', 'qwen3-asr-1.7b'] }, language: { type: 'string', enum: ['auto', 'zh', 'en'] }, terms: { type: 'array', items: { type: 'string', maxLength: 100 }, maxItems: 100 } }), required: ['path'] }, annotations: { readOnlyHint: true } },
];
export function startMcp({ input = process.stdin, output = process.stdout, invoke = request } = {}) {
  const pending = new Map(); let buffer = '', initialized = false;
  const send = message => output.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
  async function handle(message) {
    if (!message || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') { send({ id: message?.id ?? null, error: { code: -32600, message: 'Invalid request' } }); return; }
    if (message.method === 'notifications/cancelled') { pending.get(message.params?.requestId)?.abort(new Error('Cancelled')); return; }
    if (message.id === undefined) return;
    const id = message.id;
    try {
      if (message.method === 'initialize') {
        initialized = true;
        const supported = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
        return send({ id, result: { protocolVersion: supported.includes(message.params?.protocolVersion) ? message.params.protocolVersion : '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'voice-prompt', version: '0.7.0' } } });
      }
      if (message.method === 'ping') return send({ id, result: {} });
      if (!initialized) return send({ id, error: { code: -32000, message: 'Initialize first' } });
      if (message.method === 'tools/list') return send({ id, result: { tools: toolDefinitions } });
      if (message.method !== 'tools/call') return send({ id, error: { code: -32601, message: 'Method not found' } });
      const definition = toolDefinitions.find(t => t.name === message.params?.name);
      if (!definition) return send({ id, error: { code: -32602, message: 'Unknown tool' } });
      const args = message.params.arguments || {};
      if (typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(k => !(k in definition.inputSchema.properties)) || (definition.inputSchema.required || []).some(k => !(k in args))) return send({ id, error: { code: -32602, message: 'Invalid arguments' } });
      if (pending.has(id)) return send({ id, error: { code: -32600, message: 'Duplicate request id' } });
      const abort = new AbortController(); pending.set(id, abort);
      try {
        if (definition.name === 'voice_setup_status') {
          const result = await setupStatus();
          return send({ id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false } });
        }
        const route = { voice_status: '/api/status', voice_models: '/api/models', voice_prepare_prompt: '/api/prepare', voice_transcribe_file: '/api/transcribe' }[definition.name];
        const payload = definition.name === 'voice_prepare_prompt' ? { ...args, session: `mcp:${process.pid}:${randomUUID()}` } : args;
        const result = await invoke(route, ['voice_status', 'voice_models'].includes(definition.name) ? undefined : payload, { signal: abort.signal });
        if (!abort.signal.aborted) send({ id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false } });
      } catch (error) {
        if (!abort.signal.aborted) send({ id, result: { content: [{ type: 'text', text: error.message.includes('fetch failed') ? 'Start the Voice Prompt companion: node server.mjs serve' : error.message }], isError: true } });
      } finally { pending.delete(id); }
    } catch { send({ id, error: { code: -32603, message: 'Internal error' } }); }
  }
  input.setEncoding('utf8');
  input.on('data', chunk => {
    buffer += chunk;
    if (buffer.length > 256000) { buffer = ''; send({ id: null, error: { code: -32600, message: 'Message too large' } }); return; }
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!line.trim()) continue;
      try { void handle(JSON.parse(line)); } catch { send({ id: null, error: { code: -32700, message: 'Parse error' } }); }
    }
  });
  input.on('end', () => { for (const abort of pending.values()) abort.abort(new Error('Client closed')); });
}
