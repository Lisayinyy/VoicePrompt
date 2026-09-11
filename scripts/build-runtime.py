#!/usr/bin/env python3
"""Build a self-contained Apple Silicon development bundle from verified inputs.
Build tools are publisher dependencies; the resulting app contains its runtime.
Usage: python3 scripts/build-runtime.py BUILD_DIR MODEL_FILE
"""
import hashlib, json, pathlib, shutil, subprocess, sys, plistlib
root = pathlib.Path(__file__).resolve().parents[1]
build = pathlib.Path(sys.argv[1]); model = pathlib.Path(sys.argv[2])
expected = '6c759ee4c9748c9b3f7a5a60ca74f0f7e685fb9d45d1378fce7cfd62f59adf29'
assert hashlib.file_digest(model.open('rb'), 'sha256').hexdigest() == expected, 'Model checksum mismatch'
provenance = json.loads((build / 'node-provenance.json').read_text())
archive = build / provenance['archive']
assert hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest() == provenance['sha256'], 'Node checksum mismatch'
node = build / provenance['archive'].removesuffix('.tar.gz')
app = build / 'Voice Prompt.app'
if app.exists(): shutil.rmtree(app)
contents = app / 'Contents'; resources = contents / 'Resources'
for d in [contents / 'MacOS', resources / 'bin', resources / 'models', resources / 'licenses']: d.mkdir(parents=True, exist_ok=True)
subprocess.run(['swiftc', '-swift-version', '5', '-parse-as-library', '-target', 'arm64-apple-macosx13.0', '-O', str(root/'native/VoicePrompt.swift'), str(root/'native/VoicePromptUI.swift'), str(root/'native/VoiceHotkey.swift'), str(root/'native/VoiceDirectEdit.swift'), str(root/'native/VoicePasteboard.swift'), str(root/'native/VoiceInputGuard.swift'), '-o', str(contents/'MacOS/VoicePrompt'), '-framework', 'AppKit', '-framework', 'AVFoundation', '-framework', 'Carbon'], check=True)
shutil.copy2(node/'bin/node', resources/'bin/node')
shutil.copy2(build/'compiled/bin/transcribe-cli', resources/'bin/voice-asr')
shutil.copy2(model, resources/'models/sensevoice-small.gguf')
shutil.copytree(root/'plugin', resources/'plugin')
shutil.copytree(root/'licenses', resources/'licenses', dirs_exist_ok=True)
shutil.copy2(node/'LICENSE', resources/'licenses/Node-LICENSE.txt')
src = build/'transcribe.cpp-e2f82cb6702315a1194f3bf1a6fee67cd2678447'
shutil.copy2(src/'LICENSE', resources/'licenses/transcribe.cpp-LICENSE.txt')
shutil.copy2(src/'ggml/LICENSE', resources/'licenses/ggml-LICENSE.txt')
with (contents/'Info.plist').open('wb') as f:
 plistlib.dump({'CFBundleExecutable':'VoicePrompt','CFBundleIdentifier':'ai.voiceprompt.desktop','CFBundleName':'Voice Prompt','CFBundleDisplayName':'Voice Prompt','CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.7.0','CFBundleVersion':'16','LSMinimumSystemVersion':'13.0','LSUIElement':True,'NSMicrophoneUsageDescription':'Voice Prompt records speech only when you start dictation, then transcribes it locally.','NSHighResolutionCapable':True}, f)
manifest = {'product':'Voice Prompt','version':'0.7.0','platform':'macOS 13+ Apple Silicon','node':provenance,'engineBackend':'CPU with Apple Accelerate; Metal disabled to avoid cold shader compilation','engineCommit':'e2f82cb6702315a1194f3bf1a6fee67cd2678447','model':{'name':'SenseVoiceSmall-Q8_0','revision':'4a08b8e900b38a977e32eb08d5d0697d6e72ba04','sha256':expected},'aiServiceBundled':False,'developerIdSigned':False,'notarized':False}
(resources/'components.json').write_text(json.dumps(manifest,indent=2)+'\n')
subprocess.run(['xattr','-cr',str(app)],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
destination = root/'dist/voice-prompt-desktop-0.7.0-macos-arm64.zip'
destination.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(['/usr/bin/ditto','-c','-k','--norsrc','--keepParent',str(app),str(destination)],check=True)
print(app)
print(destination)
