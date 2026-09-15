"""Lossless archival copies, proportional web encoding, and QA contact sheets."""
from pathlib import Path
import argparse, hashlib, json, shutil
from PIL import Image, ImageOps, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['adopt','source-sheets','art-sheets'])
parser.add_argument('--id')
parser.add_argument('--source')
args=parser.parse_args()
if args.action=='adopt':
    raw=ROOT/'output/management-principles/images/originals'/f'{args.id}.png'
    web=ROOT/'apps/teacher-web/public/course-assets/management-principles'/f'{args.id}.webp'
    raw.parent.mkdir(parents=True,exist_ok=True); web.parent.mkdir(parents=True,exist_ok=True)
    src=Path(args.source)
    if raw.exists() and hashlib.sha256(raw.read_bytes()).digest()!=hashlib.sha256(src.read_bytes()).digest():
        raise RuntimeError('Refusing to overwrite adopted original')
    shutil.copy2(src,raw)
    with Image.open(raw) as im:
        im=ImageOps.exif_transpose(im).convert('RGB'); im.thumbnail((1800,1200))
        im.save(web,'WEBP',quality=88,method=6)
    print(json.dumps({'id':args.id,'original':str(raw),'web':str(web),'bytes':web.stat().st_size,'sha256':hashlib.sha256(raw.read_bytes()).hexdigest()}))
else:
    if args.action=='source-sheets':
        files=sorted((ROOT/'output/management-principles/source/renders').glob('*/*.png'))
        out=ROOT/'output/management-principles/qa/source-sheets'
    else:
        files=sorted((ROOT/'output/management-principles/images/originals').glob('*.png'))
        out=ROOT/'output/management-principles/qa/art-sheets'
    out.mkdir(parents=True,exist_ok=True)
    for offset in range(0,len(files),12):
        sheet=Image.new('RGB',(2000,1920),'#f5f3ed'); draw=ImageDraw.Draw(sheet)
        for i,file in enumerate(files[offset:offset+12]):
            with Image.open(file) as im:
                im=ImageOps.contain(im.convert('RGB'),(490,590))
                x=(i%4)*500; y=(i//4)*640
                sheet.paste(im,(x+(490-im.width)//2,y+30))
                draw.text((x+10,y+6),f'{file.parent.name} / {file.stem}',fill='#132925')
        sheet.save(out/f'{offset//12+1:03}.jpg',quality=93)
    print(json.dumps({'files':len(files),'sheets':(len(files)+11)//12,'directory':str(out)}))
