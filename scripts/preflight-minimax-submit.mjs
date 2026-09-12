#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` };
const steps = [
  ['Package validation', 'python3', ['scripts/pack-minimax.py', '--validate', 'dist/minimax/voice-prompt-minimax-0.7.1.zip']],
  ['Automated clean preflight', process.execPath, ['scripts/verify-minimax-clean-preflight.mjs']],
  ['Build submission bundle', process.execPath, ['scripts/make-minimax-submission-bundle.mjs']],
  ['Public link check', process.execPath, ['scripts/verify-minimax-public-links.mjs']],
  ['Test suite', 'npm', ['test']],
];
const results = [];
for (const [label, cmd, args] of steps) {
  const start = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, env, encoding: 'utf8' });
  const elapsedMs = Date.now() - start;
  results.push({ label, command: [cmd, ...args].join(' '), status: r.status, elapsedMs });
  if (r.status !== 0) {
    process.stderr.write(`\nFAILED: ${label}\n${r.stdout || ''}${r.stderr || ''}\n`);
    console.log(JSON.stringify({ status: 'failed', failedStep: label, results }, null, 2));
    process.exit(r.status || 1);
  }
}
const manifest = JSON.parse(await readFile(path.join(root, 'dist/submission/voice-prompt-minimax-0.7.1/submission-bundle-manifest.json'), 'utf8'));
const publicLinks = JSON.parse(await readFile(path.join(root, 'docs/minimax-public-link-check.json'), 'utf8'));
const clean = JSON.parse(await readFile(path.join(root, 'docs/minimax-clean-preflight-report.json'), 'utf8'));
const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const summary = {
  status: 'passed',
  gitHead,
  uploadZip: `dist/submission/voice-prompt-minimax-0.7.1/${manifest.uploadFile}`,
  sha256: manifest.sha256,
  submissionBundle: 'dist/submission/voice-prompt-minimax-0.7.1',
  publicLinks: { status: publicLinks.status, passed: publicLinks.passed, total: publicLinks.total, skipped: publicLinks.skipped?.length || 0 },
  cleanPreflight: { status: clean.status, scope: clean.scope },
  finalFormFill: manifest.finalFormFill,
  stillNeedsHumanFields: manifest.humanFields,
  runbook: manifest.submissionDayRunbook,
  recordCommand: 'npm run record:minimax-submission -- --submission-id <ID> --submitter-email <EMAIL> --support-email <EMAIL> --author "Lisa Yin" --operation "new plugin"',
  results,
};
console.log(JSON.stringify(summary, null, 2));
