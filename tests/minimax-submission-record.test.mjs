import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const script = path.join(root, 'scripts/make-minimax-submission-record.mjs');
const nodeBin = process.execPath;
const sampleId = `TEST-SUBMISSION-${Date.now()}`;

test('MiniMax submission record helper requires receipt and contact fields', () => {
  const result = spawnSync(nodeBin, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required arguments/);
  assert.match(result.stderr, /--submission-id/);
});

test('MiniMax submission record helper creates a bounded post-submit record', async t => {
  const result = spawnSync(nodeBin, [
    script,
    '--submission-id', sampleId,
    '--submitter-email', 'submitter@example.com',
    '--support-email', 'support@example.com',
    '--author', 'Lisa Yin',
    '--submission-url', 'https://example.com/submission',
    '--feishu-identity', 'Lisa Yin Feishu',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.submissionId, sampleId);
  assert.match(output.record, /docs\/minimax-submission-record-/);

  const recordPath = path.join(root, output.record);
  t.after(() => rm(recordPath, { force: true }));
  const record = await readFile(recordPath, 'utf8');
  assert.match(record, new RegExp(sampleId));
  assert.match(record, /Status: submitted; marketplace approval and publication are not yet verified/);
  assert.match(record, /This record proves form submission only/);
  assert.match(record, /Visible in MiniMax Code marketplace \| TODO/);
  assert.match(record, /submitter@example\.com/);
  assert.match(record, /support@example\.com/);
});
