// Real public check using a separate client identity; never prints credentials or text.
import { randomBytes } from 'node:crypto';
import { writeFile, readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { checkedRequest, verifyEndpoint } from './verify-https.mjs';

const [privateDirectory, reportFile] = process.argv.slice(2);
if (!path.isAbsolute(privateDirectory || '') || !path.isAbsolute(reportFile || '')) throw new Error('Pass absolute private state directory and report file');
await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
const credentialFile = path.join(privateDirectory, 'public-qa-credential');
try { await writeFile(credentialFile, randomBytes(32).toString('base64url'), { mode: 0o600, flag: 'wx' }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
if ((await stat(credentialFile)).mode & 0o077) throw new Error('Credential file must be private');
const credential = (await readFile(credentialFile, 'utf8')).trim();
if (!/^[A-Za-z0-9_-]{43}$/.test(credential)) throw new Error('Invalid private credential');
const origin = 'https://api.voiceprompt.work';
try {
  const enrollment = await checkedRequest(origin + '/client/enroll', { method: 'POST', body: { credential } });
  const enrolled = JSON.parse(enrollment.body);
  if (enrollment.status !== 200 || enrolled.plan !== 'free' || enrolled.activated !== true) throw new Error(`Free enrollment failed: HTTP ${enrollment.status}`);
  const report = await verifyEndpoint(origin, { token: credential });
  const english = await checkedRequest(origin + '/voice/prepare', { method: 'POST', token: credential,
    body: { prompt: 'Um, please check the login page, keep version 2.0, and do not modify the database.', mode: 'clean', terms: [] } });
  const draft = JSON.parse(english.body);
  if (english.status !== 200 || draft.fallback !== false || draft.schema !== 'prompt-ai-voice/1' || !draft.optimized?.includes('2.0') || !/database/i.test(draft.optimized)) throw new Error('English polishing failed or lost constraints');
  const result = { ...report, checkedAt: new Date().toISOString(), status: 'passed', freeEnrollment: true,
    invitationRequired: false, vendorKeyOnClient: false, dailyLimit: enrolled.dailyLimit,
    englishPolishing: { status: 'passed', elapsedMs: english.elapsedMs },
    scope: 'Real public TLS, automatic enrollment and Chinese/English model calls. Does not verify desktop installation, microphone, or input insertion.' };
  await writeFile(reportFile, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const result = { status: 'failed', checkedAt: new Date().toISOString(), reason: error.message };
  await writeFile(reportFile, JSON.stringify(result, null, 2) + '\n');
  console.error(JSON.stringify(result)); process.exitCode = 1;
}
