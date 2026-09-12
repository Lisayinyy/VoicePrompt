#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
  args.set(key, value);
}
const required = ['submission-id', 'submitter-email', 'support-email', 'author'];
if (args.has('help')) {
  console.log('Usage: node scripts/make-minimax-submission-record.mjs --submission-id ID --submitter-email EMAIL --support-email EMAIL --author NAME [--submission-url URL] [--operation new|update]');
  process.exit(0);
}
const missing = required.filter(k => !args.get(k));
if (missing.length) {
  console.error(`Missing required arguments: ${missing.map(k => `--${k}`).join(', ')}`);
  process.exit(1);
}
const manifestPath = path.join(root, 'dist/submission/voice-prompt-minimax-0.7.1/submission-bundle-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const shortCommit = commit.slice(0, 7);
const now = new Date().toISOString();
const operation = args.get('operation') || 'new plugin';
const target = path.join(root, `docs/minimax-submission-record-${now.slice(0, 10)}-${String(args.get('submission-id')).replace(/[^A-Za-z0-9_.-]+/g, '-')}.md`);
await mkdir(path.dirname(target), { recursive: true });
const submissionUrl = args.get('submission-url') || 'TODO';
const feishuIdentity = args.get('feishu-identity') || 'TODO';
const content = `# Voice Prompt · MiniMax Code Submission Record\n\nStatus: submitted; marketplace approval and publication are not yet verified\n\nGenerated at: ${now}\n\n## Submission Receipt\n\n| Field | Value |\n| --- | --- |\n| Submission status | submitted |\n| Submission ID | ${args.get('submission-id')} |\n| Submission URL / record link | ${submissionUrl} |\n| Submitted at | ${now} |\n| Submitter account / Feishu identity | ${feishuIdentity} |\n| Submitter email | ${args.get('submitter-email')} |\n| Support email | ${args.get('support-email')} |\n| Author / organization shown in form | ${args.get('author')} |\n| Operation type | ${operation} |\n| Target region | CN |\n| Target client | MiniMax Code desktop |\n| Package route | ZIP upload |\n\n## Uploaded Artifact\n\n| Field | Value |\n| --- | --- |\n| Uploaded file | \`${manifest.uploadFile}\` |\n| Local source path | \`dist/submission/voice-prompt-minimax-0.7.1/${manifest.uploadFile}\` |\n| SHA-256 | \`${manifest.sha256}\` |\n| Version | ${manifest.version} |\n| Source commit | \`${commit}\` |\n| Local package preflight | Passed before submission |\n| Automated isolated clean preflight | Passed before submission |\n| Public link check | Passed before submission |\n\n## Form Content Used\n\n| Purpose | URL |\n| --- | --- |\n| Submission packet | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.submissionPacket} |\n| Execution template | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.executionTemplate} |\n| Submission-day runbook | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.submissionDayRunbook} |\n| Human confirmation fields | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.humanFields} |\n| Chinese form copy | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.chineseFormCopy} |\n| Public website | ${manifest.website} |\n| Source repository | ${manifest.sourceRepository} |\n| Public link check | https://github.com/Lisayinyy/VoicePrompt/blob/main/${manifest.publicLinkCheck} |\n\n## Review / Release Tracking\n\n| Checkpoint | Status | Evidence |\n| --- | --- | --- |\n| Form accepted | TODO | TODO |\n| Release/MR generated | TODO | TODO |\n| Human review started | TODO | TODO |\n| Reviewer questions answered | TODO | TODO |\n| Approved | TODO | TODO |\n| Published | TODO | TODO |\n| Visible in MiniMax Code marketplace | TODO | TODO |\n| Fresh account can install | TODO | TODO |\n| Plugin can be addressed as \`@Voice Prompt\` | TODO | TODO |\n\n## Reviewer Notes / Follow-Up\n\nRecord exact reviewer comments, required changes, and response links here. Keep credentials, private tokens, and unpublished customer data out of this file.\n\n## Post-Submission Boundary\n\nThis record proves form submission only. Do not claim marketplace approval, publication, or fresh-user installability until each state is verified separately.\n`;
await writeFile(target, content);
console.log(JSON.stringify({ record: path.relative(root, target), submissionId: args.get('submission-id'), commit: shortCommit, sha256: manifest.sha256 }, null, 2));
