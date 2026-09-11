import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isIP } from 'node:net';

export function validateDomain(domain) {
  if (typeof domain !== 'string' || domain.length > 253 || domain !== domain.toLowerCase() || isIP(domain) ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) ||
      /(^|\.)(?:localhost|local|test|invalid|example)$/.test(domain) ||
      /(^|\.)example\.(com|net|org)$/.test(domain)) {
    throw new Error('Provide the real lowercase DNS hostname only, not a URL, IP, wildcard or example domain');
  }
  return domain;
}

export async function renderCaddy(domain) {
  validateDomain(domain);
  const template = await readFile(new URL('../backend/Caddyfile.template', import.meta.url), 'utf8');
  return template.replace('__VOICE_PROMPT_DOMAIN__', domain);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [domain, destination] = process.argv.slice(2);
    if (!domain || !destination || process.argv.length !== 4) throw new Error('Usage: node scripts/render-caddy.mjs DOMAIN NEW_OUTPUT_FILE');
    await writeFile(destination, await renderCaddy(domain), { flag: 'wx', mode: 0o644 });
    console.log('Caddyfile created; run caddy validate before installation. DNS and HTTPS have not been changed.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
