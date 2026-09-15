"""Lossless original-art edge bleed for independently warped source layers.

The partition masks need overlap before GPU resampling; two half-alpha edges
otherwise compose to 75% opacity and reveal a light line. No new artwork is
generated: bleed texels come from the original composite at the same coordinate.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageChops
import json

ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'artifacts/avatar/xiaomai/cubism-trial-v1/import'
out=ROOT/'apps/teacher-web/public/avatar/live2d/xiaomai/head-layers'
out.mkdir(exist_ok=True)
reference=Image.open(src/'import-composite.png').convert('RGBA')
manifest=[]
for layer in json.loads((src/'manifest.json').read_text()):
    if not layer['visible'] or layer['name'].startswith('Eye'):continue
    im=Image.open(src/layer['png']).convert('RGBA')
    if layer['name']!='occlusion_underpainting':
        mask=ImageChops.darker(im.getchannel('A').filter(ImageFilter.MaxFilter(5)),reference.getchannel('A'))
        im=reference.copy()
        im.putalpha(mask)
    box=im.getbbox()
    box=(max(0,box[0]-2),max(0,box[1]-2),min(1024,box[2]+2),min(760,box[3]+2))
    im.crop(box).save(out/layer['png'])
    manifest.append({'name':layer['name'],'box':box,'png':layer['png']})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(json.dumps({'layers':len(manifest),'source':'original import composite','edgeBleedPixels':2}))
