#!/bin/sh
set -eu
runtime="$HOME/Applications/Voice Prompt.app/Contents/Resources/bin/node"
if [ -r "$HOME/.config/voice-prompt/runtime-path" ]; then
  runtime=$(cat "$HOME/.config/voice-prompt/runtime-path")
fi
if [ ! -x "$runtime" ]; then
  echo 'Voice Prompt desktop runtime is missing. Install and open Voice Prompt.app first. This connector does not download native software.' >&2
  exit 1
fi
base=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "$runtime" "$base/server.mjs" mcp
