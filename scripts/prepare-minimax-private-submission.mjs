#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return '';
  return args[i + 1] || '';
};
const submitterEmail = getArg('submitter-email') || process.env.VOICE_PROMPT_SUBMITTER_EMAIL || '';
const supportEmail = getArg('support-email') || process.env.VOICE_PROMPT_SUPPORT_EMAIL || submitterEmail;
const author = getArg('author') || process.env.VOICE_PROMPT_SUBMISSION_AUTHOR || 'Lisa Yin';
const outputDir = getArg('output-dir') || path.join(root, '.local/minimax-submission');

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!submitterEmail || !emailRe.test(submitterEmail)) {
  console.error('Missing or invalid --submitter-email. This script writes private local submission files only.');
  process.exit(2);
}
if (supportEmail && !emailRe.test(supportEmail)) {
  console.error('Invalid --support-email.');
  process.exit(2);
}

const payloadPath = path.join(root, 'docs/minimax-form-payload.json');
const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
payload.status = 'private local fill draft; not submitted';
payload.author = author;
payload.submitterEmail = submitterEmail;
payload.supportEmail = supportEmail || submitterEmail;
payload.generatedAt = new Date().toISOString();
payload.privacyNote = 'This file may contain a real email address. It is generated under .local/ and should not be committed.';

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, 'form-payload.private.json'), JSON.stringify(payload, null, 2) + '\n');

const fillSheet = `# Voice Prompt · Mcode 私有填表稿\n\n状态：本地私有草稿，尚未提交。此文件可能包含真实邮箱，不要提交到 GitHub。\n\n## 表单字段\n\n| 字段 | 填写值 |\n| --- | --- |\n| Plugin 名 / Plugin name | voice-prompt |\n| 操作类型 / Operation type | 新插件 / New Plugin |\n| 来源类型 / Source type | ZIP |\n| 目标区域 / Target region | CN |\n| 启用端 / Delivery target | 桌面端 / Desktop |\n| 组织/团队 / Organization or team | ${author} |\n| 联系邮箱（提交者） / Contact email | ${submitterEmail} |\n| 支持邮箱 / Support email | ${payload.supportEmail} |\n\n## 上传 ZIP\n\n\`\`\`text\n${payload.uploadArtifact.localPath}\n\`\`\`\n\nSHA-256:\n\n\`\`\`text\n${payload.uploadArtifact.sha256}\n\`\`\`\n\n## 提交前检查\n\n\`\`\`sh\nnpm run preflight:minimax-submit\n\`\`\`\n\n需要看到：\n\n\`\`\`text\nstatus: passed\npublic links: 20 / 20 passed, 1 skipped\nclean preflight: passed\n\`\`\`\n\n## 提交边界\n\n上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书。正式提交前需要最后确认。\n`;
await writeFile(path.join(outputDir, 'fill-sheet.private.md'), fillSheet);

console.log(JSON.stringify({
  status: 'created',
  outputDir: path.relative(root, outputDir),
  files: [
    path.relative(root, path.join(outputDir, 'form-payload.private.json')),
    path.relative(root, path.join(outputDir, 'fill-sheet.private.md')),
  ],
  submitterEmailStoredLocally: true,
  committed: false,
}, null, 2));
