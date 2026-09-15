import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';

const digest = value => createHash('sha256').update(value).digest('hex');
const hex = /^[a-f0-9]{64}$/;
export const normalizeCode = value => typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '';
export function makeInvitationBatch(count, { now = Date.now(), dailyLimit = 30 } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Invalid batch size');
  const codes = new Set();
  while (codes.size < count) codes.add('VP-' + randomBytes(12).toString('hex').toUpperCase().match(/.{6}/g).join('-'));
  const records = [...codes].map(code => ({ id: 'beta_' + randomBytes(10).toString('hex'), codeHash: digest(normalizeCode(code)),
    redeemBefore: now + 7 * 86400000, entitlementDays: 30, dailyLimit, enabled: true }));
  return { codes: [...codes], records };
}
export function invitationStore(file, now = () => Date.now()) {
  function read() {
    const s = statSync(file);
    if (!s.isFile() || s.size > 2e6 || (s.mode & 0o077)) throw new Error('Invitation store must be private');
    const rows = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(rows) || rows.some(r => !/^beta_[a-f0-9]{20}$/.test(r.id) || !hex.test(r.codeHash) ||
      !Number.isFinite(r.redeemBefore) || !Number.isInteger(r.entitlementDays) || r.entitlementDays < 1 ||
      !Number.isInteger(r.dailyLimit) || r.dailyLimit < 1 || (r.tokenHash && (!hex.test(r.tokenHash) || !Number.isFinite(r.expiresAt)))) ||
      new Set(rows.map(r => r.codeHash)).size !== rows.length || new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Invalid invitations');
    return rows;
  }
  const equal = (a, b) => timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  const fail = (status, error) => ({ status, body: { error } });
  read();
  return {
    redeem(input) {
      if (!input || Object.keys(input).some(k => !['code', 'credential'].includes(k)) ||
        !/^VP[A-F0-9]{24}$/.test(normalizeCode(input.code)) || !/^[A-Za-z0-9_-]{43}$/.test(input.credential || '')) return fail(400, 'invalid_invitation');
      const rows = read(), codeHash = digest(normalizeCode(input.code)), tokenHash = digest(input.credential);
      const record = rows.find(r => equal(codeHash, r.codeHash));
      if (!record || !record.enabled) return fail(403, 'invalid_invitation');
      if (record.tokenHash) {
        if (!equal(record.tokenHash, tokenHash)) return fail(409, 'invitation_used');
        if (now() >= record.expiresAt) return fail(403, 'entitlement_expired');
      } else {
        if (now() >= record.redeemBefore) return fail(410, 'invitation_expired');
        if (rows.some(r => r.tokenHash === tokenHash)) return fail(409, 'device_already_activated');
        record.tokenHash = tokenHash; record.activatedAt = now(); record.expiresAt = now() + record.entitlementDays * 86400000;
        // Synchronous read-modify-rename: single-process atomic redemption and crash-safe retries.
        writeFileSync(file + '.tmp', JSON.stringify(rows, null, 2) + '\n', { mode: 0o600, flush: true });
        renameSync(file + '.tmp', file);
      }
      return { status: 200, body: { activated: true, id: record.id, expiresAt: record.expiresAt, dailyLimit: record.dailyLimit } };
    },
    authenticate(hash) {
      if (!hex.test(hash)) return undefined;
      return read().find(r => r.enabled && r.tokenHash && now() < r.expiresAt && equal(hash, r.tokenHash));
    },
  };
}
