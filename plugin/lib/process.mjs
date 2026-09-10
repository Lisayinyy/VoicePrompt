import { spawn } from 'node:child_process';

// No shell, bounded output, and caller-owned cancellation. Never log speech or credentials.
export function run(command, args, { signal, timeoutMs = 30000, cwd, input, maxBytes = 4 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', bytes = 0, failure, killTimer;
    const stop = error => {
      failure ||= error;
      child.kill('SIGTERM');
      killTimer ||= setTimeout(() => child.kill('SIGKILL'), 1000);
    };
    const abort = () => stop(signal.reason || new Error('Cancelled'));
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop(new Error('Process timed out')), timeoutMs);
    for (const [stream, kind] of [[child.stdout, 'out'], [child.stderr, 'err']]) stream.setEncoding('utf8').on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > maxBytes) return stop(new Error('Process output limit exceeded'));
      if (kind === 'out') stdout += chunk.toString(); else stderr += chunk.toString();
    });
    const cleanup = () => { clearTimeout(timer); clearTimeout(killTimer); signal?.removeEventListener('abort', abort); };
    child.on('error', error => { cleanup(); reject(error); });
    child.on('close', code => {
      cleanup();
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`Process exited ${code}. ${stderr.slice(-500).replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')}`));
      else resolve({ stdout, stderr });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
