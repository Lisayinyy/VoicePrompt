#!/bin/sh
# Explicit Agent-assisted installation. Never run as an import hook.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo 'Requires Apple Silicon macOS'; exit 1; }
major=$(/usr/bin/sw_vers -productVersion | cut -d . -f 1)
[ "${1:-}" = --update-desktop ] || [ "$major" -ge 15 ] || { echo 'Qwen beta requires macOS 15+; use SenseVoice on older macOS'; exit 1; }
if [ "${1:-}" = --check ]; then
  echo 'Platform supports Qwen. This check does not install, record, or verify permissions.'
  exit 0
fi
[ "${1:-}" = --install ] || [ "${1:-}" = --update-desktop ] || { echo 'Usage: sh scripts/setup-colleague.sh --check | --install | --update-desktop'; exit 1; }
if [ "$1" = --update-desktop ]; then
  [ "$major" -ge 13 ] && [ -d "$HOME/Applications/Voice Prompt.app" ] || { echo 'Desktop update requires an existing installation on macOS 13+'; exit 1; }
fi
if /usr/bin/pgrep -x VoicePrompt >/dev/null; then
  echo 'Quit Voice Prompt before setup; keep MiniMax Code open. Existing settings will be preserved.'
  exit 1
fi
stage=$(mktemp -d "${TMPDIR:-/tmp}/voice-prompt-setup.XXXXXX")
trap 'rm -rf "$stage"' EXIT HUP INT TERM
fetch_checked() {
  url=$1; destination=$2; expected=$3
  /usr/bin/curl --fail --location --retry 3 --connect-timeout 30 --max-time 1800 "$url" -o "$destination"
  actual=$(/usr/bin/shasum -a 256 "$destination" | cut -d ' ' -f 1)
  [ "$actual" = "$expected" ] || { echo 'Download checksum mismatch; stopped without executing it'; exit 1; }
}
mkdir -p "$root/dist"
echo '1/4 Downloading verified desktop app (about 268 MiB)'
fetch_checked 'https://github.com/Lisayinyy/VoicePrompt/releases/download/v0.7.1-beta.1/voice-prompt-desktop-0.7.1-macos-arm64.zip' "$root/dist/voice-prompt-desktop-0.7.1-macos-arm64.zip" '2126f47db1996d9e078fa99ac501371d73d19b2045fccc43ad6741346393bc97'
/usr/bin/ditto -x -k "$root/dist/voice-prompt-desktop-0.7.1-macos-arm64.zip" "$stage/desktop"
app="$stage/desktop/Voice Prompt.app"
/usr/bin/codesign --verify --deep --strict "$app"
# The publisher ships an ad-hoc signed beta, not a notarized app. Keep quarantine intact.
"$app/Contents/Resources/bin/node" "$root/scripts/install.mjs"
if [ "$1" = --update-desktop ]; then
  echo 'Desktop updated. Existing models and AI settings preserved. Reopen Voice Prompt, recheck its permissions, and test insertion in your target input.'
  exit 0
fi
echo '2/4 Preparing a private Python runtime; no system Python changes'
fetch_checked 'https://github.com/astral-sh/uv/releases/download/0.11.6/uv-aarch64-apple-darwin.tar.gz' "$stage/uv.tar.gz" '4b69a4e366ec38cd5f305707de95e12951181c448679a00dce2a78868dfc9f5b'
/usr/bin/tar -xzf "$stage/uv.tar.gz" -C "$stage"
uvbin="$stage/uv-aarch64-apple-darwin"
echo '3/4 Installing locked dependencies and Qwen weights (about 2.46 GB plus dependencies)'
PATH="$uvbin:$PATH" "$uvbin/uv" run --python 3.12 python "$root/scripts/setup-local-asr.py"
echo '4/4 Selecting the verified local model; preserving your AI settings'
"$HOME/Applications/Voice Prompt.app/Contents/Resources/bin/node" "$root/scripts/select-local-asr.mjs"
echo 'Installation finished. Open Voice Prompt, complete macOS permissions and configure your own AI provider. The Agent must verify recording, polishing and insertion separately.'
