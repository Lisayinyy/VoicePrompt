import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// Own one model process, reuse between utterances, kill on cancellation and expiry.
export class QwenWorker {
  constructor({ idleMs = 1800000, timeoutMs = 180000, spawnProcess = spawn } = {}) {
    Object.assign(this, { idleMs, timeoutMs, spawnProcess });
  }
  stop(error = new Error('ASR worker stopped')) {
    clearTimeout(this.idle);
    const child = this.child;
    this.child = undefined; this.key = undefined;
    this.pending?.reject(error); this.pending = undefined;
    if (child) {
      child.kill('SIGTERM');
      const timer = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 1000);
      timer.unref(); child.once('close', () => clearTimeout(timer));
    }
  }
  warm(config) {
    if (this.warming) return this.warming;
    if (this.child && this.key === JSON.stringify([config.asrPython, config.qwenModelPath])) {
      clearTimeout(this.idle); this.idle = setTimeout(() => this.stop(), this.idleMs); this.idle.unref();
      return Promise.resolve();
    }
    this.warming = this.request(config, { op: 'warm', language: 'auto', terms: [] }).finally(() => { this.warming = undefined; });
    return this.warming;
  }
  async request(config, input, signal) {
    signal?.throwIfAborted();
    if (input.op !== 'warm' && this.warming) {
      const cancelWarm = () => this.stop(signal.reason || new Error('Cancelled'));
      signal?.addEventListener('abort', cancelWarm, { once: true });
      try { await this.warming; } finally { signal?.removeEventListener('abort', cancelWarm); }
      signal?.throwIfAborted();
    }
    if (this.pending) throw new Error('ASR worker is busy');
    const key = JSON.stringify([config.asrPython, config.qwenModelPath]);
    if (this.child && key !== this.key) this.stop();
    clearTimeout(this.idle);
    if (!this.child) {
      const child = this.spawnProcess(config.asrPython, ['-u', fileURLToPath(new URL('../asr/qwen_worker.py', import.meta.url)), config.qwenModelPath],
        { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' } });
      this.child = child; this.key = key;
      let buffer = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', data => {
        buffer += data;
        if (buffer.length > 1024 * 1024) return this.stop(new Error('ASR output exceeded limit'));
        let index;
        while ((index = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
          try {
            const result = JSON.parse(line);
            if (result.id !== this.pending?.id) continue;
            if (result.error) this.pending.reject(new Error(result.error));
            else if (typeof result.text !== 'string') this.pending.reject(new Error('Invalid ASR response'));
            else this.pending.resolve(result);
          } catch { this.stop(new Error('Invalid ASR worker protocol')); }
        }
      });
      // Drain diagnostics without persisting user speech or model output.
      child.stderr.on('data', () => {});
      child.stdin.on('error', () => { if (this.child === child) this.stop(new Error('ASR worker pipe closed')); });
      child.on('error', () => { if (this.child === child) this.stop(new Error('Local ASR runtime unavailable; reinstall the Qwen runtime or select SenseVoice')); });
      child.on('close', code => { if (this.child === child) this.stop(new Error(`ASR worker exited (${code}); try a shorter recording or select SenseVoice`)); });
    }
    const id = randomUUID();
    let timer;
    const abort = () => this.stop(signal.reason || new Error('Cancelled'));
    try {
      return await new Promise((resolve, reject) => {
        this.pending = { id, resolve, reject };
        timer = setTimeout(() => this.stop(new Error('ASR timed out; please try a shorter recording')), this.timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        this.child.stdin.write(JSON.stringify({ ...input, id }) + '\n');
      });
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort); this.pending = undefined;
      if (this.child) { this.idle = setTimeout(() => this.stop(), this.idleMs); this.idle.unref(); }
    }
  }
}
export const qwenWorker = new QwenWorker();
process.once('exit', () => qwenWorker.child?.kill('SIGKILL'));
