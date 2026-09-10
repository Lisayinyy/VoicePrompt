import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const cwd = await mkdtemp(path.join(tmpdir(), 'voice-rpc-check-'));
await writeFile(path.join(cwd, 'overlay.yml'), 'stt:\n  enabled: false\n');
const extensionArgs = process.argv.includes('--installed') ? [] : ['--no-extensions', '-e', path.join(root, 'plugin/omp/extension.mjs')];
const child = spawn(process.env.OMP_COMMAND || path.join(process.env.HOME, '.local/bin/omp'), ['--mode', 'rpc', '--no-session', '--no-tools', '--no-skills', '--no-rules', '--no-title', '--config', path.join(cwd, 'overlay.yml'), ...extensionArgs], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '', found = false, sent = false;
const events = [];
const timer = setTimeout(() => { console.error('OMP RPC verification timed out'); child.kill(); process.exitCode = 1; }, 65000);
child.stdout.setEncoding('utf8'); child.stderr.resume();
child.stdout.on('data', chunk => {
  buffer += chunk; let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let event; try { event = JSON.parse(line); } catch { continue; }
    if (event.id === 'commands') {
      const voice = event.data?.commands?.find(c => c.name === 'voice-prompt');
      if (!voice) { console.error('Voice extension missing'); process.exitCode = 1; child.kill(); return; }
      found = true; console.log(JSON.stringify({ extension: voice }));
      child.stdin.write(JSON.stringify({ id: 'polish', type: 'prompt', message: '/voice-prompt 请增加验证码，不要修改数据库。' }) + '\n');
    }
    if (event.type === 'agent_start') { console.error('Unexpected outer agent turn'); process.exitCode = 1; child.kill(); }
    if (event.type === 'extension_ui_request') {
      events.push(event); console.log(JSON.stringify(event));
      if (event.method === 'set_editor_text') { sent = true; clearTimeout(timer); child.kill(); }
      if (event.method === 'notify' && event.notifyType === 'error') { process.exitCode = 1; clearTimeout(timer); child.kill(); }
    }
  }
});
child.stdin.write(JSON.stringify({ id: 'commands', type: 'get_available_commands' }) + '\n');
await new Promise(resolve => child.on('close', resolve)); clearTimeout(timer);
await rm(cwd, { recursive: true, force: true });
if (!found || !sent) process.exitCode = 1;
