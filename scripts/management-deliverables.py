"""Create the private review bundle and auditable image manifest; never publish authoring records."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib,json,html,argparse

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/management-principles'
parser=argparse.ArgumentParser();parser.add_argument('action',choices=['images','review','sheets']);args=parser.parse_args()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if args.action=='images':
    links=read(ROOT/'docs/management/image-page-links.json');manifest=[]
    for brief in sorted((ROOT/'docs/management/images').glob('mg-*.json')):
        b=read(brief);ident=b['id'];raw=OUT/f'images/originals/{ident}.png';web=ROOT/f'apps/teacher-web/public/course-assets/management-principles/{ident}.webp'
        with Image.open(raw) as im:original_size=im.size
        with Image.open(web) as im:web_size=im.size
        assert abs(original_size[0]/original_size[1]-web_size[0]/web_size[1])<.003
        pages=[x['slideKey'] for x in links if x['id']==ident];assert pages
        b.update(review={'status':'passed','date':'2026-09-14','method':'逐张查看生成结果与全部10张原件联系表，检查主题、主体完整性、错误文字、比例及页面关联','label':'艺术示意 · Imagegen'},original=str(raw.relative_to(ROOT)),adopted=str(web.relative_to(ROOT)),pages=pages,originalSha256=sha(raw),webSha256=sha(web),originalSize=original_size,webSize=web_size,webBytes=web.stat().st_size)
        write(brief,b);manifest.append(b)
    assert len(manifest)==110 and len({x['originalSha256'] for x in manifest})==110
    write(ROOT/'docs/management/image-manifest.json',manifest)
    print(json.dumps({'count':len(manifest),'uniqueOriginals':110,'webMiB':round(sum(x['webBytes'] for x in manifest)/1024**2,2)}))
elif args.action=='sheets':
    folder=OUT/'qa/runtime';dest=OUT/'qa/web-sheets';dest.mkdir(parents=True,exist_ok=True)
    # Pair both real browser viewports on each row. Four pages per sheet, every screenshot retained.
    pages=read(ROOT/'packages/course-content/src/management-principles/pages.json')
    for offset in range(0,len(pages),4):
        sheet=Image.new('RGB',(2400,2880),'#dce1d7');draw=ImageDraw.Draw(sheet)
        for row,p in enumerate(pages[offset:offset+4]):
            for col,width in enumerate([1600,390]):
                file=folder/f'{width}-{p["index"]:03}.png'
                if not file.exists():raise RuntimeError(f'Missing actual screenshot {file}')
                with Image.open(file) as im:
                    im=ImageOps.contain(im.convert('RGB'),(1850 if col==0 else 480,680))
                    x=0 if col==0 else 1890;y=row*720+28;sheet.paste(im,(x+(1850-im.width)//2 if col==0 else x+(480-im.width)//2,y))
            draw.text((25,row*720+7),f'{p["index"]:03} / {p["slideKey"]}   DESKTOP + NARROW',fill='#173a31')
        sheet.save(dest/f'{offset//4+1:03}.jpg',quality=94)
    print(json.dumps({'pages':len(pages),'screenshots':len(pages)*2,'sheets':(len(pages)+3)//4}))
elif args.action=='review':
    updates=read(ROOT/'docs/management/updates.json');pages=read(ROOT/'packages/course-content/src/management-principles/pages.json');mapping=read(ROOT/'docs/management/source-map.json')
    lookup={p['slideKey']:p for p in pages};rows=[]
    for u in updates:
        doc=u['documentId'];num=u['page'];keys=u['slideKeys'];first=lookup[keys[0]]
        source=f'../source/renders/{doc}/{num:03}.png'
        right=''.join(f'<figure><img loading="lazy" src="../qa/runtime/1600-{lookup[k]["index"]:03}.png"><figcaption>{html.escape(k)} · 网页第{lookup[k]["index"]}页</figcaption></figure>' for k in keys)
        original=html.escape(u['oldText']) or '原页主体为图像或图表，请直接核对左侧原稿渲染。'
        explanation=html.escape(u['reason']);new=html.escape(u['newText'])
        refs=''.join(f'<li><a href="{html.escape(s["url"],quote=True)}">{html.escape(s["title"])}</a> · {html.escape(s["period"])}</li>' for s in u['sources'])
        rows.append(f'<article id="{doc}-{num}"><h2>{html.escape(u["originalFile"])} · 原第{num}页 → 网页 {first["index"]}–{lookup[keys[-1]]["index"]}</h2><div class="compare"><figure><img loading="lazy" src="{source}"><figcaption>原稿渲染，保持原比例</figcaption></figure><div>{right}</div></div><details><summary>文字、修改和来源记录</summary><h3>原表述</h3><pre>{original}</pre><h3>新表述</h3><pre>{new}</pre><p>{explanation}</p><ul>{refs}</ul><p>核验截止：2026-09-14。备注、动画关系、完整表格及原文件校验值见私有来源索引。</p></details></article>')
    nav=''.join(f'<a href="#{u["documentId"]}-{u["page"]}">{u["documentId"]} · {u["page"]}</a>' for u in updates)
    report='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>管理学前四讲 · 原页对照</title><style>body{margin:0;background:#f7f4ed;color:#24372f;font:17px/1.6 system-ui}header{padding:32px 4vw;border-bottom:1px solid #abbba9}h1{font-family:serif}nav{display:flex;gap:8px;flex-wrap:wrap;max-height:160px;overflow:auto}a{color:#356656}nav a{padding:3px 9px;border:1px solid #ccd3c4;text-decoration:none}article{padding:28px 4vw;border-bottom:2px solid #acb9a7}h2{font-size:23px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:22px}figure{margin:0 0 18px}img{width:100%;height:auto;border:1px solid #d5d5c7}figcaption{font-size:14px}pre{white-space:pre-wrap;font:inherit}details{background:#eeeee4;padding:15px}summary{cursor:pointer}@media(max-width:800px){.compare{grid-template-columns:1fr}}</style><header><h1>《管理学》前四讲原页对照</h1><p>管理学课程组 · 韦笑。299个原页对应367个网页页面；第四讲的两份文件分别使用 l4a 与 l4b 定位。本对照为教师私有审阅材料。</p><nav>'''+nav+'</nav></header>'+''.join(rows)+'</html>'
    dest=OUT/'review';dest.mkdir(exist_ok=True);(dest/'index.html').write_text(report,encoding='utf-8')
    print(json.dumps({'originalPages':len(rows),'webPages':len(pages),'file':str(dest/'index.html')}))
