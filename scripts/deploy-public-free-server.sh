#!/usr/bin/env bash
# Deploy reviewed public enrollment to the existing TLS-protected host.
set -euo pipefail
stage=${1:?Pass the verified candidate directory}
for file in server.mjs invites.mjs public-clients.mjs Caddyfile.template; do test -f "$stage/backend/$file"; done
backup="/var/backups/voice-prompt-free-$(date +%Y%m%d%H%M%S)"
install -d -m 0700 "$backup"
cp -a /opt/voice-prompt/backend "$backup/backend"
cp -p /etc/voice-prompt/backend.env "$backup/backend.env"
cp -p /etc/voice-prompt-caddy/Caddyfile "$backup/Caddyfile"
rollback() {
  cp -a "$backup/backend/." /opt/voice-prompt/backend/
  cp -p "$backup/backend.env" /etc/voice-prompt/backend.env
  cp -p "$backup/Caddyfile" /etc/voice-prompt-caddy/Caddyfile
  systemctl restart voice-prompt
  systemctl reload voice-prompt-caddy
  echo "Previous service restored. Backup: $backup" >&2
}
trap rollback ERR
for file in server.mjs invites.mjs public-clients.mjs; do
  install -m 0644 "$stage/backend/$file" "/opt/voice-prompt/backend/$file"
done
python3 - <<'PY'
from pathlib import Path
p = Path('/etc/voice-prompt/backend.env')
values = {'VOICE_PUBLIC_ENROLLMENT': 'true', 'VOICE_PUBLIC_CLIENT_DAILY_LIMIT': '30', 'VOICE_TRUST_LOOPBACK_PROXY': 'true'}
lines = [s for s in p.read_text().splitlines() if s.split('=', 1)[0] not in values]
lines.extend(k + '=' + v for k, v in values.items())
p.write_text('\n'.join(lines) + '\n')
PY
sed 's/__VOICE_PROMPT_DOMAIN__/api.voiceprompt.work/' "$stage/backend/Caddyfile.template" > "$stage/Caddyfile.free"
/opt/voice-prompt-caddy/caddy validate --config "$stage/Caddyfile.free" --adapter caddyfile
systemctl restart voice-prompt
for attempt in 1 2 3 4 5; do
  if curl -fsS --max-time 3 http://127.0.0.1:8787/healthz >/dev/null; then break; fi
  sleep 1
done
curl -fsS --max-time 5 http://127.0.0.1:8787/healthz >/dev/null
install -m 0644 "$stage/Caddyfile.free" /etc/voice-prompt-caddy/Caddyfile
install -m 0644 "$stage/Caddyfile.free" /etc/voice-prompt-caddy/Caddyfile.pending
systemctl reload voice-prompt-caddy
trap - ERR
echo "Public enrollment deployed. Shared model key and global quota limits preserved. Backup: $backup"
