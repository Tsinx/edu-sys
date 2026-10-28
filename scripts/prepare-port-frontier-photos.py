from pathlib import Path
from urllib.request import Request,urlopen
import json,hashlib,subprocess
from PIL import Image,ImageDraw
import fitz
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'output/port-frontier-20261028/sources';DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/frontier-media';DEST.mkdir(parents=True,exist_ok=True)
sources=json.loads((WORK/'image-candidates.json').read_text(encoding='utf-8'));records=[]
def get(url):return urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
for key,name,index in [('chongqing','chongqing-truck.jpg',6),('rotterdam','rotterdam-ai.jpg',0),('tradelens','tradelens-harbour.jpg',0)]:
 row=sources[key]['images'][index];data=get(row['url']);p=DEST/name;p.write_bytes(data);im=Image.open(p);im.verify();records.append({'file':name,'page':sources[key]['page'],'image':row['url'],'sha256':hashlib.sha256(data).hexdigest(),'label':'原页面配图，保持原始文件；文章日期不推定为拍摄日'});print(name)
for key,url in [('apica','https://sustainableworldports.org/wp-content/uploads/IAPH-WPSP-POAB-APICA-Digital-Twin_Final.pdf'),('yard','https://hhla.de/fileadmin/module/its/ITS_Tech_Paper-HPC_machine_learning.pdf')]:
 data=get(url);p=WORK/(key+'.pdf');p.write_bytes(data);doc=fitz.open(p);candidates=[]
 for page in doc:
  for entry in page.get_images(full=True):
   xref,width,height=entry[0],entry[2],entry[3]
   if width>=600 and height>=200:
    img=doc.extract_image(xref);path=WORK/f'{key}-image-{xref}.{img["ext"]}';path.write_bytes(img['image']);candidates.append({'page':page.number,'xref':xref,'width':width,'height':height,'path':str(path)})
 for i,page in enumerate(doc):
  page.get_pixmap(matrix=fitz.Matrix(.7,.7),alpha=False).save(WORK/f'{key}-page-{i}.png')
 (WORK/(key+'-images.json')).write_text(json.dumps(candidates,ensure_ascii=False,indent=2),encoding='utf-8');print(key+': '+json.dumps(candidates,ensure_ascii=False))
 if key=='yard':
  out=DEST/'yard-research.png';doc[0].get_pixmap(matrix=fitz.Matrix(1.3,1.3),alpha=False).save(out);records.append({'file':out.name,'page':url,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'label':'HHLA/HPC技术论文首页，完整页面渲染'})
 doc.close()
for source,start,name in [('output/port-transition-media/smart.mp4',47,'qingdao-agv.jpg')]:
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(ROOT/source),'-frames:v','1','-q:v','2',str(DEST/name)],check=True);records.append({'file':name,'page':'https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml','sourceSecond':start,'sha256':hashlib.sha256((DEST/name).read_bytes()).hexdigest(),'label':'2025年青岛港报道原始画面，保留台标和原字幕'})
(DEST/'assets.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
