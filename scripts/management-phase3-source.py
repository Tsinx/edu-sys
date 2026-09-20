"""Private phase-three source preparation; never manufactures authored slides."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/management-principles/source-phase3'
BASE = ROOT / 'output/management-principles/phase2-baseline'
spec = importlib.util.spec_from_file_location('source_audit', ROOT/'scripts/management-source-audit.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = OUT
DECKS = [
 (0,'intro','0绪论 .pptx',55,'primary'),
 (9,'l9','9 领导的一般理论 .pptx',60,'primary'),
 (9,'l9b','9 领导的一般理论-2 .pptx',73,'supplement'),
 (10,'l10','10 激励-新.pptx',90,'primary'),
 (10,'l10a','10 激励-1 .pptx',79,'supplement'),
 (10,'l10b','10 激励-2 .pptx',53,'supplement'),
 (11,'l11','11 沟通.ppt',54,'primary'),
 (12,'l12','12 控制的类型与过程.ppt',45,'primary'),
 (13,'l13','13 控制的方法和技术.ppt',71,'primary'),
 (14,'l14','14 风险控制与危机管理.ppt',52,'primary'),
 (15,'l15','15 创新原理.ppt',33,'primary'),
 (16,'l16','16 组织创新.ppt',63,'primary'),
]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def preserve(src,dst):
 if dst.exists():
  assert sha(src)==sha(dst),f'Baseline differs: {src}'
 else:
  dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
def main():
 parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','extract']);args=parser.parse_args()
 if args.action=='prepare':
  tracked=[*ROOT.glob('packages/course-content/src/management-principles/*.json'),*ROOT.glob('docs/management/*.json'),*ROOT.glob('docs/management/authored/*.mjs'),*ROOT.glob('apps/teacher-web/public/course-assets/management-principles/**/*.webp')]
  # Keep every public source-reference image as well as generated artwork.
  tracked += [p for p in (ROOT/'apps/teacher-web/public/course-assets/management-principles').rglob('*') if p.is_file() and p.suffix!='.webp']
  records=[]
  for p in sorted(set(tracked)):
   relative=p.relative_to(ROOT);preserve(p,BASE/relative);records.append({'path':relative.as_posix(),'sha256':sha(p)})
  manifest= json.loads((ROOT/'packages/course-content/src/management-principles/manifest.json').read_text(encoding='utf-8'))
  assert (manifest['webPageCount'],manifest['imageCount'])==(663,190)
  write(BASE/'manifest.json',{'version':manifest['version'],'webPages':663,'images':190,'files':records})
  decks=[]
  for lesson,key,name,count,role in DECKS:
   data=subprocess.run([str(audit.SEVEN),'x','-so',str(audit.ARCHIVE),'韦笑-管理学2025\\'+name],capture_output=True,check=True).stdout
   assert data,name
   dst=OUT/'originals'/name;dst.parent.mkdir(parents=True,exist_ok=True)
   if dst.exists():assert dst.read_bytes()==data
   else:dst.write_bytes(data)
   decks.append({'id':key,'lesson':lesson,'file':name,'pages':count,'role':role,'sha256':sha(dst)})
  write(OUT/'manifest.json',{'archive':str(audit.ARCHIVE),'archiveSha256':sha(audit.ARCHIVE),'pageTotal':728,'decks':decks})
  print(json.dumps({'baselineFiles':len(records),'sourceFiles':len(decks),'sourcePages':728}))
 else:
  decks=[]
  for lesson,key,name,count,role in DECKS:
   parsed=OUT/'parsed'/f'{key}.pptx' if name.endswith('.ppt') else None
   deck=audit.extract_deck(lesson,key,name,count,parsed)
   deck['role']=role
   if parsed:deck.update(parsedFile=str(parsed.relative_to(OUT)),parsedSha256=sha(parsed))
   decks.append(deck)
   lines=[f'# {name}']
   for s in deck['slides']:lines.extend([f'\n## {s["sourceId"]} · 原第 {s["page"]} 页','\n'.join(s['paragraphs'])])
   (OUT/f'{key}-text.md').write_text('\n'.join(lines),encoding='utf-8')
  corpus={'archive':str(audit.ARCHIVE),'archiveSha256':sha(audit.ARCHIVE),'pageTotal':sum(d['pages'] for d in decks),'decks':decks}
  assert corpus['pageTotal']==728
  write(OUT/'corpus.json',corpus)
  write(OUT/'manifest.json',{**corpus,'decks':[{k:v for k,v in d.items() if k!='slides'} for d in decks]})
  print(json.dumps({'sourceFiles':len(decks),'sourcePages':corpus['pageTotal']}))
if __name__=='__main__':main()
