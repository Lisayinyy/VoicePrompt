import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const json = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));

test('Git import and standalone connector resolve their MCP launchers', async () => {
  const version = (await json('package.json')).version;
  for (const prefix of ['', 'plugin/']) {
    assert.equal((await json(prefix + 'plugin.json')).version, version);
    const { mcpServers } = await json(prefix + 'mcp.json');
    const server = mcpServers['voice-prompt'];
    const base = path.resolve(root, prefix, server.cwd || '.');
    assert.ok(base.startsWith(root));
    for (const arg of server.args.filter(arg => arg.startsWith('./'))) {
      const resolved = path.resolve(base, arg);
      assert.ok(resolved.startsWith(root));
      await access(resolved);
    }
    await access(path.join(root, prefix, 'skills/voice-prompt/SKILL.md'));
  }
  assert.equal(await readFile(path.join(root, 'skills/voice-prompt/SKILL.md'), 'utf8'),
    await readFile(path.join(root, 'plugin/skills/voice-prompt/SKILL.md'), 'utf8'));
});

test('README local links resolve in the published source tree', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) {
    const url = match[1];
    if (/^https?:|^#/.test(url)) continue;
    await access(path.join(root, url.split('#')[0]));
  }
});
