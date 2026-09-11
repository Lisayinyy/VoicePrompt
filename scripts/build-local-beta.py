#!/usr/bin/env python3
"""Build 0.7.0 from an existing verified desktop runtime, preserving bundled fallback.
The optional Qwen model/runtime lives in the user's ~/.local/share directory;
use setup-local-asr.py on this Mac first. This is not a self-contained Qwen release.
"""
import json
import pathlib
import plistlib
import shutil
import subprocess
import sys

root = pathlib.Path(__file__).resolve().parents[1]
base = pathlib.Path.home() / "Applications/Voice Prompt.app"
stage = pathlib.Path(sys.argv[1])
app = stage / "Voice Prompt.app"
stage.mkdir(parents=True, exist_ok=True)
if app.exists():
    sys.exit("Use a fresh staging directory")
subprocess.run(["codesign", "--verify", "--deep", "--strict", str(base)], check=True)
shutil.copytree(base, app)
contents = app / "Contents"
resources = contents / "Resources"
sources = ["VoicePrompt.swift", "VoicePromptUI.swift", "VoiceHotkey.swift", "VoiceDirectEdit.swift", "VoicePasteboard.swift", "VoiceInputGuard.swift"]
subprocess.run(["swiftc", "-swift-version", "5", "-parse-as-library", "-target", "arm64-apple-macosx13.0", "-O", *[str(root / "native" / s) for s in sources], "-o", str(contents / "MacOS/VoicePrompt"), "-framework", "AppKit", "-framework", "AVFoundation", "-framework", "Carbon"], check=True)
shutil.copytree(root / "plugin", resources / "plugin", dirs_exist_ok=True)
info = plistlib.loads((contents / "Info.plist").read_bytes())
info.update(CFBundleShortVersionString="0.7.0", CFBundleVersion="16")
(contents / "Info.plist").write_bytes(plistlib.dumps(info))
manifest = json.loads((resources / "components.json").read_text())
manifest.update(version="0.7.0", optionalLocalASR={"name": "Qwen3-ASR-1.7B-8bit", "revision": "a8379a2e2f9e313c9292cdf1af4055ab56d50d55", "engine": "mlx-audio 0.5.3", "bundled": False, "setup": "scripts/setup-local-asr.py"})
(resources / "components.json").write_text(json.dumps(manifest, indent=2) + "\n")
subprocess.run(["codesign", "--force", "--deep", "--sign", "-", str(app)], check=True)
subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True)
archive = root / "dist/voice-prompt-desktop-0.7.0-macos-arm64.zip"
archive.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["/usr/bin/ditto", "-c", "-k", "--norsrc", "--keepParent", str(app), str(archive)], check=True)
print(archive)
