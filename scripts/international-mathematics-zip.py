from pathlib import Path
import hashlib
import os
import json
import zipfile

root = Path(os.environ.get('IM_OUTPUT_ROOT', Path(__file__).resolve().parents[1] / 'output' / 'international-mathematics' / 'v2'))
source = root / 'offline'
target = root / 'International-Mathematics-32h-offline-v2.zip'
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=3, allowZip64=True) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_file() and file.name != '.server-port':
            archive.write(file, 'International-Mathematics/' + file.relative_to(source).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert len([n for n in names if n.endswith('.pdf') and '/verification/' not in n]) == 21
    manifest = json.loads(archive.read('International-Mathematics/manifest-sha256.json'))
    for file in manifest['files']:
        data = archive.read('International-Mathematics/' + file['file'])
        assert len(data) == file['bytes']
        assert hashlib.sha256(data).hexdigest() == file['sha256']
checksum = hashlib.file_digest(target.open('rb'), 'sha256').hexdigest()
(root / (target.name + '.sha256')).write_text(f'{checksum}  {target.name}\n', encoding='ascii')
(root / 'qa' / 'zip-audit.json').write_text(json.dumps({'zip':str(target), 'bytes':target.stat().st_size, 'sha256':checksum, 'members':len(names), 'crc':'passed', 'allManifestFilesHashVerified':True, 'pdfCount':21}, indent=2), encoding='utf-8')
print(json.dumps({'zip':str(target),'MiB':round(target.stat().st_size/1048576,1),'members':len(names),'sha256':checksum}))
