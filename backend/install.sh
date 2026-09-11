#!/usr/bin/env bash
set -euo pipefail
# Run on the new Ubuntu instance as root, after copying and verifying the release archive.
# NODE_ARCHIVE must contain the official Linux x64 Node.js distribution.
: "${NODE_ARCHIVE:?Set NODE_ARCHIVE}"
: "${NODE_SHA256:?Set NODE_SHA256}"
printf '%s  %s\n' "$NODE_SHA256" "$NODE_ARCHIVE" | sha256sum -c -
id voiceprompt >/dev/null 2>&1 || useradd --system --home /var/lib/voice-prompt --shell /usr/sbin/nologin voiceprompt
install -d -m 0755 /opt/voice-prompt-node /opt/voice-prompt
tar -xJf "$NODE_ARCHIVE" --strip-components=1 -C /opt/voice-prompt-node
install -d -m 0750 -o root -g voiceprompt /etc/voice-prompt
install -d -m 0700 -o voiceprompt -g voiceprompt /var/lib/voice-prompt
if [ ! -e /etc/voice-prompt/backend.env ]; then
  install -m 0640 -o root -g voiceprompt /opt/voice-prompt/backend/backend.env.example /etc/voice-prompt/backend.env
fi
if [ ! -e /etc/voice-prompt/clients.json ]; then
  printf '[]\n' > /etc/voice-prompt/clients.json
  chown root:voiceprompt /etc/voice-prompt/clients.json
  chmod 0640 /etc/voice-prompt/clients.json
fi
install -m 0644 /opt/voice-prompt/backend/voice-prompt.service /etc/systemd/system/voice-prompt.service
systemctl daemon-reload
systemctl enable voice-prompt.service
systemctl restart voice-prompt.service
systemctl is-active voice-prompt.service
