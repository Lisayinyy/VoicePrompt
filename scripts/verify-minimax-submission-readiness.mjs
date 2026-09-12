#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const root = process.env.VOICE_PROMPT_SUBMISSION_AUDIT_ROOT
  ? path.resolve(process.env.VOICE_PROMPT_SUBMISSION_AUDIT_ROOT)
  : defaultRoot;
const mustExist = [
  'docs/mcode-submit-console.md',
  'docs/mcode-form-fill-plan.json',
  'docs/mcode-marketplace-action-plan.md',
  'docs/minimax-live-form-field-map.md',
  'docs/minimax-live-form-quick-fill.md',
  'docs/minimax-form-final-fill.md',
  'docs/minimax-form-payload.json',
  'docs/minimax-submission-human-fields.md',
  'docs/minimax-submission-record-template.md',
  'docs/minimax-review-response-template.md',
  'docs/minimax-version-boundary.md',
  'docs/minimax-submit-preflight-latest.md',
  'dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip',
  'dist/submission/voice-prompt-minimax-0.7.1/docs/mcode-marketplace-action-plan.md',
  'dist/submission/voice-prompt-minimax-0.7.1/SUBMIT-NOW.md',
];
const docsToScan = [
  'docs/mcode-submit-console.md',
  'docs/mcode-form-fill-plan.json',
  'docs/mcode-marketplace-action-plan.md',
  'docs/minimax-live-form-quick-fill.md',
  'docs/minimax-form-final-fill.md',
  'docs/minimax-form-payload.json',
  'docs/minimax-submission-execution-template.md',
  'docs/minimax-submission-packet-2026-09-12.md',
  'docs/minimax-submission-day-runbook.md',
  'docs/minimax-submission-readiness.md',
  'docs/minimax-submission.md',
  'docs/minimax-submit-preflight-latest.md',
  'docs/minimax-review-response-template.md',
  'docs/minimax-version-boundary.md',
];
const requiredSnippets = [
  ['docs/mcode-submit-console.md', '上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书'],
  ['docs/mcode-form-fill-plan.json', 'READ_FROM_PRIVATE_DRAFT'],
  ['docs/mcode-marketplace-action-plan.md', '尚未正式提交表单，也没有官方 submission_id'],
  ['docs/mcode-marketplace-action-plan.md', '真实提交邮箱不要默认写进 GitHub 文档'],
  ['docs/mcode-marketplace-action-plan.md', '上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书'],
  ['docs/minimax-live-form-quick-fill.md', 'Contact email | TODO: real submitter email'],
  ['docs/minimax-form-final-fill.md', '提交邮箱 | TODO'],
  ['docs/minimax-form-payload.json', 'TODO: actual submitter email'],
  ['docs/minimax-submit-preflight-latest.md', '20 / 20 passed; 1 skipped self-report link'],
  ['docs/minimax-review-response-template.md', '当前 0.7.1 上架候选包不包含发布者统一付费的共享云端润色额度'],
  ['docs/minimax-version-boundary.md', '本次 MiniMax Code 插件市场投稿使用独立的 MiniMax 专用包，版本为 0.7.1'],
];
const forbiddenPatterns = [
  [/48\/48|48 项|48 tests|tests 48/g, 'stale 48-test count'],
  [/已上架\s*\/\s*已审核通过/g, 'unqualified published-or-approved claim'],
  [/status"\s*:\s*"submitted"/g, 'submitted status before official submission'],
  [/submission_id\s*[":]\s*"(?!TODO|<ID>)[^"]+"/g, 'real submission_id before form submission'],
];
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const allowedEmailText = new Set([
  'TODO: actual submitter email',
  'TODO: support email, can initially match submitter email',
]);
const issues = [];
for (const file of mustExist) {
  try { await access(path.join(root, file)); } catch { issues.push({ file, issue: 'missing required submission artifact' }); }
}
for (const [file, snippet] of requiredSnippets) {
  const text = await readFile(path.join(root, file), 'utf8').catch(() => '');
  if (!text.includes(snippet)) issues.push({ file, issue: 'missing required wording', snippet });
}
for (const file of docsToScan) {
  const abs = path.join(root, file);
  const text = await readFile(abs, 'utf8').catch(() => '');
  for (const [pattern, label] of forbiddenPatterns) {
    const matches = [...text.matchAll(pattern)].map(m => m[0]);
    if (matches.length) issues.push({ file, issue: label, matches: [...new Set(matches)].slice(0, 5) });
  }
  const emails = [...text.matchAll(emailPattern)].map(m => m[0]);
  const unexpected = emails.filter(e => !allowedEmailText.has(e));
  if (unexpected.length) issues.push({ file, issue: 'unexpected public email address', matches: [...new Set(unexpected)].slice(0, 5) });
}
const payload = JSON.parse(await readFile(path.join(root, 'docs/minimax-form-payload.json'), 'utf8'));
if (payload.status !== 'pre-submit; not submitted') issues.push({ file: 'docs/minimax-form-payload.json', issue: 'public payload status is not pre-submit', value: payload.status });
if (payload.submitterEmail !== 'TODO: actual submitter email') issues.push({ file: 'docs/minimax-form-payload.json', issue: 'public payload has non-redacted submitter email' });
if (payload.uploadArtifact?.sha256 !== 'acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072') issues.push({ file: 'docs/minimax-form-payload.json', issue: 'unexpected upload sha256', value: payload.uploadArtifact?.sha256 });
const submissionIndexPath = path.join(root, 'dist/submission/voice-prompt-minimax-0.7.1/SUBMISSION-INDEX.json');
try {
  const index = JSON.parse(await readFile(submissionIndexPath, 'utf8'));
  const expectedIndexKeys = ['submitConsole', 'mcodeActionPlan', 'finalFormFill', 'liveFormQuickFill', 'formPayload', 'runbook', 'humanFields', 'latestPreflightEvidence', 'recordTemplate', 'reviewResponseTemplate', 'versionBoundary', 'submitNow'];
  for (const key of expectedIndexKeys) {
    if (!index[key]) issues.push({ file: 'dist/submission/voice-prompt-minimax-0.7.1/SUBMISSION-INDEX.json', issue: 'missing submission index key', key });
  }
} catch (error) {
  issues.push({ file: 'dist/submission/voice-prompt-minimax-0.7.1/SUBMISSION-INDEX.json', issue: 'cannot read submission index', error: String(error.message || error) });
}
const zipManifest = spawnSync('unzip', ['-p', path.join(root, 'dist/minimax/voice-prompt-minimax-0.7.1.zip'), '.minimax-plugin/plugin.json'], { encoding: 'utf8' });
if (zipManifest.status !== 0) {
  issues.push({ file: 'dist/minimax/voice-prompt-minimax-0.7.1.zip', issue: 'cannot read packaged MiniMax manifest' });
} else {
  try {
    const manifest = JSON.parse(zipManifest.stdout);
    if (manifest.name !== 'voice-prompt') issues.push({ file: 'dist/minimax/voice-prompt-minimax-0.7.1.zip', issue: 'unexpected packaged plugin name', value: manifest.name });
    if (manifest.version !== '0.7.1') issues.push({ file: 'dist/minimax/voice-prompt-minimax-0.7.1.zip', issue: 'unexpected packaged plugin version', value: manifest.version });
  } catch (error) {
    issues.push({ file: 'dist/minimax/voice-prompt-minimax-0.7.1.zip', issue: 'packaged MiniMax manifest is not valid JSON', error: String(error.message || error) });
  }
}
const report = {
  status: issues.length ? 'failed' : 'passed',
  generatedAt: new Date().toISOString(),
  scope: 'Submission-material consistency audit only. This does not submit the plugin or prove marketplace approval.',
  checkedFiles: docsToScan,
  requiredArtifacts: mustExist,
  issues,
};
await writeFile(path.join(root, 'docs/minimax-submission-readiness-report.json'), JSON.stringify(report, null, 2) + '\n');
if (issues.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
