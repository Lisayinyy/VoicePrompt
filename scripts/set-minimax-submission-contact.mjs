#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
  args.set(key, value);
}
if (args.has('help')) {
  console.log('Usage: node scripts/set-minimax-submission-contact.mjs --submitter-email EMAIL [--support-email EMAIL] [--author "Lisa Yin"]');
  process.exit(0);
}
const submitterEmail = args.get('submitter-email');
if (!submitterEmail || !/^.+@.+\..+$/.test(submitterEmail)) {
  console.error('Missing or invalid --submitter-email');
  process.exit(1);
}
const supportEmail = args.get('support-email') || submitterEmail;
if (!/^.+@.+\..+$/.test(supportEmail)) {
  console.error('Invalid --support-email');
  process.exit(1);
}
const author = args.get('author') || 'Lisa Yin';

const payloadPath = path.join(root, 'docs/minimax-form-payload.json');
const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
payload.submitterEmail = submitterEmail;
payload.supportEmail = supportEmail;
payload.author = author;
payload.status = 'pre-submit; contact fields filled; not submitted';
await writeFile(payloadPath, JSON.stringify(payload, null, 2) + '\n');

const finalPath = path.join(root, 'docs/minimax-form-final-fill.md');
let final = await readFile(finalPath, 'utf8');
final = final
  .replace(/\| 作者 \/ 组织 \| .* \|/, `| 作者 / 组织 | ${author} |`)
  .replace(/\| 提交邮箱 \| .* \|/, `| 提交邮箱 | ${submitterEmail} |`)
  .replace(/\| 支持邮箱 \| .* \|/, `| 支持邮箱 | ${supportEmail} |`)
  .replace(/--submitter-email <提交邮箱> \\/g, `--submitter-email ${submitterEmail} \\`)
  .replace(/--support-email <支持邮箱> \\/g, `--support-email ${supportEmail} \\`)
  .replace(/--author "Lisa Yin"/g, `--author "${author.replaceAll('"', '\\"')}"`);
await writeFile(finalPath, final);

const humanPath = path.join(root, 'docs/minimax-submission-human-fields.md');
let human = await readFile(humanPath, 'utf8');
human = human
  .replace(/\| 作者 \/ 组织显示名 \| TODO \| Lisa Yin \|/, `| 作者 / 组织显示名 | ${author} | Lisa Yin |`)
  .replace(/\| 提交邮箱 \| TODO \| 使用实际登录 MiniMax \/ 飞书表单的邮箱 \|/, `| 提交邮箱 | ${submitterEmail} | 使用实际登录 MiniMax / 飞书表单的邮箱 |`)
  .replace(/\| 支持邮箱 \| TODO \| 可先与提交邮箱一致 \|/, `| 支持邮箱 | ${supportEmail} | 可先与提交邮箱一致 |`);
await writeFile(humanPath, human);

console.log(JSON.stringify({ status: 'updated', submitterEmail, supportEmail, author, recordCommand: `npm run record:minimax-submission -- --submission-id <ID> --submitter-email ${submitterEmail} --support-email ${supportEmail} --author "${author}" --operation "new plugin"` }, null, 2));
