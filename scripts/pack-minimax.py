#!/usr/bin/env python3
"""Build and validate the MiniMax V1 ZIP, independent of the OMP package.

The checks are a local preflight, not MiniMax's private marketplace validator.
No install hooks, desktop binaries, models or personal configurations are copied.
"""
import argparse
import hashlib
import json
import pathlib
import re
import shutil
import stat
import struct
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MiB = 1024 * 1024

def require(ok, message):
    if not ok:
        raise ValueError(message)

def unique_object(pairs):
    obj = {}
    for key, value in pairs:
        require(key not in obj, 'Duplicate JSON key: ' + key)
        obj[key] = value
    return obj

def json_object(data):
    require(not data.startswith(b'\xef\xbb\xbf'), 'JSON must not contain BOM')
    obj = json.loads(data.decode('utf-8'), object_pairs_hook=unique_object)
    require(isinstance(obj, dict), 'JSON root must be an object')
    return obj

def valid_path(name):
    require(isinstance(name, str) and bool(re.fullmatch(r'[A-Za-z0-9_.\-/]+', name)), 'Invalid path: ' + str(name))
    require(not name.startswith('/') and len(name.encode()) <= 512, 'Invalid absolute/long path')
    parts = name.rstrip('/').split('/')
    require(len(parts) <= 16, 'Path too deep')
    for part in parts:
        require(part not in ('', '.', '..') and len(part.encode()) <= 128, 'Invalid path segment')
        require(not part.endswith(('.', ' ')), 'Invalid trailing path character')
        require(not re.fullmatch(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])', part.split('.')[0], re.I), 'Reserved filename')
    return name

