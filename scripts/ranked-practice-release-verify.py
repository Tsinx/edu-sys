"""Create the public-only ZIP and independently verify its inventory and bytes."""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/international-mathematics/practice-v1'
PUBLIC = OUT / 'offline'
DATA = ROOT / 'apps/platform-api/.runtime/ranked-practice'


def digest(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


packs = json.loads((DATA / 'public-packs.json').read_text(encoding='utf8'))
assert len(packs) == 16 and sum(len(p['questions']) for p in packs) == 160
private_keys = ['correctOptionId', 'solution', 'optionExplanations', 'verification',
                'teachingCue', 'assistantCue', 'storyBeat', 'voyageStage', 'openQuestion']
for name in ['public-packs.json', 'public-course.json']:
    text = (PUBLIC / 'data' / name).read_text(encoding='utf8')
    assert all(f'"{key}":' not in text for key in private_keys), name
for file in (PUBLIC / 'assets').glob('*.js'):
    # Renderer property names may occur in code; serialized private payloads may not.
    text = file.read_text(encoding='utf8')
    assert all(f'"{key}":' not in text for key in private_keys), file
assert not list(PUBLIC.rglob('*teacher-answer*'))
assert not list(PUBLIC.rglob('*private-pack*'))
assert len(list((PUBLIC / 'documents').glob('*.pdf'))) == 17
assert len(list((PUBLIC / 'course-assets/international-mathematics/art').glob('*.png'))) == 36
assert len(list((PUBLIC / 'course-assets/international-mathematics/film').glob('*.mp4'))) == 16

files = sorted(f for f in PUBLIC.rglob('*') if f.is_file()
               and f.name not in ['.server-port', 'SHA256SUMS.txt'])
inventory = {f.relative_to(PUBLIC).as_posix(): digest(f) for f in files}
manifest = PUBLIC / 'SHA256SUMS.txt'
manifest.write_text(''.join(f'{h}  {name}\n' for name, h in inventory.items()), encoding='utf8')
archive = OUT / 'International-Mathematics-Ranked-Practice-offline-v1.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for f in files + [manifest]:
        z.write(f, f.relative_to(PUBLIC).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert set(z.namelist()) == set(inventory) | {'SHA256SUMS.txt'}
    for name, expected in inventory.items():
        assert hashlib.sha256(z.read(name)).hexdigest() == expected, name
    assert z.read('SHA256SUMS.txt') == manifest.read_bytes()
receipt = {'status': 'passed', 'publicFiles': len(inventory),
           'zipMembers': len(inventory) + 1, 'zipBytes': archive.stat().st_size,
           'zipSHA256': digest(archive), 'crc': 'passed',
           'allMemberHashes': 'passed', 'teacherMaterialsInPublicRoot': False}
(OUT / 'qa/zip-and-hashes.json').write_text(json.dumps(receipt, indent=2), encoding='utf8')
deliverables = [archive] + sorted((OUT / 'documents').glob('*.pdf'))
(OUT / 'SHA256SUMS.txt').write_text(''.join(
    f'{digest(f)}  {f.relative_to(OUT).as_posix()}\n' for f in deliverables), encoding='utf8')
print(json.dumps(receipt, indent=2))
