import { fileURLToPath } from 'node:url';
// Real OMP runtime + deterministic transcript fixture. No microphone capture or model call.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { createDirectCapture } from '../plugin/lib/direct-capture.mjs';
const dir = await mkdtemp(path.join(tmpdir(), 'voice-direct-omp-'));
const broker = createDirectCapture(), token = 'test-only-direct-'.repeat(4);
const transcript = '请检查登录页面。Do not deploy.';
let written = false;
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); res.end(); return; }
    let raw = ''; for await (const c of req) raw += c;
    const action = req.url.slice('/api/capture/'.length), input = JSON.parse(raw || '{}');
    const result = broker(action, input);
    if (action === 'start') {
      broker('next'); broker('update', { id: result.id, state: 'ready', text: transcript });
    }
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(result));
  } catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: e.message } })); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const config = path.join(dir, 'voice.json');
await writeFile(config, JSON.stringify({ token, port: server.address().port, provider: 'unconfigured' }));
await writeFile(path.join(dir, 'overlay.yml'), 'stt:\n  enabled: false\n');
const source = process.argv.includes('--installed') ? [] : ['--no-extensions', '-e', fileURLToPath(new URL('../plugin/omp/extension.mjs', import.meta.url))];
const child = spawn(path.join(homedir(), '.local/bin/omp'), ['--mode', 'rpc', '--no-session', '--no-tools', '--no-skills', '--no-rules', '--no-title', '--config', path.join(dir, 'overlay.yml'), ...source], { cwd: dir, env: { ...process.env, VOICE_PROMPT_CONFIG: config }, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '';
const timeout = setTimeout(() => { console.error('Direct OMP test timed out'); child.kill(); }, 25000);
child.stderr.resume(); child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let event; try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'agent_start') { console.error('Unexpected model execution'); child.kill(); return; }
    if (event.type === 'extension_ui_request' && event.method === 'set_editor_text') {
      written = event.text === transcript;
      console.log(JSON.stringify({ actualRuntime: 'OMP', transport: 'set_editor_text', text: event.text, matched: written, audio: 'fixture, not microphone' }));
      child.kill();
    }
  }
});
child.stdin.write(JSON.stringify({ id: 'direct', type: 'prompt', message: '/voice input' }) + '\n');
await once(child, 'close'); clearTimeout(timeout); server.closeAllConnections(); await new Promise(r => server.close(r));
await rm(dir, { recursive: true, force: true });
if (!written) process.exitCode = 1;
