import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = process.argv[2] || fileURLToPath(new URL('../plugin/', import.meta.url));
const launcher = process.argv.includes('--launcher');
const child = spawn(launcher ? '/bin/sh' : process.execPath, launcher ? ['./mcp-launch.sh'] : ['server.mjs', 'mcp'], { cwd: root, env: { ...process.env, ...(launcher ? { PATH: '/usr/bin:/bin' } : {}) }, stdio: ['pipe', 'pipe', 'pipe'] });
let buffer = '', sequence = 0; const pending = new Map();
child.stderr.on('data', c => process.stderr.write(c)); child.stdout.setEncoding('utf8');
child.stdout.on('data', chunk => { buffer += chunk; let end; while ((end = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); const message = JSON.parse(line); pending.get(message.id)?.(message); pending.delete(message.id); } });
const call = (method, params) => new Promise(resolve => { const id = ++sequence; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const timer = setTimeout(() => { child.kill(); console.error('MCP verification timed out'); process.exitCode = 1; }, 30000);
try {
  const initialized = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'voice-verifier', version: '1' } });
  if (initialized.error) throw new Error(JSON.stringify(initialized));
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const listed = await call('tools/list', {});
  if (listed.result?.tools.length !== 4) throw new Error('Expected four tools');
  const result = await call('tools/call', { name: 'voice_status', arguments: {} });
  if (result.result?.isError || result.error) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify({ root, tools: listed.result.tools.map(t => t.name), status: JSON.parse(result.result.content[0].text) }, null, 2));
} finally { clearTimeout(timer); child.stdin.end(); child.kill(); }
