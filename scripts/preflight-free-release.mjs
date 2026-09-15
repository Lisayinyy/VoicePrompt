// A public API test is not evidence of input insertion on another Mac.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyEndpoint } from './verify-https.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const missing = [];
// Recheck the real public route on every run. Yesterday's model success must
// never approve a release while today's domain is blocked or TLS is failing.
let publicTransport;
try {
  const result = await verifyEndpoint('https://api.voiceprompt.work');
  publicTransport = { status: 'passed', checkedAt: new Date().toISOString(), ...result };
} catch (error) {
  missing.push('public_https_currently_unavailable');
  publicTransport = { status: 'failed', checkedAt: new Date().toISOString(), reason: error.message };
}
const manifest = await read('minimax/.minimax-plugin/plugin.json');
const version = manifest.version;
const desktop = `dist/voice-prompt-desktop-${version}-macos-arm64.zip`;
const plugin = `dist/minimax/voice-prompt-minimax-${version}.zip`;
let desktopHash, pluginHash;
try { desktopHash = createHash('sha256').update(await readFile(path.join(root, desktop))).digest('hex'); } catch { missing.push('desktop_artifact_missing'); }
try { pluginHash = createHash('sha256').update(await readFile(path.join(root, plugin))).digest('hex'); } catch { missing.push('plugin_artifact_missing'); }
try {
  const api = await read('docs/public-free-verification.json');
  if (api.status !== 'passed' || !api.freeEnrollment || !api.modelVerified || api.invitationRequired !== false || api.origin !== 'https://api.voiceprompt.work') missing.push('public_free_flow_not_verified');
  if (Date.now() - Date.parse(api.checkedAt) > 86400000 || !Number.isFinite(Date.parse(api.checkedAt))) missing.push('public_verification_stale');
} catch { missing.push('public_verification_missing'); }
try {
  const device = await read('verification/new-mac-free.json');
  if (device.source !== 'separate-physical-mac' || device.appVersion !== version || device.desktopSha256 !== desktopHash || device.pluginSha256 !== pluginHash ||
    !['installation', 'automaticFreeSetup', 'aiPolishing', 'microphone', 'minimaxInsertionWithoutSending'].every(k => device[k] === 'passed')) missing.push('new_mac_flow_not_verified_for_these_artifacts');
} catch { missing.push('separate_mac_installation_and_input_test_pending'); }
try {
  const downloads = await read(`verification/public-downloads-${version}.json`);
  if (downloads.status !== 'passed' || downloads.version !== version || downloads.desktopSha256 !== desktopHash || downloads.pluginSha256 !== pluginHash) missing.push('public_downloads_do_not_match_artifacts');
} catch { missing.push('public_download_verification_pending'); }
console.log(JSON.stringify({ status: missing.length ? 'blocked' : 'ready-for-marketplace-update', version, desktop, desktopHash, plugin, pluginHash, publicTransport, missing, marketplaceSubmitted: false }, null, 2));
process.exitCode = missing.length ? 1 : 0;
