import { loadConfig } from './config.mjs';

export async function request(route, body, { signal, config } = {}) {
  const c = config || await loadConfig();
  if (!c.token) throw new Error('Run node server.mjs init, then node server.mjs serve');
  const response = await fetch(`http://127.0.0.1:${c.port}${route}`, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: { authorization: `Bearer ${c.token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || `Voice service HTTP ${response.status}`);
  return result;
}
