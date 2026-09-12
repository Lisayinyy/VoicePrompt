#!/usr/bin/env bash
set -euo pipefail

if [[ "${VOICE_PROMPT_ENABLE_PUBLIC_HTTPS:-}" != "1" ]]; then
  cat >&2 <<'MSG'
Refusing to expose the public HTTPS API.
Set VOICE_PROMPT_ENABLE_PUBLIC_HTTPS=1 only after ICP/备案/resource requirements,
Tencent Cloud security group, Ubuntu firewall, and rollback path are confirmed.
MSG
  exit 2
fi

HOST="${1:-ubuntu@106.52.92.17}"
KEY="${VOICE_PROMPT_SSH_KEY:-$HOME/.ssh/voice_prompt_tencent}"

ssh -i "$KEY" \
  -o BatchMode=yes \
  -o ConnectTimeout=10 \
  -o StrictHostKeyChecking=accept-new \
  "$HOST" 'set -euo pipefail
    pending=/etc/voice-prompt-caddy/Caddyfile.pending
    active=/etc/voice-prompt-caddy/Caddyfile
    caddy=/opt/voice-prompt-caddy/caddy

    test -f "$pending"
    sudo "$caddy" validate --config "$pending" --adapter caddyfile
    sudo systemd-analyze verify /etc/systemd/system/voice-prompt-caddy.service
    curl -sS --max-time 5 http://127.0.0.1:8787/healthz >/dev/null

    if [ -f "$active" ]; then
      sudo cp -p "$active" "$active.backup.$(date +%Y%m%d%H%M%S)"
    fi
    sudo install -m 0644 -o root -g root "$pending" "$active"
    sudo systemctl enable --now voice-prompt-caddy
    sleep 3
    systemctl --no-pager --full status voice-prompt-caddy
    ss -ltnp | sed -n "1,120p"
  '

node scripts/verify-https.mjs 'https://api.voiceprompt.work'
