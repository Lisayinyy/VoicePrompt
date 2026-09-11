#!/bin/sh
set -eu
runtime="$HOME/Applications/Voice Prompt.app/Contents/Resources/bin/node"
if [ -r "$HOME/.config/voice-prompt/runtime-path" ]; then
  runtime=$(cat "$HOME/.config/voice-prompt/runtime-path")
fi
if [ ! -x "$runtime" ]; then
  # A host-provided Node can expose first-use diagnostics before the desktop exists.
  runtime=$(command -v node || true)
  if [ -z "$runtime" ] || ! "$runtime" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' >/dev/null 2>&1; then
    echo 'Voice Prompt needs first-use setup. Read skills/voice-prompt/references/setup.md using the host Agent file tools. No desktop runtime or Node 22+ was found; the Skill guide works without MCP.' >&2
    exit 1
  fi
fi
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$runtime" "$base/server.mjs" mcp
