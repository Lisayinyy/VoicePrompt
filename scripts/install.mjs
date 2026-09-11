// Local developer installer. Public marketplace connectors cannot run native installers.
import { readFile, writeFile, mkdir, cp, rename, lstat, symlink, access, mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Voice Prompt 0.7.0 runtime supports Apple Silicon macOS only');
const root = fileURLToPath(new URL('../', import.meta.url)), home = homedir();
const temporary = await mkdtemp(path.join(tmpdir(), 'voice-prompt-install-'));
const unpack = spawnSync('/usr/bin/ditto', ['-x', '-k', path.join(root, 'dist/voice-prompt-desktop-0.7.0-macos-arm64.zip'), temporary], { encoding: 'utf8' });
if (unpack.status !== 0) throw new Error(unpack.stderr);
const source = path.join(temporary, 'Voice Prompt.app'), destination = path.join(home, 'Applications/Voice Prompt.app');
await access(path.join(source, 'Contents/Resources/models/sensevoice-small.gguf'));
const check = spawnSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', source], { encoding: 'utf8' });
if (check.status !== 0) throw new Error(check.stderr);
if (spawnSync('/usr/bin/pgrep', ['-x', 'VoicePrompt']).status === 0) throw new Error('Quit Voice Prompt before updating it');
const dir = path.join(home, '.config/voice-prompt'), backup = path.join(dir, 'backups', new Date().toISOString().replaceAll(':', '-'));
await mkdir(backup, { recursive: true, mode: 0o700 }); await mkdir(path.dirname(destination), { recursive: true });
try { await lstat(destination); await rename(destination, path.join(backup, 'Voice Prompt.app')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
await cp(source, destination, { recursive: true });
let config = {};
try { config = JSON.parse(await readFile(path.join(dir, 'config.json'), 'utf8')); await cp(path.join(dir, 'config.json'), path.join(backup, 'config.json')); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
// Explicit migration option applies only to the current user's earlier installation.
if (process.argv.includes('--migrate-legacy') && !config.token) {
 try { const old = path.join(home, '.config/handy-voice/config.json'); config = JSON.parse(await readFile(old, 'utf8')); await cp(old, path.join(backup, 'legacy-config.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
const resources = path.join(destination, 'Contents/Resources');
config = { provider: 'unconfigured', defaultMode: 'agent', ...config, port: 17866, token: config.token || randomBytes(32).toString('hex'), engineCommand: path.join(resources, 'bin/voice-asr'), speechModel: path.join(resources, 'models/sensevoice-small.gguf') };
delete config.handyCommand;
await writeFile(path.join(dir, 'config.json'), JSON.stringify(config, null, 2)+'\n', { mode: 0o600 });
await writeFile(path.join(dir, 'runtime-path'), path.join(resources, 'bin/node'), { mode: 0o600 });
const mcode = process.argv.find(a => a.startsWith('--mcode='))?.slice(8);
if (mcode) {
 if (!path.isAbsolute(mcode)) throw new Error('MCode data directory must be absolute');
 try { await access(path.join(mcode, 'plugins/voice-prompt')); await cp(path.join(mcode, 'plugins/voice-prompt'), path.join(backup, 'minimax-voice-prompt'), { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 if (process.argv.includes('--migrate-legacy')) {
  const old = path.join(mcode, 'plugins/handy-voice');
  try { await access(old); await rename(old, path.join(backup, 'legacy-minimax-plugin')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 }
 const install = spawnSync(path.join(resources, 'bin/node'), [path.join(root, 'scripts/install-mcode.mjs'), mcode], { stdio: 'inherit' });
 if (install.status !== 0) throw new Error('MCode connector installation failed');
}
if (process.argv.includes('--omp')) {
 const modules = path.join(home, '.omp/plugins/node_modules'); await mkdir(modules, { recursive: true });
 for (const name of process.argv.includes('--migrate-legacy') ? ['handy-voice', 'voice-prompt'] : ['voice-prompt']) {
  const link = path.join(modules, name);
  try { await lstat(link); await rename(link, path.join(backup, `omp-${name}`)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 }
 await cp(path.join(root, 'plugin'), path.join(modules, 'voice-prompt'), { recursive: true });
 const lockPath = path.join(home, '.omp/plugins/omp-plugins.lock.json');
 let lock = { plugins: {}, settings: {} };
 try { lock = JSON.parse(await readFile(lockPath, 'utf8')); await cp(lockPath, path.join(backup, 'omp-plugins.lock.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 lock.plugins ||= {};
 const previous = lock.plugins['voice-prompt'] || (process.argv.includes('--migrate-legacy') ? lock.plugins['handy-voice'] : undefined);
 if (process.argv.includes('--migrate-legacy')) delete lock.plugins['handy-voice'];
 lock.plugins['voice-prompt'] = { enabledFeatures: null, enabled: true, ...previous, version: JSON.parse(await readFile(path.join(root, 'plugin/package.json'), 'utf8')).version };
 await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
}
console.log(`Installed ${destination}\nBackups: ${backup}\nOpen Voice Prompt.app and grant microphone/accessibility permissions. AI provider: ${config.provider}.`);

await rm(temporary, { recursive: true, force: true });
