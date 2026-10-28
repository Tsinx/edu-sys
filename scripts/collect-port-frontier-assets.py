"""Collect primary-page image candidates without executing page scripts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request,urlopen
from urllib.parse import urljoin
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'output/port-frontier-20261028/sources';WORK.mkdir(parents=True,exist_ok=True)
PAGES={
 'chongqing':'https://www.cq.gov.cn/zt/xblhxtd/jdtp/202503/t20250314_14407887.html',
 'rotterdam':'https://www.portofrotterdam.com/en/port-future/innovation/artificial-intelligence-port',
 'tradelens':'https://www.maersk.com/news/articles/2022/11/29/maersk-and-ibm-to-discontinue-tradelens',
 'gsbn':'https://gsbn.trade/gsbns-blockchain-enabled-cargo-release-launched-across-china/',
 'jiangsu':'https://www.mot.gov.cn/xinwen/jiaotongyaowen/202610/t20261028_4226796.html'
}
class Images(HTMLParser):
 def __init__(self):super().__init__();self.rows=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and a.get('property','')=='og:image':self.rows.append({'url':a.get('content'),'alt':'Open Graph'})
  if tag=='img':
   src=a.get('data-src') or a.get('src')
   if src:self.rows.append({'url':src,'alt':a.get('alt','')})
allrows={}
for key,url in PAGES.items():
 try:
  html=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read();(WORK/(key+'.html')).write_bytes(html);parser=Images();parser.feed(html.decode('utf-8','replace'));seen=set();rows=[]
  for row in parser.rows:
   u=urljoin(url,row['url'])
   if u in seen or u.startswith('data:'):continue
   seen.add(u);rows.append({**row,'url':u})
  allrows[key]={'page':url,'htmlSha256':hashlib.sha256(html).hexdigest(),'images':rows};print(key+': '+json.dumps(rows[:12],ensure_ascii=False))
 except Exception as exc:allrows[key]={'page':url,'error':str(exc)};print(key+': '+str(exc))
(WORK/'image-candidates.json').write_text(json.dumps(allrows,ensure_ascii=False,indent=2),encoding='utf-8')
