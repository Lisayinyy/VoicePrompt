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
  'docs/mcode-marketplace-action-plan.md',
  'docs/minimax-submission-packet-2026-09-12.md',
  'docs/minimax-submission-execution-template.md',
  'docs/minimax-submission-human-fields.md',
  'docs/minimax-submission-day-runbook.md',
  'docs/minimax-form-copy-zh.md',
  'docs/minimax-form-final-fill.md',
  'docs/minimax-live-form-field-map.md',
  'docs/minimax-live-form-quick-fill.md',
  'docs/minimax-form-payload.json',
  'docs/minimax-marketplace-submission-template.md',
  'docs/minimax-marketplace-public-materials.md',
  'docs/minimax-clean-machine-test-report.md',
  'docs/minimax-clean-preflight-report.json',
  'docs/minimax-public-link-check.json',
  'docs/minimax-submit-preflight-latest.md',
  'docs/minimax-submission-record-template.md',
  'docs/minimax-review-response-template.md',
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
  mcodeActionPlan: 'docs/mcode-marketplace-action-plan.md',
  submissionPacket: 'docs/minimax-submission-packet-2026-09-12.md',
  executionTemplate: 'docs/minimax-submission-execution-template.md',
  humanFields: 'docs/minimax-submission-human-fields.md',
  submissionDayRunbook: 'docs/minimax-submission-day-runbook.md',
  chineseFormCopy: 'docs/minimax-form-copy-zh.md',
  finalFormFill: 'docs/minimax-form-final-fill.md',
  liveFormFieldMap: 'docs/minimax-live-form-field-map.md',
  liveFormQuickFill: 'docs/minimax-live-form-quick-fill.md',
  formPayload: 'docs/minimax-form-payload.json',
  automatedCleanPreflight: 'docs/minimax-clean-preflight-report.json',
  publicLinkCheck: 'docs/minimax-public-link-check.json',
  latestPreflightEvidence: 'docs/minimax-submit-preflight-latest.md',
  submissionRecordTemplate: 'docs/minimax-submission-record-template.md',
  reviewResponseTemplate: 'docs/minimax-review-response-template.md',
  doNotClaim: [
    'Marketplace approval is complete',
    'api.voiceprompt.work public HTTPS polish API is live',
    'Voice Prompt is a hosted Streamable HTTP MCP Connector',
    'The plugin silently installs desktop app, models, or macOS permissions',
  ],
};
await writeFile(path.join(targetDir, 'submission-bundle-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const bundleRoot = path.relative(root, targetDir);
const submissionIndex = {
  purpose: 'Local MiniMax Code marketplace submission package for Voice Prompt',
  uploadZip: path.join(bundleRoot, manifest.uploadFile),
  sha256: manifest.sha256,
  mcodeActionPlan: path.join(bundleRoot, manifest.mcodeActionPlan),
  finalFormFill: path.join(bundleRoot, manifest.finalFormFill),
  liveFormFieldMap: path.join(bundleRoot, manifest.liveFormFieldMap),
  liveFormQuickFill: path.join(bundleRoot, manifest.liveFormQuickFill),
  formPayload: path.join(bundleRoot, manifest.formPayload),
  runbook: path.join(bundleRoot, manifest.submissionDayRunbook),
  humanFields: path.join(bundleRoot, manifest.humanFields),
  publicLinkCheck: path.join(bundleRoot, manifest.publicLinkCheck),
  latestPreflightEvidence: path.join(bundleRoot, manifest.latestPreflightEvidence),
  recordTemplate: path.join(bundleRoot, manifest.submissionRecordTemplate),
  reviewResponseTemplate: path.join(bundleRoot, manifest.reviewResponseTemplate),
  submitNow: path.join(bundleRoot, 'SUBMIT-NOW.md'),
  stillNeeds: ['submitter email', 'support email', 'official submission_id after form submission'],
  doNotClaim: manifest.doNotClaim,
};
await writeFile(path.join(targetDir, 'SUBMISSION-INDEX.json'), JSON.stringify(submissionIndex, null, 2) + '\n');
const submitNow = [
  '# Voice Prompt · MiniMax Code 提交入口',
  '',
  '这是本地提交材料包。打开 MiniMax Code 插件上架表单时，按下面顺序操作。',
  '',
  '## 1. 上传这个 ZIP',
  '',
  '```text',
  manifest.uploadFile,
  '```',
  '',
  'SHA-256:',
  '',
  '```text',
  manifest.sha256,
  '```',
  '',
  '## 2. 复制表单字段',
  '',
  '先看主控清单：',
  '',
  '```text',
  manifest.mcodeActionPlan,
  '```',
  '',
  '优先打开：',
  '',
  '```text',
  manifest.finalFormFill,
  '```',
  '',
  '里面已经预填了插件名称、作者建议、描述、权限说明、数据说明、示例问题和备注。',
  '',
  '还需要人工填写：',
  '',
  '- 提交邮箱',
  '- 支持邮箱',
  '',
  '## 3. 提交前运行',
  '',
  '在仓库根目录运行：',
  '',
  '```sh',
  'npm run preflight:minimax-submit',
  '```',
  '',
  '只有看到 `status: passed` 后再提交。',
  '',
  '## 4. 提交后记录',
  '',
  '拿到官方 submission_id 后，在仓库根目录运行：',
  '',
  '```sh',
  'npm run record:minimax-submission -- \\',
  '  --submission-id <官方返回的ID> \\',
  '  --submitter-email <提交邮箱> \\',
  '  --support-email <支持邮箱> \\',
  '  --author "Lisa Yin" \\',
  '  --operation "new plugin"',
  '```',
  '',
  '如果表单返回记录链接，再加：',
  '',
  '```sh',
  '--submission-url <链接>',
  '```',
  '',
  '## 5. 不能宣称的内容',
  '',
  '- 不能写“已上架 / 已审核通过”',
  '- 不能写“已有 submission_id”，除非表单已经返回',
  '- 不能承诺导入插件后自动安装桌面 App、模型或 macOS 权限',
  '- 不能承诺 0.7.1 已包含发布者共享云端润色额度',
  '- 不能把当前 REST API 描述成已通过 MiniMax 联调的远程 MCP Connector',
  '',
].join('\n');
await writeFile(path.join(targetDir, 'SUBMIT-NOW.md'), submitNow);
await writeFile(path.join(targetDir, 'README.md'), `# Voice Prompt MiniMax Submission Bundle\n\nCreated: ${manifest.createdAt}\n\nUpload \`${manifest.uploadFile}\` in the MiniMax Code marketplace form.\n\nSHA-256: \`${manifest.sha256}\`\n\nStart with \`SUBMIT-NOW.md\`. Use \`${manifest.mcodeActionPlan}\` as the main Mcode marketplace action plan, \`${manifest.finalFormFill}\` as the final field-by-field form sheet, \`${manifest.submissionPacket}\` as the single-page checklist, \`${manifest.executionTemplate}\` as the step-by-step submission template, \`${manifest.humanFields}\` for fields that need human confirmation, \`${manifest.submissionDayRunbook}\` for the submission-day runbook, \`${manifest.reviewResponseTemplate}\` for review replies, and \`${manifest.chineseFormCopy}\` for copy-paste form fields.\n\nThis bundle is not a marketplace approval record. Save the submission ID after the form returns one.\n`);
console.log(JSON.stringify({ targetDir: bundleRoot, ...manifest, submissionIndex: 'SUBMISSION-INDEX.json', submitNow: 'SUBMIT-NOW.md' }, null, 2));
