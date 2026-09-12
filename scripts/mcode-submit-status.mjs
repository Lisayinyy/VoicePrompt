#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const exists = async (rel) => {
  try { await access(path.join(root, rel)); return true; } catch { return false; }
};
const readJson = async (rel) => JSON.parse(await readFile(path.join(root, rel), 'utf8'));
const manifestPath = 'dist/submission/voice-prompt-minimax-0.7.1/submission-bundle-manifest.json';
const indexPath = 'dist/submission/voice-prompt-minimax-0.7.1/SUBMISSION-INDEX.json';
const readinessPath = 'docs/minimax-submission-readiness-report.json';
const publicLinksPath = 'docs/minimax-public-link-check.json';
const cleanPath = 'docs/minimax-clean-preflight-report.json';
const privateFill = '.local/minimax-submission/fill-sheet.private.md';
const privatePayload = '.local/minimax-submission/form-payload.private.json';
const manifest = await readJson(manifestPath);
const index = await readJson(indexPath);
const readiness = await readJson(readinessPath);
const publicLinks = await readJson(publicLinksPath);
const clean = await readJson(cleanPath);
const gitHead = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const upstream = spawnSync('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}'], { cwd: root, encoding: 'utf8' });
const upstreamCounts = upstream.status === 0 ? upstream.stdout.trim().split(/\s+/).map(Number) : null;
const privateDraftExists = await exists(privateFill) && await exists(privatePayload);
const stillNeeds = [];
if (!privateDraftExists) stillNeeds.push('submitter/support email private draft');
stillNeeds.push('final human confirmation before uploading ZIP and submitting form');
stillNeeds.push('official submission_id after form submission');
const status = {
  status: readiness.status === 'passed' && publicLinks.status === 'passed' && clean.status === 'passed' ? 'ready_for_email_then_manual_submit' : 'not_ready',
  gitHead,
  gitSyncedWithUpstream: upstreamCounts ? upstreamCounts[0] === 0 && upstreamCounts[1] === 0 : null,
  uploadZip: `dist/submission/voice-prompt-minimax-0.7.1/${manifest.uploadFile}`,
  sha256: manifest.sha256,
  miniMaxPackageVersion: manifest.version,
  submitConsole: index.submitConsole,
  privateDraftExists,
  readiness: { status: readiness.status, issues: readiness.issues?.length || 0 },
  publicLinks: { status: publicLinks.status, passed: publicLinks.passed, total: publicLinks.total, skipped: publicLinks.skipped?.length || 0 },
  cleanPreflight: { status: clean.status },
  stillNeeds,
  nextCommands: privateDraftExists ? [
    'npm run preflight:minimax-submit',
    'open .local/minimax-submission/fill-sheet.private.md',
  ] : [
    'npm run prepare:minimax-private-submission -- --submitter-email <提交邮箱>',
    'npm run preflight:minimax-submit',
  ],
};
console.log(JSON.stringify(status, null, 2));
