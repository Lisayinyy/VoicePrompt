// Private, loopback-only pilot. Reuses the owner's existing SSH-protected backend
// connection; no MiniMax vendor key is downloaded or included in the app.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createBackend } from '../backend/server.mjs';
import { providerKey } from '../plugin/lib/provider-key.mjs';

const dir = process.argv[2];
if (!dir || !path.isAbsolute(dir)) throw new Error('Private runtime directory required');
const upstream = JSON.parse(readFileSync(path.join(dir, 'upstream.json'), 'utf8'));
const endpoint = new URL(upstream.baseUrl);
if (endpoint.origin !== 'http://127.0.0.1:18787') throw new Error('Local pilot requires the existing protected loopback tunnel');
const key = await providerKey(upstream);
const server = createBackend({ VOICE_STATE_DIR: dir, VOICE_CLIENTS_FILE: path.join(dir, 'clients.json'),
  VOICE_INVITATIONS_FILE: path.join(dir, 'invitations.json'), VOICE_EXPECT_HOST: '127.0.0.1:18788',
  VOICE_GLOBAL_DAILY_LIMIT: '60', VOICE_GLOBAL_MONTHLY_LIMIT: '600' }, {
  isReady: () => Boolean(key),
  prepareVoice: request => fetch(endpoint.origin + '/voice/prepare', { method: 'POST', redirect: 'error',
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(35000)]),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: request.body, duplex: 'half' }),
});
server.listen(18788, '127.0.0.1', () => console.log('Local invitation pilot listening on loopback:18788'));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(); setTimeout(() => process.exit(0), 1000).unref(); });
