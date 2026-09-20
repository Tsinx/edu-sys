"""Third-phase provenance and review artifacts. Never infer visual review from file presence."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import argparse,json,hashlib,datetime,html
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/management-principles';QA=OUT/'qa-phase3';SRC=OUT/'source-phase3'
p=argparse.ArgumentParser();p.add_argument('action',choices=['source','sheets','demo-sheets','record','review']);p.add_argument('--confirm-reviewed',action='store_true');args=p.parse_args()
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def evidence(p):return {'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p)}
pages=read(ROOT/'packages/course-content/src/management-principles/pages.json');new=pages[663:];now=datetime.datetime.now(datetime.timezone.utc).isoformat()
if args.action=='source':
 assert args.confirm_reviewed,'Requires prior inspection of every source render and duplicate comparison.'
 corpus=read(SRC/'corpus.json');decisions=read(ROOT/'docs/management/source-dispositions-phase3.json');lookup={(d['documentId'],d['originalPage']):d for d in decisions}
 entries=[]
 for deck in corpus['decks']:
  for s in deck['slides']:
   n=s['page'];d=lookup[(deck['id'],n)]
   entries.append({'documentId':deck['id'],'originalPage':n,'status':'reviewed','render':evidence(SRC/f'renders/{deck["id"]}/{n:03}.png'),'disposition':d['disposition'],'reason':d['reason'],'targets':d['targets'],'sourceSha256':deck['sha256'],'method':'原稿渲染及提取文本逐页审阅；纯图片文字结构按对应作者记录还原；备注和动画关系保留私有。'})
 legacy=read(QA/'legacy-conversion-pixel-comparison.json')
 differences=[r for r in legacy if not r['pixelIdentical']];assert [(r['documentId'],r['page'])for r in differences]==[('l11',21),('l16',60)]
 write(ROOT/'docs/management/source-review-phase3.json',{'recordedAt':now,'reviewDates':['2026-09-19','2026-09-20'],'reviewer':'Codex','status':'reviewed','sourcePages':entries,'legacyComparison':{'count':len(legacy),'pixelIdentical':sum(r['pixelIdentical']for r in legacy),'individuallyReviewedDifferences':[dict(r,visualResult='原件与解析副本全文、位置和结构一致；差异为极少像素的抗锯齿值。')for r in differences]},'limitations':'原稿未提供的视频内容按页面记录重建可核验教学材料；未将缺失视频判为已观看。'})
 print(json.dumps({'reviewedSourcePages':len(entries),'legacy':len(legacy)}))
elif args.action=='sheets':
 dest=QA/'web-sheets';dest.mkdir(parents=True,exist_ok=True)
 for offset in range(0,len(new),4):
  sheet=Image.new('RGB',(2400,2880),'#dce1d7');draw=ImageDraw.Draw(sheet)
  for row,p in enumerate(new[offset:offset+4]):
   for col,width in enumerate([1600,390]):
    with Image.open(QA/f'web/{width}-{p["index"]:03}.png') as im:
     im=ImageOps.contain(im.convert('RGB'),(1850 if col==0 else 480,680));x=0 if col==0 else 1890;sheet.paste(im,(x+((1850 if col==0 else 480)-im.width)//2,row*720+28))
   draw.text((25,row*720+7),f'{p["index"]:04} / {p["slideKey"]}  DESKTOP + 390px',fill='#173a31')
  sheet.save(dest/f'{offset//4+1:03}.jpg',quality=95)
 print(json.dumps({'newPages':len(new),'sheets':(len(new)+3)//4}))
elif args.action=='demo-sheets':
 audit=read(QA/'demos/audit.json');groups={}
 for r in audit['results']:
  if r['width']==1600 and r['option']=='select-0' and (r['demo'] not in groups or r['step']>groups[r['demo']]['step']):groups[r['demo']]=r
 assert len(groups)==34
 rows=list(groups.values());dest=QA/'demo-sheets';dest.mkdir(exist_ok=True)
 for offset in range(0,len(rows),4):
  sheet=Image.new('RGB',(2400,2880),'#dce1d7');draw=ImageDraw.Draw(sheet)
  for row,r in enumerate(rows[offset:offset+4]):
   for col,width in enumerate([1600,390]):
    file=QA/f'demos/{width}-{r["demo"]}-select-0-{r["step"]}.png'
    with Image.open(file) as im:
     im=ImageOps.contain(im.convert('RGB'),(1850 if col==0 else 480,680));x=0 if col==0 else 1890;sheet.paste(im,(x+((1850 if col==0 else 480)-im.width)//2,row*720+28))
   draw.text((25,row*720+7),f'{r["demo"]} / final step {r["step"]} DESKTOP + 390px',fill='#173a31')
  sheet.save(dest/f'{offset//4+1:03}.jpg',quality=95)
 write(dest/'index.json',rows);print(json.dumps({'demos':len(rows),'sheets':9}))
elif args.action=='record':
 assert args.confirm_reviewed,'Inspect every web sheet and demo end-state sheet before recording review.'
 runtime=read(QA/'runtime/audit.json');demos=read(QA/'demos/audit.json');images=read(ROOT/'docs/management/image-manifest-phase3.json')
 assert len(runtime['canvases'])==len(pages)*4 and not runtime['errors']
 assert not demos['errors'] and not demos['failures'] and demos['checked']==1134
 assert len(images)==220 and all(i['review']['status']=='reviewed' for i in images)
 sheets=[evidence(p) for p in sorted((QA/'web-sheets').glob('*.jpg'))];assert len(sheets)==204
 demo_sheets=[evidence(p) for p in sorted((QA/'demo-sheets').glob('*.jpg'))];assert len(demo_sheets)==9
 reviewed=[]
 for offset,p in enumerate(new):
  states=[s for s in runtime['canvases'] if s['key']==p['slideKey']]
  assert len({(s['role'],s['viewport']) for s in states})==4
  assert all(s['visible'] and not s['leaks'] and not s['outside'] and not s['overlap'] and not s['broken'] for s in states)
  reviewed.append({'index':p['index'],'slideKey':p['slideKey'],'status':'passed','desktop':evidence(QA/f'web/1600-{p["index"]:03}.png'),'narrow':evidence(QA/f'web/390-{p["index"]:03}.png'),'contactSheet':sheets[offset//4]['path']})
 write(ROOT/'docs/management/visual-review-phase3.json',{'reviewedAt':now,'reviewer':'Codex','status':'passed','method':'逐页审阅全部814页桌面与390px成对截图；逐张审阅34处演示末步骤成对截图；1134个步骤及参数画面另经真实浏览器几何审计。保留两种验证的边界，不将自动检查称为人工逐状态审阅。','scope':{'sourcePages':728,'webPages':len(new),'images':len(images),'screenshots':len(new)*2,'runtimeCanvases':len(runtime['canvases']),'demoChecks':demos['checked'],'manuallyReviewedDemoFinalStates':34},'content':evidence(ROOT/'packages/course-content/src/management-principles/pages.json'),'runtime':evidence(QA/'runtime/audit.json'),'demos':evidence(QA/'demos/audit.json'),'sheets':sheets,'demoSheets':demo_sheets,'pages':reviewed,'sourceReview':evidence(ROOT/'docs/management/source-review-phase3.json'),'phaseTwoBaseline':evidence(OUT/'phase2-baseline/manifest.json'),'unresolvedFindings':[]})
 write(QA/'manual-web-progress.json',{'reviewedAt':now,'status':'passed','reviewedSheetRange':[1,204],'reviewedWebIndexRange':[664,1477],'widths':[1600,390],'method':'逐张查看桌面和390px成对截图；检查标题、正文、表格、图片比例和页脚；与浏览器几何审计分别记录。','unresolvedFindings':[]})
 print(json.dumps({'status':'passed','reviewedNewPages':len(new),'demoFinalStates':34}))
else:
 updates=read(ROOT/'docs/management/updates.json');lookup={p['slideKey']:p for p in pages};rows=[]
 for u in updates:
  doc,n=u['documentId'],u['page'];keys=u['slideKeys'];isnew=doc in ['intro','l9','l9b','l10','l10a','l10b','l11','l12','l13','l14','l15','l16'];isphase2=doc in ['l5','l6','l7','l8'];folder='source-phase3'if isnew else 'source-phase2'if isphase2 else 'source'
  status={'shared':'重复共用','omitted':'行政安排省略'}.get(u.get('disposition'),'独立转换')
  right=''.join(f'<figure><img loading="lazy" src="../qa-phase3/runtime/1600-{lookup[k]["index"]:03}.png"><figcaption>{html.escape(k)} · 网页第{lookup[k]["index"]}页</figcaption></figure>'for k in keys)or '<p>本页行政安排不进入公开课件。</p>'
  refs=''.join(f'<li><a href="{html.escape(s["url"],quote=True)}">{html.escape(s["title"])}</a> · {html.escape(s["period"])}</li>'for s in u['sources'])
  rows.append(f'<article id="{doc}-{n}"><h2>{html.escape(u["originalFile"])} · 原第{n}页 · {status}</h2><div class="compare"><figure><img loading="lazy" src="../{folder}/renders/{doc}/{n:03}.png"><figcaption>原稿渲染，保持原比例</figcaption></figure><div>{right}</div></div><details><summary>文字、修改和来源记录</summary><h3>原表述</h3><pre>{html.escape(u["oldText"])}</pre><h3>新表述</h3><pre>{html.escape(u["newText"])}</pre><p>{html.escape(u["reason"])}</p><ul>{refs}</ul><p>核验日期：{u.get("verifiedAt","见前期记录")}。表格、结构、备注、动画、校验值及外部媒体关系见私有来源索引。</p></details></article>')
 nav=''.join(f'<a href="#{u["documentId"]}-{u["page"]}">{u["documentId"]} · {u["page"]}</a>'for u in updates)
 report='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>管理学全课程原页对照</title><style>body{margin:0;background:#f7f4ed;color:#24372f;font:17px/1.6 system-ui}header{padding:32px 4vw}nav{display:flex;gap:8px;flex-wrap:wrap;max-height:160px;overflow:auto}a{color:#356656}nav a{padding:3px 9px;border:1px solid #ccd3c4}article{padding:28px 4vw;border-bottom:2px solid #acb9a7}h2{font-size:23px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:22px}figure{margin:0 0 18px}img{width:100%;height:auto;border:1px solid #d5d5c7}figcaption{font-size:14px}pre{white-space:pre-wrap;font:inherit}details{background:#eeeee4;padding:15px}summary{cursor:pointer}@media(max-width:800px){.compare{grid-template-columns:1fr}}</style>'''
 report+=f'<header><h1>《管理学》绪论＋第1—16讲原页对照</h1><p>管理学课程组 · 韦笑。{len(updates)}个原页归档，{len(pages)}个网页页面。本对照为教师私有材料。</p><nav>{nav}</nav></header>'+''.join(rows)+'</html>'
 dest=OUT/'review-phase3';dest.mkdir(exist_ok=True);(dest/'index.html').write_text(report,encoding='utf-8');print(json.dumps({'originalPages':len(rows),'webPages':len(pages)}))
