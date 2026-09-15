import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';

const hash = value => createHash('sha256').update(value).digest('hex');
const hex = /^[a-f0-9]{64}$/;
export function publicClientStore(file, { now = Date.now, dailyLimit = 30 } = {}) {
  const save = state => {
    writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600, flush: true });
    renameSync(file + '.tmp', file);
  };
  try { statSync(file); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    writeFileSync(file, JSON.stringify({ salt: randomBytes(32).toString('hex'), day: '', created: 0, networks: {}, clients: [] }), { mode: 0o600, flag: 'wx' });
  }
  function read() {
    const s = statSync(file);
    if (!s.isFile() || s.size > 4e6 || (s.mode & 0o077)) throw new Error('Public client store must be private');
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (!hex.test(state.salt) || !Array.isArray(state.clients) || state.clients.length > 10000 ||
      state.clients.some(c => !/^free_[a-f0-9]{20}$/.test(c.id) || !hex.test(c.tokenHash) || !Number.isInteger(c.dailyLimit) || c.dailyLimit < 1) ||
      new Set(state.clients.map(c => c.tokenHash)).size !== state.clients.length || new Set(state.clients.map(c => c.id)).size !== state.clients.length ||
      !state.networks || typeof state.networks !== 'object' || !Number.isInteger(state.created) || state.created < 0) throw new Error('Invalid public client store');
    return state;
  }
  const find = (state, digest) => state.clients.find(c => timingSafeEqual(Buffer.from(c.tokenHash, 'hex'), Buffer.from(digest, 'hex')));
  read();
  return {
    enroll(input, ip) {
      if (!input || Object.keys(input).some(k => k !== 'credential') || !/^[A-Za-z0-9_-]{43}$/.test(input.credential || '')) return { status: 400, body: { error: 'invalid_device' } };
      const state = read(), digest = hash(input.credential);
      let client = find(state, digest);
      if (client && !client.enabled) return { status: 403, body: { error: 'device_disabled' } };
      if (!client) {
        const day = new Date(now() + 8 * 3600000).toISOString().slice(0, 10);
        if (state.day !== day) { state.day = day; state.created = 0; state.networks = {}; }
        // Daily salted network buckets, no raw IP or transcript in the persistent store.
        const network = createHmac('sha256', state.salt).update(day + ':' + ip).digest('hex');
        if (state.clients.length >= 10000 || state.created >= 500 || (state.networks[network] || 0) >= 100) return { status: 429, body: { error: 'enrollment_limit' } };
        client = { id: 'free_' + randomBytes(10).toString('hex'), tokenHash: digest, enabled: true, dailyLimit };
        state.clients.push(client); state.created++; state.networks[network] = (state.networks[network] || 0) + 1;
        save(state);
      }
      return { status: 200, body: { activated: true, plan: 'free', id: client.id, dailyLimit: client.dailyLimit } };
    },
    authenticate(digest) {
      if (!hex.test(digest)) return undefined;
      const client = find(read(), digest);
      return client?.enabled ? client : undefined;
    },
  };
}
