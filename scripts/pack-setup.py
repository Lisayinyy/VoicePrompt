#!/usr/bin/env python3
"""Package the reviewed installer and connectors; never package user state or models."""
import hashlib
import pathlib
import stat
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
ENTRIES = [
    "LICENSE", "README.md", "package.json", "plugin.json", "mcp.json", "plugin", "skills", "minimax",
    "docs/agent-setup.md", "docs/installation.md",
    "scripts/install.mjs", "scripts/install-mcode.mjs", "scripts/pack-minimax.py",
    "scripts/setup-colleague.sh", "scripts/setup-local-asr.py", "scripts/select-local-asr.mjs",
]

def build(output):
    files = []
    for name in ENTRIES:
        source = ROOT / name
        for file in sorted(source.rglob("*")) if source.is_dir() else [source]:
            if file.is_symlink():
                raise ValueError("Refusing symlink: " + str(file))
            if file.is_file():
                if file.suffix in (".pyc", ".log") or "__pycache__" in file.parts:
                    raise ValueError("Unclean source: " + str(file))
                files.append(file)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(files):
            name = "VoicePrompt/" + file.relative_to(ROOT).as_posix()
            entry = zipfile.ZipInfo(name, date_time=(2026, 9, 14, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = (stat.S_IFREG | 0o644) << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(entry, file.read_bytes())
    print(hashlib.sha256(output.read_bytes()).hexdigest() + "  " + output.name)

if __name__ == "__main__":
    build(ROOT / "dist/voice-prompt-setup-0.8.0.zip")
