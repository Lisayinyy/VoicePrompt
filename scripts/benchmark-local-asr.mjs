// Public fixtures only. This does not record a microphone or call an AI/cloud API.
import { loadConfig } from '../plugin/lib/config.mjs';
import { transcribe, closeSpeech } from '../plugin/lib/speech.mjs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const c = await loadConfig();
const folder = path.resolve(process.argv[2] || 'verification/asr-0.7');
const results = [];
try {
  for (const model of ['sensevoice-small', 'qwen3-asr-1.7b']) {
    for (const [language, file] of [['zh', 'public-zh.wav'], ['en', 'public-en-16k.wav'], ['zh', 'public-zh.wav']]) {
      const result = await transcribe(c, { model, path: path.join(folder, file), language });
      results.push({ file, language, ...result });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
} finally {
  closeSpeech();
  await writeFile(path.join(folder, 'benchmark.json'), JSON.stringify({ hardware: { platform: os.platform(), arch: os.arch(), cpu: os.cpus()[0]?.model, memoryGB: Math.round(os.totalmem() / 1024 ** 3) }, scope: 'public smoke samples, not user accuracy benchmark', results }, null, 2) + '\n');
}
