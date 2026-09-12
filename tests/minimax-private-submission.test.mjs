import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const script = path.join(root, 'scripts/prepare-minimax-private-submission.mjs');
const nodeBin = process.execPath;

test('private MiniMax submission helper rejects missing or invalid submitter email', () => {
  const missing = spawnSync(nodeBin, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Missing or invalid --submitter-email/);

  const invalid = spawnSync(nodeBin, [script, '--submitter-email', 'not-an-email'], { cwd: root, encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Missing or invalid --submitter-email/);
});

test('private MiniMax submission helper writes only local private drafts', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-private-submit-test-'));
  const result = spawnSync(nodeBin, [script, '--submitter-email', 'submitter@example.com', '--support-email', 'support@example.com', '--output-dir', dir], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'created');
  assert.equal(output.submitterEmailStoredLocally, true);
  assert.equal(output.committed, false);

  const payload = JSON.parse(await readFile(path.join(dir, 'form-payload.private.json'), 'utf8'));
  assert.equal(payload.status, 'private local fill draft; not submitted');
  assert.equal(payload.submitterEmail, 'submitter@example.com');
  assert.equal(payload.supportEmail, 'support@example.com');
  assert.match(payload.privacyNote, /should not be committed/);

  const fillSheet = await readFile(path.join(dir, 'fill-sheet.private.md'), 'utf8');
  assert.match(fillSheet, /submitter@example\.com/);
  assert.match(fillSheet, /support@example\.com/);
  assert.match(fillSheet, /不要提交到 GitHub/);

  await stat(path.join(dir, 'form-payload.private.json'));
  await stat(path.join(dir, 'fill-sheet.private.md'));
});

test('public MiniMax form payload remains a redacted template', async () => {
  const publicPayload = await readFile(path.join(root, 'docs/minimax-form-payload.json'), 'utf8');
  assert.match(publicPayload, /TODO: actual submitter email/);
  assert.doesNotMatch(publicPayload, /submitter@example\.com|support@example\.com/);
});
