#!/usr/bin/env python3
"""Prepare the optional Qwen runtime for the local macOS beta; never changes defaults.
Publisher/developer prerequisite: uv on PATH. End users of a signed release should
receive a packaged bootstrapper; this script is not a marketplace auto-installer.
"""
import json
import hashlib
import os
import pathlib
import platform
import shutil
import subprocess
import sys

if platform.system() != "Darwin" or platform.machine() != "arm64":
    sys.exit("Qwen local beta requires an Apple Silicon Mac")
if int(platform.mac_ver()[0].split(".")[0]) < 15:
    sys.exit("Pinned MLX 0.32.2 requires macOS 15 or newer; use SenseVoice on older macOS")
if sys.version_info < (3, 11):
    sys.exit("Run this setup script with Python 3.11 or newer (for SHA-256 verification)")

root = pathlib.Path(__file__).resolve().parents[1]
base = pathlib.Path.home() / ".local/share/voice-prompt"
python = base / "asr-venv/bin/python"
model = base / "models/qwen3-asr-1.7b-8bit"
revision = "a8379a2e2f9e313c9292cdf1af4055ab56d50d55"
uv = shutil.which("uv")
if not uv:
    sys.exit("Install uv for this developer setup, or use the prepared desktop build")
if not python.exists():
    subprocess.run([uv, "venv", "--python", "3.12", str(base / "asr-venv")], check=True)
subprocess.run([uv, "pip", "sync", "--python", str(python), str(root / "plugin/asr/requirements.lock")], check=True)
code = "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/Qwen3-ASR-1.7B-8bit', revision=" + repr(revision) + ", local_dir=" + repr(str(model)) + ", allow_patterns=['*.json','*.txt','*.safetensors','README.md'])"
subprocess.run([str(python), "-c", code], check=True, env={**os.environ, "HF_HUB_DISABLE_XET": "1"})
with (model / 'model.safetensors').open('rb') as f:
    assert hashlib.file_digest(f, 'sha256').hexdigest() == 'bf304b009cc7eca79283056f787b44c952d24ac22cec787b39732bba3c23c13c', 'Model checksum mismatch'
subprocess.run([str(python), "-c", "from mlx_audio.stt import load; import mlx.core as mx; print('MLX runtime ready')"], check=True)
(base / "asr-install.json").write_text(json.dumps({"model": "mlx-community/Qwen3-ASR-1.7B-8bit", "revision": revision, "mlx_audio": "0.5.3", "python": str(python), "modelPath": str(model)}, indent=2) + "\n")
print("Local Qwen runtime ready; select Qwen in Voice Prompt model settings")
