"""Preserve ImageGen provenance and verify selected files; never alters image pixels."""
from pathlib import Path
import json
import hashlib
import shutil
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root/'docs/course/statistical-analysis'
def read_lines(name):
    path = folder/name
    records = [json.loads(s) for s in path.read_text(encoding='utf-8-sig').splitlines() if s.strip()]
    for r in records:
        if ' as C:\\' in r['source']:
            r['source'] = r['source'][r['source'].rfind('C:\\'):]
        assert Path(r['source']).is_file(), r['source']
    path.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in records),encoding='utf-8')
    return records

original = read_lines('generated-assets.jsonl')
revisions = {r['id']: r for r in read_lines('asset-revisions.jsonl')}
prompts = {r['id']: r for r in json.loads((folder/'image-prompts.json').read_text(encoding='utf-8-sig'))}
assert len(original) == len(prompts) == 24
archive = folder/'image-iterations'
archive.mkdir(exist_ok=True)
manifest = []
for r in sorted(original,key=lambda r:r['id']):
    item_id=r['id']; chosen=revisions.get(item_id,r)
    selected=root/f'apps/teacher-web/public/course-assets/statistical-analysis/images/{item_id}.png'
    assert selected.read_bytes() == Path(chosen['source']).read_bytes(), item_id
    if item_id in revisions:
        shutil.copyfile(r['source'],archive/f'{item_id}-superseded.png')
    with Image.open(selected) as img:
        dims=list(img.size); alpha=img.getextrema()[-1] if img.mode=='RGBA' else None
    manifest.append(dict(id=item_id,lesson=prompts[item_id]['lesson'],tool='image_gen.imagegen',
        prompt=chosen.get('prompt',prompts[item_id]['prompt']),originalPrompt=prompts[item_id]['prompt'],
        selected=str(selected.relative_to(root)).replace('\\','/'),source=chosen['source'],
        dimensions=dims,alphaRange=alpha,sha256=hashlib.sha256(selected.read_bytes()).hexdigest(),
        revisionReason=chosen.get('reason'),transform='原始PNG字节保留；显示时通过原生CSS裁切、蒙版、透明度与阴影合成'))
(folder/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'24 selected ImageGen assets verified; {len(revisions)} superseded originals archived.')
