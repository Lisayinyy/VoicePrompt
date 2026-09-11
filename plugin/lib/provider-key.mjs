import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

// Desktop apps opened from Finder do not inherit terminal environment variables.
export async function providerKey(config) {
  if (!config.apiKeyFile) return process.env[config.apiKeyEnv];
  if (!path.isAbsolute(config.apiKeyFile)) throw new Error('Credential file must be absolute');
  const file = await open(config.apiKeyFile, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 8192 || (stat.mode & 0o077) ||
        (process.getuid && stat.uid !== process.getuid())) throw new Error('Credential file must be private');
    const key = (await file.readFile('utf8')).trim();
    if (!key || /\s/.test(key)) throw new Error('Invalid credential file');
    return key;
  } finally { await file.close(); }
}