def validate_archive(archive):
    require(archive.stat().st_size <= 64 * MiB, 'ZIP exceeds 64 MiB')
    with zipfile.ZipFile(archive) as z:
        infos = z.infolist()
        require(len(infos) <= 2048, 'Too many ZIP entries')
        names = set()
        files = {}
        total = 0
        for info in infos:
            valid_path(info.filename)
            normalized = info.filename.rstrip('/').lower()
            require(normalized not in names, 'Duplicate/case-colliding ZIP path')
            names.add(normalized)
            require(not info.flag_bits & 1, 'Encrypted ZIP entry')
            require(info.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), 'Unsupported compression')
            mode = info.external_attr >> 16
            kind = stat.S_IFMT(mode)
            require(kind in (0, stat.S_IFREG, stat.S_IFDIR), 'Link or special entry')
            if info.is_dir():
                continue
            require(not mode & 0o111, 'Package may not require executable bits')
            require(info.file_size <= 16 * MiB, 'File exceeds 16 MiB')
            total += info.file_size
            require(total <= 64 * MiB, 'Unpacked files exceed 64 MiB')
            data = z.read(info)
            require(not data.startswith(b'version https://git-lfs.github.com/spec/v1'), 'LFS pointer')
            if not info.filename.endswith('.png'):
                data.decode('utf-8')
                require(not data.startswith(b'\xef\xbb\xbf'), 'UTF-8 BOM')
            if info.filename.endswith('.json'):
                json_object(data)
            files[info.filename] = data
        require(len(files) <= 1024, 'Too many ordinary files')
    def resolve(name):
        valid_path(name)
        require(name in files, 'Missing referenced file: ' + name)
        return files[name]
    m = json_object(resolve('.minimax-plugin/plugin.json'))
    allowed = {'schemaVersion', 'name', 'displayName', 'version', 'description', 'author', 'icon', 'category', 'exampleQueries', 'apps', 'mcpServers', 'skills'}
    require(not set(m) - allowed, 'Unsupported MiniMax manifest field')
    require(m.get('schemaVersion') == 1, 'Expected schemaVersion 1')
    require(bool(re.fullmatch(r'[a-z][a-z0-9._-]{0,79}', m.get('name', ''))), 'Invalid plugin name')
    require(bool(re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?', m.get('version', ''))), 'Invalid version')
    for key in ('author', 'description', 'displayName'):
        value = m.get(key)
        require(isinstance(value, str) and value == value.strip() and value, 'Missing/invalid ' + key)
        require(len(value.encode()) <= 1024, 'Oversized ' + key)
    require(m.get('category') in {'Office', 'Studio', 'Design & Sites', 'Code', 'Business', 'Sales', 'Productivity', 'Science & Healthcare', 'Education', 'Other'}, 'Invalid category')
    examples = m.get('exampleQueries', [])
    require(isinstance(examples, list) and len(examples) <= 3 and all(isinstance(x, str) and x.strip() and len(x) <= 4096 for x in examples), 'Invalid examples')
    for key in ('apps', 'mcpServers', 'skills'):
        require(isinstance(m.get(key), list), 'Missing capability array ' + key)
        require(len(m[key]) == len(set(m[key])), 'Duplicate capability reference')
        for ref in m[key]:
            resolve(ref)
    require(any(m[k] for k in ('apps', 'mcpServers', 'skills')), 'No capabilities')
    require(not m['apps'], 'This local-MCP build must not invent a Connector provider')
    icon = resolve(m['icon'])
    require(m['icon'].endswith('.png') and icon.startswith(b'\x89PNG\r\n\x1a\n'), 'Expected PNG icon')
    width, height = struct.unpack('>II', icon[16:24])
    require(width == height and width > 0, 'Icon must be square')
    for ref in m['mcpServers']:
        config = json_object(resolve(ref))
        require(set(config) == {'schemaVersion', 'mcpServers'} and config['schemaVersion'] == 1, 'Invalid MCP envelope')
        for server in config['mcpServers'].values():
            require(set(server) <= {'type', 'command', 'args', 'description', 'timeout'}, 'Unexpected credential or MCP field')
            require(server.get('type') == 'stdio', 'This build is local stdio only')
            require(server.get('command') == 'sh', 'Expected portable shell interpreter')
            require(server.get('args') == ['./mcp-launch.sh'], 'Invalid launcher arguments')
            resolve('mcp-launch.sh')
    for ref in m['skills']:
        text = resolve(ref).decode()
        front = re.match(r'^---\n(.*?)\n---\n', text, re.S)
        require(front is not None, 'Missing Skill frontmatter')
        fields = dict(re.findall(r'^(name|description):\s*(.+)$', front[1], re.M))
        require(fields.get('name') == pathlib.PurePosixPath(ref).parent.name and fields.get('description'), 'Invalid Skill metadata')
    package = json_object(resolve('package.json'))
    require(package['version'] == m['version'], 'Runtime package version mismatch')
    require(not set(package.get('scripts', {})) & {'preinstall', 'install', 'postinstall'}, 'Install lifecycle hook')
    # Check every literal local ESM import in the shipped runtime closure.
    for name, data in files.items():
        if name.endswith('.mjs'):
            for imp in re.findall(r'(?:from\s+|import\s*)[\'\"](\.[^\'\"]+)[\'\"]', data.decode()):
                path = pathlib.PurePosixPath(name).parent / imp
                require(str(path) in files, 'Missing runtime import: ' + str(path))
    return {'format': 'MiniMax V1 local MCP + Skill', 'name': m['name'], 'version': m['version'], 'files': len(files), 'entries': len(infos), 'unpackedBytes': total, 'zipBytes': archive.stat().st_size, 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'localPreflight': 'passed', 'marketplaceReview': 'not submitted'}

def build(output):
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='voice-prompt-minimax-') as tmp:
        stage = pathlib.Path(tmp)
        def copy(source, target):
            require(source.is_file() and not source.is_symlink() and source.stat().st_nlink == 1, 'Source must be an ordinary unlinked file')
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        for entry in ('lib', 'web', 'asr', 'skills', 'server.mjs', 'mcp-launch.sh', 'LICENSE', 'package.json'):
            source = ROOT / 'plugin' / entry
            candidates = sorted(source.rglob('*')) if source.is_dir() else [source]
            for f in candidates:
                require(not f.is_symlink(), 'Symlinks are not supported')
                if f.is_file():
                    require(f.suffix not in ('.pyc', '.log') and '__pycache__' not in f.parts, 'Unclean source tree')
                    copy(f, stage / f.relative_to(ROOT / 'plugin'))
        for entry in ('.minimax-plugin/plugin.json', 'voice-prompt.mcp.json', 'README.md', 'icon.png', 'ASSET-RIGHTS.md'):
            copy(ROOT / 'minimax' / entry, stage / entry)
        for entry in ('agent-setup.md',):
            copy(ROOT / 'docs' / entry, stage / 'docs' / entry)
        copy(ROOT / 'minimax/data-and-permissions.md', stage / 'docs/data-and-permissions.md')
        copy(ROOT / 'minimax/installation.md', stage / 'docs/installation.md')
        # Freeze the first-use procedure into the package, rather than fetch mutable instructions.
        guide = stage / 'skills/voice-prompt/references/setup.md'
        guide.write_text(guide.read_text().replace('https://github.com/Lisayinyy/VoicePrompt/blob/main/docs/agent-setup.md', '[bundled installation procedure](../../../docs/agent-setup.md)'))
        version = json_object((stage / '.minimax-plugin/plugin.json').read_bytes())['version']
        package = json_object((stage / 'package.json').read_bytes())
        package['version'] = version
        package.pop('omp', None)
        (stage / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
        archive = output / ('voice-prompt-minimax-' + version + '.zip')
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED) as z:
            for f in sorted(stage.rglob('*')):
                if not f.is_file():
                    continue
                name = f.relative_to(stage).as_posix()
                valid_path(name)
                info = zipfile.ZipInfo(name, date_time=(2026, 9, 11, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                z.writestr(info, f.read_bytes())
        report = validate_archive(archive)
        (output / (archive.stem + '.validation.json')).write_text(json.dumps(report, indent=2) + '\n')
        (output / (archive.name + '.sha256')).write_text(report['sha256'] + '  ' + archive.name + '\n')
        return archive, report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'dist/minimax')
    parser.add_argument('--validate', type=pathlib.Path)
    args = parser.parse_args()
    if args.validate:
        print(json.dumps(validate_archive(args.validate), indent=2))
    else:
        archive, report = build(args.output)
        print(json.dumps({'archive': str(archive), **report}, indent=2))
