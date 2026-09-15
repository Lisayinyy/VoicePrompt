#!/usr/bin/env python3
"""Build the invitation beta from a verified runtime, preserving bundled fallback.
The optional Qwen model/runtime lives in the user's ~/.local/share directory;
use setup-local-asr.py on this Mac first. This is not a self-contained Qwen release.
"""
import os
import stat
import json
import pathlib
import plistlib
import shutil
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]
base = pathlib.Path.home() / "Applications/Voice Prompt.app"
stage = pathlib.Path(sys.argv[1])
app = stage / "Voice Prompt.app"
stage.mkdir(parents=True, exist_ok=True)
if app.exists():
    sys.exit("Use a fresh staging directory")
subprocess.run(["codesign", "--verify", "--deep", "--strict", str(base)], check=True)
def clean_copy(source, destination):
    shutil.copyfile(source, destination)
    os.chmod(destination, stat.S_IMODE(os.stat(source).st_mode))
    return destination

shutil.copytree(base, app, copy_function=clean_copy)
contents = app / "Contents"
resources = contents / "Resources"
sources = ["VoicePrompt.swift", "VoicePromptUI.swift", "VoiceHotkey.swift", "VoiceInputReadiness.swift", "VoiceDirectEdit.swift", "VoicePasteboard.swift", "VoiceInputGuard.swift", "VoiceLivePreview.swift", "VoiceAppAppearance.swift", "VoiceBeta.swift"]
with tempfile.TemporaryDirectory(prefix="voice-prompt-native-") as native_stage:
    frozen_sources = []
    for name in sources:
        target = pathlib.Path(native_stage) / name
        shutil.copyfile(root / "native" / name, target)
        frozen_sources.append(str(target))
    subprocess.run(["swiftc", "-swift-version", "5", "-parse-as-library", "-target", "arm64-apple-macosx13.0", "-O", *frozen_sources, "-o", str(contents / "MacOS/VoicePrompt"), "-framework", "AppKit", "-framework", "AVFoundation", "-framework", "Carbon", "-framework", "Security"], check=True)
shutil.copytree(root / "plugin", resources / "plugin", dirs_exist_ok=True, copy_function=clean_copy)
info = plistlib.loads((contents / "Info.plist").read_bytes())
info.update(CFBundleShortVersionString="0.8.0", CFBundleVersion="30")
(contents / "Info.plist").write_bytes(plistlib.dumps(info))
manifest = json.loads((resources / "components.json").read_text())
manifest.update(version="0.8.0", build="30", publicFreeEnrollment=True, betaServiceUrl="https://api.voiceprompt.work", inputDiagnostics=True, liveTranscriptPreview=True, optionalLocalASR={"name": "Qwen3-ASR-1.7B-8bit", "revision": "a8379a2e2f9e313c9292cdf1af4055ab56d50d55", "engine": "mlx-audio 0.5.3", "bundled": False, "setup": "scripts/setup-local-asr.py"})
(resources / "components.json").write_text(json.dumps(manifest, indent=2) + "\n")
# Remove only Finder metadata that codesign rejects; preserve quarantine/security attributes.
for metadata in ("com.apple.FinderInfo", "com.apple.ResourceFork"):
    subprocess.run(["/usr/bin/xattr", "-dr", metadata, str(app)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run(["codesign", "--force", "--deep", "--sign", "-", str(app)], check=True)
subprocess.run(["codesign", "--verify", "--deep", "--strict", str(app)], check=True)
archive = root / "dist/voice-prompt-desktop-0.8.0-macos-arm64.zip"
archive.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(["/usr/bin/ditto", "-c", "-k", "--norsrc", "--keepParent", str(app), str(archive)], check=True)
print(archive)
