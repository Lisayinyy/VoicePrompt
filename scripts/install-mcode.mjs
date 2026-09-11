// Explicit local installation of the exact MiniMax V1 submission artifact.
// This is not an import lifecycle hook and never grants macOS permissions.
import { mkdir, readFile, rename, lstat, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = process.argv[2];
if (!data || !path.isAbsolute(data)) throw new Error('Pass the verified active MiniMax data directory as an absolute path');
const destination = path.join(data, 'plugins/voice-prompt');
let existing = false;
try {
  const st = await lstat(destination);
  if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('Refusing a linked or non-directory plugin destination');
  const manifest = JSON.parse(await readFile(path.join(destination, '.minimax-plugin/plugin.json'), 'utf8'));
  if (manifest.name !== 'voice-prompt' || manifest.author !== 'Voice Prompt contributors') throw new Error('Refusing to replace another plugin');
  existing = true;
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const temporary = await mkdtemp(path.join(tmpdir(), 'voice-prompt-mcode-build-'));
let stage;
try {
  const build = spawnSync('python3', [path.join(root, 'scripts/pack-minimax.py'), '--output', temporary], { encoding: 'utf8' });
  if (build.status !== 0) throw new Error('MiniMax packaging failed: ' + build.stderr);
  const report = JSON.parse(build.stdout);
  await mkdir(path.dirname(destination), { recursive: true });
  // Staging on the same filesystem allows rename and retains the current plugin on failure.
  stage = await mkdtemp(path.join(path.dirname(destination), '.voice-prompt-stage-'));
  const extract = spawnSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', report.archive, stage], { encoding: 'utf8' });
  if (extract.status !== 0) throw new Error('MiniMax extraction failed: ' + extract.stderr);
  let backup;
  if (existing) {
    const backupRoot = path.join(data, 'voice-prompt-backups');
    await mkdir(backupRoot, { recursive: true, mode: 0o700 });
    backup = path.join(backupRoot, `plugin-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`);
    await rename(destination, backup);
  }
  try { await rename(stage, destination); stage = undefined; }
  catch (error) { if (backup) await rename(backup, destination); throw error; }
  console.log(JSON.stringify({ installed: destination, version: report.version, artifactSha256: report.sha256, backup: backup || null, next: 'Reconnect the Voice Prompt MCP in MiniMax Code. This does not update the desktop app or publish to the marketplace.' }, null, 2));
} finally {
  if (stage) await rm(stage, { recursive: true, force: true });
  await rm(temporary, { recursive: true, force: true });
}
