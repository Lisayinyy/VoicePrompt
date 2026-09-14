import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, mkdir, mkdtemp, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
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
  // A clean checkout has no publisher-generated dist/submission files.
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'voice-submission-record-'));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  await mkdir(path.join(fixtureRoot, 'scripts'), { recursive: true });
  const fixtureScript = path.join(fixtureRoot, 'scripts/make-minimax-submission-record.mjs');
  await copyFile(script, fixtureScript);
  const bundle = path.join(fixtureRoot, 'dist/submission/voice-prompt-minimax-0.7.1');
  await mkdir(bundle, { recursive: true });
  await writeFile(path.join(bundle, 'submission-bundle-manifest.json'), JSON.stringify({
    uploadFile: 'fixture.zip', sha256: 'f'.repeat(64), version: '0.7.1',
    submissionPacket: 'docs/fixture.md', executionTemplate: 'docs/fixture.md',
    submissionDayRunbook: 'docs/fixture.md', humanFields: 'docs/fixture.md',
    chineseFormCopy: 'docs/fixture.md', publicLinkCheck: 'docs/fixture.md',
    website: 'https://example.com', sourceRepository: 'https://example.com/repo',
  }));
  const result = spawnSync(nodeBin, [
    fixtureScript,
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

  const recordPath = path.join(fixtureRoot, output.record);
  t.after(() => rm(recordPath, { force: true }));
  const record = await readFile(recordPath, 'utf8');
  assert.match(record, new RegExp(sampleId));
  assert.match(record, /fixture\.zip/);
  assert.match(record, new RegExp('f'.repeat(64)));
  assert.match(record, /Status: submitted; marketplace approval and publication are not yet verified/);
  assert.match(record, /This record proves form submission only/);
  assert.match(record, /Visible in MiniMax Code marketplace \| TODO/);
  assert.match(record, /submitter@example\.com/);
  assert.match(record, /support@example\.com/);
});
