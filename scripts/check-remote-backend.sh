#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-ubuntu@106.52.92.17}"
KEY="${VOICE_PROMPT_SSH_KEY:-$HOME/.ssh/voice_prompt_tencent}"

ssh -i "$KEY" \
  -o BatchMode=yes \
  -o ConnectTimeout=10 \
  -o StrictHostKeyChecking=accept-new \
  "$HOST" 'set -euo pipefail
    echo "== identity =="
    whoami
    hostname
    date
    echo "== services =="
    systemctl is-active voice-prompt || true
    systemctl is-active voice-prompt-caddy || true
    echo "== listeners =="
    ss -ltnp | sed -n "1,120p"
    echo "== backend loopback =="
    curl -sS --max-time 5 http://127.0.0.1:8787/healthz || true
    echo
    echo "== pending caddy validation =="
    if [ -f /etc/voice-prompt-caddy/Caddyfile.pending ]; then
      sudo /opt/voice-prompt-caddy/caddy validate --config /etc/voice-prompt-caddy/Caddyfile.pending --adapter caddyfile
    else
      echo "missing /etc/voice-prompt-caddy/Caddyfile.pending"
    fi
    echo "== systemd unit validation =="
    sudo systemd-analyze verify /etc/systemd/system/voice-prompt-caddy.service
  '
