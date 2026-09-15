"""Preserve generated originals, create web derivatives and inspectable contact sheets."""
from pathlib import Path
import argparse, json, hashlib, shutil
from PIL import Image, ImageOps, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/management-principles'
p=argparse.ArgumentParser();p.add_argument('action',choices=['adopt','source-sheets','art-sheets']);p.add_argument('--id');p.add_argument('--source');args=p.parse_args()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if args.action=='adopt':
    record=ROOT/f'docs/management/images-phase2/{args.id}.json';r=json.loads(record.read_text(encoding='utf-8'))
    source=Path(args.source);raw=OUT/f'images-phase2/originals/{args.id}.png';web=ROOT/f'apps/teacher-web/public/course-assets/management-principles/{args.id}.webp'
    raw.parent.mkdir(parents=True,exist_ok=True)
    if raw.exists():assert sha(raw)==sha(source),'Refusing to replace a different adopted original'
    else:shutil.copy2(source,raw)
    with Image.open(raw) as im:
        original_size=list(im.size);im=im.convert('RGB');im.thumbnail((1600,1600),Image.Resampling.LANCZOS);im.save(web,'WEBP',quality=88,method=6);web_size=list(im.size)
    r.update(tool='built-in Imagegen',generatedSource=str(source),original=str(raw.relative_to(ROOT)),adopted=str(web.relative_to(ROOT)),originalSha256=sha(raw),webSha256=sha(web),originalSize=original_size,webSize=web_size,webBytes=web.stat().st_size,review={'status':'pending'})
    record.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'id':args.id,'adopted':str(web),'bytes':web.stat().st_size}))
else:
    source_mode=args.action=='source-sheets'
    files=sorted((OUT/'source-phase2/renders').glob('*/*.png')) if source_mode else sorted((OUT/'images-phase2/originals').glob('*.png'))
    dest=OUT/('qa-phase2/source-sheets' if source_mode else 'qa-phase2/art-sheets');dest.mkdir(parents=True,exist_ok=True)
    for start in range(0,len(files),6):
        sheet=Image.new('RGB',(1800,2160),'#dce1d7');draw=ImageDraw.Draw(sheet)
        for i,f in enumerate(files[start:start+6]):
            with Image.open(f) as im:
                thumb=ImageOps.contain(im.convert('RGB'),(870,670));x=(i%2)*900+(900-thumb.width)//2;y=(i//2)*720+32
                sheet.paste(thumb,(x,y));draw.text(((i%2)*900+20,(i//2)*720+10),f'{start+i+1:03} / {f.parent.name}/{f.name}',fill='#173a31')
        sheet.save(dest/f'{start//6+1:03}.jpg',quality=94)
    print(json.dumps({'files':len(files),'sheets':(len(files)+5)//6,'directory':str(dest)}))
