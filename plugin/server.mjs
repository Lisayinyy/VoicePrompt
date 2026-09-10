import { initConfig, loadConfig, configPath } from './lib/config.mjs';
import { createService } from './lib/service.mjs';
import { startMcp } from './lib/mcp.mjs';
import { request } from './lib/client.mjs';
import { run } from './lib/process.mjs';

const command = process.argv[2] || 'mcp';
try {
  if (command === 'mcp') startMcp();
  else if (command === 'init') { await initConfig(); console.log(`Created configuration: ${configPath()}\nStart: node server.mjs serve\nOpen review panel: node server.mjs open`); }
  else if (command === 'serve') {
    const config = await initConfig(), service = createService(config);
    service.server.listen(config.port, '127.0.0.1', () => console.error(`Voice Prompt listening on http://127.0.0.1:${config.port} (local authentication required)`));
    service.server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await service.close(); process.exit(0); });
  } else if (command === 'open') {
    const config = await initConfig();
    await request('/api/status', undefined, { config });
    await run('/usr/bin/open', [`http://127.0.0.1:${config.port}/#${config.token}`]);
  } else if (command === 'status') console.log(JSON.stringify(await request('/api/status'), null, 2));
  else if (command === 'prepare') {
    let text = ''; for await (const chunk of process.stdin) text += chunk;
    console.log(JSON.stringify(await request('/api/prepare', { text, mode: process.argv[3], session: 'cli' }), null, 2));
  } else { console.error('Usage: node server.mjs [init|serve|open|status|prepare [raw|clean|agent]|mcp]'); process.exitCode = 1; }
} catch (error) { console.error(error.message); process.exitCode = 1; }
