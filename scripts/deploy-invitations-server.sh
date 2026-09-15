#!/usr/bin/env bash
# Run with sudo on the existing Voice Prompt host after the isolated tests pass.
set -euo pipefail
stage=${1:?Pass the verified candidate directory}
test -f "$stage/backend/server.mjs"
test -f "$stage/backend/invites.mjs"
test -f "$stage/invitations.json"
backup="/var/backups/voice-prompt-invitations-$(date +%Y%m%d%H%M%S)"
install -d -m 0700 "$backup"
cp -a /opt/voice-prompt/backend "$backup/backend"
cp -p /etc/voice-prompt/backend.env "$backup/backend.env"
cp -p /etc/voice-prompt-caddy/Caddyfile.pending "$backup/Caddyfile.pending"
rollback() {
  cp -a "$backup/backend/." /opt/voice-prompt/backend/
  cp -p "$backup/backend.env" /etc/voice-prompt/backend.env
  cp -p "$backup/Caddyfile.pending" /etc/voice-prompt-caddy/Caddyfile.pending
  systemctl restart voice-prompt
  echo "Deployment failed; previous backend restored. Backup: $backup" >&2
}
trap rollback ERR
install -m 0644 "$stage/backend/server.mjs" /opt/voice-prompt/backend/server.mjs
install -m 0644 "$stage/backend/invites.mjs" /opt/voice-prompt/backend/invites.mjs
# Never overwrite a live redemption ledger on a retry or upgrade.
if [ ! -f /var/lib/voice-prompt/invitations.json ]; then
  install -m 0600 -o voiceprompt -g voiceprompt "$stage/invitations.json" /var/lib/voice-prompt/invitations.json
fi
python3 - <<'PY'
from pathlib import Path
p = Path('/etc/voice-prompt/backend.env')
values = {'VOICE_INVITATIONS_FILE': '/var/lib/voice-prompt/invitations.json', 'VOICE_TRUST_LOOPBACK_PROXY': 'true'}
lines = [s for s in p.read_text().splitlines() if s.split('=', 1)[0] not in values]
lines.extend(k + '=' + v for k, v in values.items())
p.write_text('\n'.join(lines) + '\n')
PY
sed 's/__VOICE_PROMPT_DOMAIN__/api.voiceprompt.work/' "$stage/backend/Caddyfile.template" > "$stage/Caddyfile.ready"
/opt/voice-prompt-caddy/caddy validate --config "$stage/Caddyfile.ready" --adapter caddyfile
install -m 0644 "$stage/Caddyfile.ready" /etc/voice-prompt-caddy/Caddyfile.pending
systemctl restart voice-prompt
for attempt in 1 2 3 4 5; do
  if curl -fsS --max-time 3 http://127.0.0.1:8787/healthz >/dev/null; then break; fi
  sleep 1
done
curl -fsS --max-time 5 http://127.0.0.1:8787/healthz >/dev/null
trap - ERR
echo "Invitation backend installed on loopback. HTTPS activation is separate. Backup: $backup"
