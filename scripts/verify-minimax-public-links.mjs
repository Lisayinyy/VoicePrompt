#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = process.argv[2] || path.join(root, 'docs/minimax-submission-packet-2026-09-12.md');
const out = process.argv[3] || path.join(root, 'docs/minimax-public-link-check.json');
const text = await readFile(source, 'utf8');
const selfReportUrl = 'https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/minimax-public-link-check.json';
const urls = [...new Set([...text.matchAll(/https:\/\/[^\s)`|]+/g)].map(m => m[0]))].filter(url => url !== selfReportUrl);
if (!urls.length) throw new Error('No public links found in ' + source);
const results = [];
for (const url of urls) {
  const started = Date.now();
  let status = null, ok = false, error = null, finalUrl = url;
  try {
    const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000) });
    status = response.status;
    ok = response.status >= 200 && response.status < 400;
    finalUrl = response.url;
    // Drain a small amount so connection errors surface without storing whole pages.
    const reader = response.body?.getReader();
    if (reader) await reader.read();
  } catch (e) {
    error = e.message;
  }
  results.push({ url, ok, status, finalUrl, elapsedMs: Date.now() - started, ...(error ? { error } : {}) });
}
const report = {
  date: new Date().toISOString(),
  source: path.relative(root, source),
  skipped: [selfReportUrl],
  status: results.every(r => r.ok) ? 'passed' : 'failed',
  total: results.length,
  passed: results.filter(r => r.ok).length,
  failed: results.filter(r => !r.ok).length,
  results,
};
await writeFile(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'passed' ? 0 : 1;
