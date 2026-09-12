#!/usr/bin/env node
import { mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = '0.7.1';
const sourceDir = path.join(root, 'dist/minimax');
const targetDir = process.argv[2] || path.join(root, 'dist/submission/voice-prompt-minimax-0.7.1');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  return r.stdout;
};
const files = [
  `voice-prompt-minimax-${version}.zip`,
  `voice-prompt-minimax-${version}.zip.sha256`,
  `voice-prompt-minimax-${version}.validation.json`,
];
const docs = [
  'docs/minimax-submission-packet-2026-09-12.md',
  'docs/minimax-submission-execution-template.md',
  'docs/minimax-submission-human-fields.md',
  'docs/minimax-form-copy-zh.md',
  'docs/minimax-marketplace-submission-template.md',
  'docs/minimax-marketplace-public-materials.md',
  'docs/minimax-clean-machine-test-report.md',
  'docs/minimax-clean-preflight-report.json',
  'docs/minimax-public-link-check.json',
  'docs/minimax-submission-record-template.md',
  'docs/backend-public-api-status.md',
  'docs/frontend-backend-integration-plan.md',
  'docs/agent-setup.md',
  'minimax/data-and-permissions.md',
  'minimax/ASSET-RIGHTS.md',
];

run('python3', ['scripts/pack-minimax.py', '--validate', path.join(sourceDir, files[0])]);
run(process.execPath, ['scripts/verify-minimax-clean-preflight.mjs']);
if (existsSync(targetDir)) await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });
for (const file of files) await copyFile(path.join(sourceDir, file), path.join(targetDir, file));
await mkdir(path.join(targetDir, 'docs'), { recursive: true });
await mkdir(path.join(targetDir, 'minimax'), { recursive: true });
for (const doc of docs) {
  const destination = path.join(targetDir, doc);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, doc), destination);
}
const validation = JSON.parse(await readFile(path.join(sourceDir, `voice-prompt-minimax-${version}.validation.json`), 'utf8'));
const manifest = {
  createdAt: new Date().toISOString(),
  status: 'pre-submit bundle; marketplace form not submitted',
  uploadFile: `voice-prompt-minimax-${version}.zip`,
  sha256: validation.sha256,
  version,
  website: 'https://lisayinyy.github.io/VoicePrompt/',
  sourceRepository: 'https://github.com/Lisayinyy/VoicePrompt',
  submissionPacket: 'docs/minimax-submission-packet-2026-09-12.md',
  executionTemplate: 'docs/minimax-submission-execution-template.md',
  chineseFormCopy: 'docs/minimax-form-copy-zh.md',
  automatedCleanPreflight: 'docs/minimax-clean-preflight-report.json',
  publicLinkCheck: 'docs/minimax-public-link-check.json',
  submissionRecordTemplate: 'docs/minimax-submission-record-template.md',
  doNotClaim: [
    'Marketplace approval is complete',
    'api.voiceprompt.work public HTTPS polish API is live',
    'Voice Prompt is a hosted Streamable HTTP MCP Connector',
    'The plugin silently installs desktop app, models, or macOS permissions',
  ],
};
await writeFile(path.join(targetDir, 'submission-bundle-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(targetDir, 'README.md'), `# Voice Prompt MiniMax Submission Bundle\n\nCreated: ${manifest.createdAt}\n\nUpload \`${manifest.uploadFile}\` in the MiniMax Code marketplace form.\n\nSHA-256: \`${manifest.sha256}\`\n\nUse \`${manifest.submissionPacket}\` as the single-page checklist and \`${manifest.chineseFormCopy}\` for copy-paste form fields.\n\nThis bundle is not a marketplace approval record. Save the submission ID after the form returns one.\n`);
console.log(JSON.stringify({ targetDir: path.relative(root, targetDir), ...manifest }, null, 2));
