import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const script = path.join(repoRoot, 'scripts/verify-minimax-submission-readiness.mjs');
const nodeBin = process.execPath;

const requiredFiles = [
  'docs/mcode-submit-console.md',
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
  'docs/minimax-submission-execution-template.md',
  'docs/minimax-submission-packet-2026-09-12.md',
  'docs/minimax-submission-day-runbook.md',
  'docs/minimax-submission-readiness.md',
  'docs/minimax-submission.md',
  'dist/submission/voice-prompt-minimax-0.7.1/voice-prompt-minimax-0.7.1.zip',
  'dist/submission/voice-prompt-minimax-0.7.1/docs/mcode-marketplace-action-plan.md',
  'dist/submission/voice-prompt-minimax-0.7.1/SUBMIT-NOW.md',
];

async function createAuditFixture(overrides = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-submit-audit-'));
  for (const file of requiredFiles) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await writeFile(path.join(dir, file), overrides[file] ?? 'placeholder\n');
  }
  await writeFile(path.join(dir, 'docs/mcode-submit-console.md'), overrides['docs/mcode-submit-console.md'] ?? '上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书\n');
  await writeFile(path.join(dir, 'docs/mcode-marketplace-action-plan.md'), overrides['docs/mcode-marketplace-action-plan.md'] ?? '尚未正式提交表单，也没有官方 submission_id\n真实提交邮箱不要默认写进 GitHub 文档\n上传 ZIP 和点击提交会把插件包、联系邮箱和表单内容发送给 MiniMax / 飞书\n');
  await writeFile(path.join(dir, 'docs/minimax-live-form-quick-fill.md'), overrides['docs/minimax-live-form-quick-fill.md'] ?? 'Contact email | TODO: real submitter email\n');
  await writeFile(path.join(dir, 'docs/minimax-form-final-fill.md'), overrides['docs/minimax-form-final-fill.md'] ?? '提交邮箱 | TODO\n');
  await writeFile(path.join(dir, 'docs/minimax-submit-preflight-latest.md'), overrides['docs/minimax-submit-preflight-latest.md'] ?? '20 / 20 passed; 1 skipped self-report link\n');
  await writeFile(path.join(dir, 'docs/minimax-review-response-template.md'), overrides['docs/minimax-review-response-template.md'] ?? '当前 0.7.1 上架候选包不包含发布者统一付费的共享云端润色额度\n');
  await writeFile(path.join(dir, 'docs/minimax-version-boundary.md'), overrides['docs/minimax-version-boundary.md'] ?? '本次 MiniMax Code 插件市场投稿使用独立的 MiniMax 专用包，版本为 0.7.1\n');
  await writeFile(path.join(dir, 'docs/minimax-form-payload.json'), overrides['docs/minimax-form-payload.json'] ?? JSON.stringify({
    status: 'pre-submit; not submitted',
    submitterEmail: 'TODO: actual submitter email',
    supportEmail: 'TODO: support email, can initially match submitter email',
    uploadArtifact: { sha256: 'acb14dfb3465ee3c0c17868d45e0f234ec37d439b7ee9a6896ace9e78a23d072' },
  }, null, 2));
  const zipStage = path.join(dir, '.zip-stage/.minimax-plugin');
  mkdirSync(zipStage, { recursive: true });
  writeFileSync(path.join(zipStage, 'plugin.json'), JSON.stringify({ name: 'voice-prompt', version: '0.7.1' }));
  await mkdir(path.join(dir, 'dist/minimax'), { recursive: true });
  const zip = spawnSync('/usr/bin/zip', ['-qr', path.join(dir, 'dist/minimax/voice-prompt-minimax-0.7.1.zip'), '.minimax-plugin/plugin.json'], { cwd: path.join(dir, '.zip-stage'), encoding: 'utf8' });
  assert.equal(zip.status, 0, zip.stderr || zip.stdout);
  return dir;
}

function runAudit(root) {
  return spawnSync(nodeBin, [script], { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, VOICE_PROMPT_SUBMISSION_AUDIT_ROOT: root } });
}

test('submission readiness audit passes a clean fixture and writes a report', async () => {
  const dir = await createAuditFixture();
  const result = runAudit(dir);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(path.join(dir, 'docs/minimax-submission-readiness-report.json'), 'utf8'));
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.issues, []);
});

test('submission readiness audit catches public emails, stale test counts and submitted status', async () => {
  const dir = await createAuditFixture({
    'docs/minimax-form-payload.json': JSON.stringify({
      status: 'submitted',
      submitterEmail: 'person@example.com',
      supportEmail: 'TODO: support email, can initially match submitter email',
      uploadArtifact: { sha256: 'wrong' },
    }, null, 2),
    'docs/minimax-submission.md': 'tests 48\ncontact person@example.com\nsubmission_id: "REAL-ID"\n',
  });
  const result = runAudit(dir);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stderr);
  const issues = report.issues.map(i => i.issue).join('\n');
  assert.match(issues, /unexpected public email address/);
  assert.match(issues, /stale 48-test count/);
  assert.match(issues, /public payload status is not pre-submit/);
  assert.match(issues, /unexpected upload sha256/);
  assert.match(issues, /real submission_id before form submission/);
});
