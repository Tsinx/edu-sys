"""Phase-two evidence only; phase-one artifacts remain untouched."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import argparse,json,hashlib,html,datetime
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/management-principles';QA=OUT/'qa-phase2'
parser=argparse.ArgumentParser();parser.add_argument('action',choices=['images','sheets','review','record']);parser.add_argument('--confirm-reviewed',action='store_true');args=parser.parse_args()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def evidence(p):return {'path':str(p.relative_to(ROOT)),'sha256':sha(p)}
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
pages=read(ROOT/'packages/course-content/src/management-principles/pages.json');new=[p for p in pages if p['lessonNumber']>=5]
build=read(ROOT/'packages/course-content/src/management-principles/manifest.json')
if args.action=='images':
    assert args.confirm_reviewed,'Inspect every adopted image before recording review'
    links=read(ROOT/'docs/management/image-page-links-phase2.json');new_images=[]
    for p in sorted((ROOT/'docs/management/images-phase2').glob('mg-*.json')):
        b=read(p);raw=ROOT/b['original'];web=ROOT/b['adopted']
        assert sha(raw)==b['originalSha256'] and sha(web)==b['webSha256']
        with Image.open(raw) as a,Image.open(web) as w:assert abs(a.width/a.height-w.width/w.height)<.003
        b['pages']=[x['slideKey'] for x in links if x['id']==b['id']];assert b['pages']
        b['generationPrompt']=(ROOT/'docs/management/images-phase2/mg-111-generation-prompt.txt').read_text(encoding='utf-8') if b['id']=='mg-111' else b['prompt']
        b['review']={'status':'passed','reviewedAt':now,'method':'逐张检查工具返回原件及原件联系表，核对构图、主题、人体、错误文字、比例与页面关联；采用WebP同时进行解码与校验值检查','label':'艺术示意 · Imagegen'}
        write(p,b);new_images.append(b)
    assert 75<=len(new_images)<=90 and len({x['originalSha256'] for x in new_images})==len(new_images)
    old=read(OUT/'phase1-baseline/docs/management/image-manifest.json')
    write(ROOT/'docs/management/image-manifest-phase2.json',new_images);write(ROOT/'docs/management/image-manifest.json',old+new_images)
    print(json.dumps({'new':len(new_images),'total':len(old+new_images)}))
elif args.action=='sheets':
    dest=QA/'web-sheets';dest.mkdir(parents=True,exist_ok=True)
    for offset in range(0,len(new),4):
        sheet=Image.new('RGB',(2400,2880),'#dce1d7');draw=ImageDraw.Draw(sheet)
        for row,p in enumerate(new[offset:offset+4]):
            for col,width in enumerate([1600,390]):
                with Image.open(QA/f'runtime/{width}-{p["index"]:03}.png') as im:
                    im=ImageOps.contain(im.convert('RGB'),(1850 if col==0 else 480,680));x=0 if col==0 else 1890
                    sheet.paste(im,(x+((1850 if col==0 else 480)-im.width)//2,row*720+28))
            draw.text((25,row*720+7),f'{p["index"]:03} / {p["slideKey"]}   DESKTOP + NARROW',fill='#173a31')
        sheet.save(dest/f'{offset//4+1:03}.jpg',quality=95)
    print(json.dumps({'newPages':len(new),'sheets':(len(new)+3)//4}))
elif args.action=='review':
    updates=read(ROOT/'docs/management/updates.json');lookup={p['slideKey']:p for p in pages};rows=[]
    for u in updates:
        doc,num=u['documentId'],u['page'];keys=u['slideKeys'];first=lookup[keys[0]];source_folder='source-phase2' if first['lessonNumber']>=5 else 'source'
        source=f'../{source_folder}/renders/{doc}/{num:03}.png'
        right=''.join(f'<figure><img loading="lazy" src="../qa-phase2/runtime/1600-{lookup[k]["index"]:03}.png"><figcaption>{html.escape(k)} · 网页第{lookup[k]["index"]}页</figcaption></figure>' for k in keys)
        refs=''.join(f'<li><a href="{html.escape(s["url"],quote=True)}">{html.escape(s["title"])}</a> · {html.escape(s["period"])}</li>' for s in u['sources'])
        old=html.escape(u['oldText']) or '原页主体为图像，请对照左侧原稿渲染。'
        date='2026-09-15' if first['lessonNumber']>=5 else '2026-09-14'
        rows.append(f'<article id="{doc}-{num}"><h2>{html.escape(u["originalFile"])} · 原第{num}页 → 网页 {first["index"]}–{lookup[keys[-1]]["index"]}</h2><div class="compare"><figure><img loading="lazy" src="{source}"><figcaption>原稿渲染，保持原比例</figcaption></figure><div>{right}</div></div><details><summary>文字、修改和来源记录</summary><h3>原表述</h3><pre>{old}</pre><h3>新表述</h3><pre>{html.escape(u["newText"])}</pre><p>{html.escape(u["reason"])}</p><ul>{refs}</ul><p>核验截止：{date}。备注、动画关系、完整表格及校验值见私有来源索引。</p></details></article>')
    nav=''.join(f'<a href="#{u["documentId"]}-{u["page"]}">{u["documentId"]} · {u["page"]}</a>' for u in updates)
    title=f'《管理学》前{len(build["lessons"])}讲原页对照'
    report='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>管理学原页对照</title><style>body{margin:0;background:#f7f4ed;color:#24372f;font:17px/1.6 system-ui}header{padding:32px 4vw;border-bottom:1px solid #abbba9}h1{font-family:serif}nav{display:flex;gap:8px;flex-wrap:wrap;max-height:160px;overflow:auto}a{color:#356656}nav a{padding:3px 9px;border:1px solid #ccd3c4;text-decoration:none}article{padding:28px 4vw;border-bottom:2px solid #acb9a7}h2{font-size:23px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:22px}figure{margin:0 0 18px}img{width:100%;height:auto;border:1px solid #d5d5c7}figcaption{font-size:14px}pre{white-space:pre-wrap;font:inherit}details{background:#eeeee4;padding:15px}summary{cursor:pointer}@media(max-width:800px){.compare{grid-template-columns:1fr}}</style>'''
    report+=f'<header><h1>{title}</h1><p>管理学课程组 · 韦笑。{len(updates)}个原页对应{len(pages)}个网页页面；第四讲两份文件使用l4a与l4b定位，第5—8讲使用独立来源标识。本对照为教师私有材料。</p><nav>{nav}</nav></header>'+''.join(rows)+'</html>'
    dest=OUT/'review-phase2';dest.mkdir(exist_ok=True);(dest/'index.html').write_text(report,encoding='utf-8')
    print(json.dumps({'originalPages':len(rows),'webPages':len(pages)}))
else:
    assert args.confirm_reviewed,'Review all source, adopted images and final desktop/narrow screenshots first'
    runtime=read(QA/'runtime/audit.json');demos=read(QA/'demos/audit.json');images=read(ROOT/'docs/management/image-manifest-phase2.json');updates=read(ROOT/'docs/management/updates-phase2.json')
    assert len(runtime['canvases'])==len(pages)*4 and not runtime['errors']
    assert not demos['errors'] and not demos['failures']
    assert all(i['review']['status']=='passed' for i in images)
    sheets=[evidence(p) for p in sorted((QA/'web-sheets').glob('*.jpg'))];assert len(sheets)==(len(new)+3)//4
    reviewed=[]
    for offset,p in enumerate(new):
        states=[s for s in runtime['canvases'] if s['key']==p['slideKey']]
        assert len({(s['role'],s['viewport']) for s in states})==4
        assert all(s['visible'] and not s['leaks'] and not s['outside'] and not s['overlap'] and not s['broken'] for s in states)
        reviewed.append({'index':p['index'],'slideKey':p['slideKey'],'status':'passed','desktop':evidence(QA/f'runtime/1600-{p["index"]:03}.png'),'narrow':evidence(QA/f'runtime/390-{p["index"]:03}.png'),'contactSheet':sheets[offset//4]['path']})
    sources=[{'documentId':u['documentId'],'page':u['page'],'slideKeys':u['slideKeys'],'status':'passed','render':evidence(OUT/f'source-phase2/renders/{u["documentId"]}/{u["page"]:03}.png')} for u in updates]
    write(ROOT/'docs/management/visual-review-phase2.json',{'reviewedAt':now,'reviewer':'Codex','status':'passed','method':'逐页查看218张原稿渲染；逐张检查新增图片；以桌面与窄屏成对联系表逐页审阅全部新增页面，结合全八讲教师和学生两种视口真实浏览及演示全步骤检查。','scope':{'sourcePages':len(sources),'webPages':len(new),'images':len(images),'screenshots':len(new)*2,'runtimeCanvases':len(runtime['canvases']),'demoChecks':demos['checked']},'content':evidence(ROOT/'packages/course-content/src/management-principles/pages.json'),'runtime':evidence(QA/'runtime/audit.json'),'demos':evidence(QA/'demos/audit.json'),'sheets':sheets,'pages':reviewed,'sourcePages':sources,'phaseOneBaseline':evidence(OUT/'phase1-baseline/manifest.json')})
    print(json.dumps({'status':'passed','reviewedNewPages':len(new),'sourcePages':len(sources)}))
