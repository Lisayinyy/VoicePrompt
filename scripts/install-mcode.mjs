import { cp, mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const data = process.argv[2];
if (!data || !path.isAbsolute(data)) throw new Error('Pass the verified active MiniMax data directory as an absolute path');
const destination = path.join(data, 'plugins/voice-prompt');
try {
  const existing = JSON.parse(await readFile(path.join(destination, '.minimax-plugin/plugin.json'), 'utf8'));
  if (existing.name !== 'voice-prompt' || existing.author !== 'Voice Prompt contributors') throw new Error('Refusing to replace another plugin');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const source = path.join(root, 'plugin');
await mkdir(destination, { recursive: true });
for (const name of ['mcp-launch.sh', 'server.mjs', 'lib', 'web', 'skills', 'LICENSE', 'README.md']) await cp(path.join(source, name), path.join(destination, name), { recursive: true });
const iconRoot = path.join(data, '.builtin-skills/plugin-creator/assets');
const light = path.join(iconRoot, 'category-icons/productivity'), dark = path.join(iconRoot, 'category-icons-dark/productivity');
const choices = (await readdir(light)).filter(name => name.endsWith('.png'));
if (!choices.length) throw new Error('Missing MiniMax built-in icon pool');
const choice = choices[Math.floor(Math.random() * choices.length)];
await stat(path.join(dark, choice));
await cp(path.join(light, choice), path.join(destination, 'icon.png'));
await cp(path.join(dark, choice), path.join(destination, 'icon-dark.png'));
await writeFile(path.join(destination, 'ATTRIBUTION.md'), `Local icon pair copied from the active MiniMax Code built-in plugin-creator productivity pool: ${choice}. These assets are only used in this local installation and are not included in the portable community ZIP.\n`);
await writeFile(path.join(destination, 'voice-prompt.mcp.json'), JSON.stringify({ schemaVersion: 1, mcpServers: { 'voice-prompt': { type: 'stdio', command: 'sh', args: ['./mcp-launch.sh'], description: 'Local Voice Prompt companion bridge', timeout: 180000 } } }, null, 2) + '\n');
await mkdir(path.join(destination, '.minimax-plugin'), { recursive: true });
await writeFile(path.join(destination, '.minimax-plugin/plugin.json'), JSON.stringify({ schemaVersion: 1, name: 'voice-prompt', displayName: 'Voice Prompt', version: '0.6.5', description: '快捷键语音输入并自动填入；可开启录音后润色，或 @Voice Prompt 整理已发送的文字。', author: 'Voice Prompt contributors', icon: 'icon.png', darkIcon: 'icon-dark.png', category: 'Productivity', exampleQueries: ['检查 Voice Prompt 是否已连接', '把这段口述整理成 Agent 指令，保留原意和限制', '转录我指定的 WAV 音频文件'], apps: [], mcpServers: ['voice-prompt.mcp.json'], skills: ['skills/voice-prompt/SKILL.md'], hooks: [] }, null, 2) + '\n');
console.log(`Installed local MiniMax plugin: ${destination}\nIcon pair: ${choice}`);
