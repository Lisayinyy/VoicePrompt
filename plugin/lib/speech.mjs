import { open, access, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { run } from './process.mjs';
export async function listModels(config) {
  let downloaded = false;
  try { await access(config.speechModel); await access(config.engineCommand); downloaded = true; } catch {}
  return [{ id: 'sensevoice-small', name: 'SenseVoice Small', downloaded, languages: ['zh', 'en', 'yue', 'ja', 'ko'], engine: 'transcribe.cpp' }];
}
export async function validateWav(filename) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw new Error('Use an absolute WAV path');
  const file = await open(filename, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 128 * 1024 * 1024 || stat.size < 44) throw new Error('WAV must be a regular file below 128 MB');
    const header = Buffer.alloc(12); await file.read(header, 0, 12, 0);
    if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Expected PCM WAV');
    let offset = 12, format = false, data = false;
    while (offset + 8 <= stat.size) {
      const chunk = Buffer.alloc(8); await file.read(chunk, 0, 8, offset);
      const size = chunk.readUInt32LE(4), name = chunk.toString('ascii', 0, 4);
      if (offset + 8 + size > stat.size) throw new Error('Truncated WAV');
      if (name === 'fmt ') {
        if (size < 16) throw new Error('Invalid WAV format');
        const fmt = Buffer.alloc(16); await file.read(fmt, 0, 16, offset + 8);
        if (fmt.readUInt16LE(0) !== 1 || fmt.readUInt16LE(2) !== 1 || fmt.readUInt32LE(4) !== 16000 || fmt.readUInt16LE(14) !== 16) throw new Error('Voice Prompt requires 16 kHz mono 16-bit PCM WAV');
        format = true;
      }
      if (name === 'data' && size > 0) data = true;
      offset += 8 + size + (size % 2);
    }
    if (!format || !data) throw new Error('WAV is missing format or audio data');
  } finally { await file.close(); }
}

// Split long recordings at a low-energy point near each 25-second boundary.
export function splitPcm(wav) {
  let offset = 12, pcm;
  while (offset + 8 <= wav.length) {
    const size = wav.readUInt32LE(offset + 4);
    if (wav.toString('ascii', offset, offset + 4) === 'data') { pcm = wav.subarray(offset + 8, offset + 8 + size); break; }
    offset += 8 + size + size % 2;
  }
  if (!pcm?.length) throw new Error('No audio data');
  const chunks = []; let start = 0;
  while (start < pcm.length) {
    let end = Math.min(start + 25 * 32000, pcm.length);
    if (end < pcm.length) {
      let energy = Infinity, best = end;
      for (let at = end - 32000; at < end; at += 640) {
        let sum = 0; for (let i = at; i < at + 640; i += 2) sum += Math.abs(pcm.readInt16LE(i));
        if (sum < energy) { energy = sum; best = at + 320; }
      }
      end = best;
    }
    const data = pcm.subarray(start, end), header = Buffer.alloc(44);
    header.write('RIFF'); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
    header.writeUInt32LE(16000, 24); header.writeUInt32LE(32000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
    header.write('data', 36); header.writeUInt32LE(data.length, 40);
    chunks.push(Buffer.concat([header, data])); start = end;
  }
  return chunks;
}
export async function transcribe(config, input, signal) {
  await validateWav(input.path);
  if (input.model && input.model !== 'sensevoice-small') throw new Error('Bundled model is sensevoice-small');
  const started = performance.now(), dir = await mkdtemp(path.join(tmpdir(), 'voice-prompt-audio-'));
  try {
    const chunks = splitPcm(await readFile(input.path)), texts = [];
    for (let i = 0; i < chunks.length; i++) {
      signal?.throwIfAborted();
      const audio = path.join(dir, `${i}.wav`), out = path.join(dir, `${i}.txt`);
      await writeFile(audio, chunks[i], { mode: 0o600 });
      await run(config.engineCommand, ['--backend', 'cpu_accel', '-m', config.speechModel, '-q', '-o', out, audio], { signal, timeoutMs: 180000 });
      texts.push((await readFile(out, 'utf8')).trim());
    }
    return { text: texts.filter(Boolean).join(' '), model: 'sensevoice-small', chunks: chunks.length, wallMs: Math.round(performance.now() - started) };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
