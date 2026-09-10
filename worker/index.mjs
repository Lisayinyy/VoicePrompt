import { handleVoiceRequest } from '../plugin/lib/worker-voice.mjs';

// Minimal voice adapter for embedding in a Prompt.ai Worker.
// This is not a public hosted service. Add authentication and rate limiting
// in the parent Worker before exposing a paid model endpoint.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/voice/prepare' && request.method === 'POST') {
      return handleVoiceRequest(request, env);
    }
    return new Response('Not found', { status: 404 });
  },
};
