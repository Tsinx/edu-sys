"""Reproducible 44-second lecture 18 edit with separately credited historical footage."""
from pathlib import Path
import subprocess,json,hashlib,shutil,urllib.request,argparse
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'output/port-investment';DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/investment-media'
SOURCE=WORK/'yangshan.mp4';PAGE='https://news.cctv.cn/2024/09/29/ARTI6z6PUrG4m9TrDRnSmfnV240929.shtml'
def run(args,cwd=None):subprocess.run(['ffmpeg','-hide_banner','-v','error','-y',*map(str,args)],cwd=cwd,check=True)
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]))
def at(t):return f'{int(t)//3600}:{int(t)//60%60:02}:{int(t)%60:02}.{round(t%1*100):02}'
def ass(lines):
 return ('[Script Info]\nScriptType: v4.00+\nPlayResX:1280\nPlayResY:800\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Text,Microsoft YaHei,28,&H00E9F1EE,&H00FFFFFF,&H002D3614,&H002D3614,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'+''.join(f'Dialogue: 0,{at(a)},{at(b)},Text,,0,0,0,,{s}\n' for a,b,s in lines))
PHOTO='https://p4.img.cntv.cn/photoworkspace/contentimg/2024/09/29/2024092917563418584.jpg'
def acquire():
 WORK.mkdir(parents=True,exist_ok=True)
 def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':PAGE}),timeout=90).read()
 api='https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=2eb00ee7488b43ba8a7f8bea8d508409'
 info=json.loads(get(api));(WORK/'source.json').write_text(json.dumps({'page':PAGE,'api':api,'response':info},ensure_ascii=False,indent=2),encoding='utf-8')
 if not SOURCE.exists():run(['-i',info['hls_url'],'-c','copy',SOURCE])
 (WORK/'construction-photo.jpg').write_bytes(get(PHOTO))
def main():
 DEST.mkdir(parents=True,exist_ok=True);shots=json.loads((WORK/'shots.json').read_text());parts=[];records=[]
 for s in shots:
  w=WORK/s['id'];w.mkdir(exist_ok=True);duration=s['duration'];spoken=float(probe(WORK/(s['id']+'.wav'))['format']['duration']);tempo=max(1,spoken/(duration-.45))
  if tempo>1.35:raise ValueError('Narration too fast: '+s['id'])
  lines=[(0,duration,r'{\pos(32,6)\fs20}'+('洋山港历史报道 / 央视网 2024-09-29 · 课程合成旁白' if 'sourceStart' in s else '港口管理概论 / 第18讲 · 课程合成旁白'))]
  text=s['text'];split=max(text.rfind(p,0,40)+1 for p in '。？！') if len(text)>40 else len(text)
  if split<10:split=min(38,len(text))
  sub=text[:split]+(r'\N'+text[split:] if split<len(text) else '')
  lines.append((0,duration,r'{\an2\pos(640,785)\fs28\q2}'+sub))
  if 'sourceStart' in s:
   source=['-ss',s['sourceStart'],'-i',SOURCE];vf='scale=1152:648,pad=1280:800:64:36:color=0x143c47,subtitles=shot.ass'
  else:
   source=['-f','lavfi','-i',f'color=c=0x143c47:s=1280x800:r=25:d={duration}'];vf='subtitles=shot.ass'
   if s['id']=='intro':lines +=[(0,duration,r'{\pos(72,160)\fs35\c&HA8C7BA&}一笔不可轻易收回的投入'),(0,duration,r'{\pos(68,280)\fs72\b1}港口扩建与投资决策'),(1,duration,r'{\pos(74,430)\fs37}付款之后，能力还要多久才能到位？')]
   else:lines +=[(0,duration,r'{\pos(70,135)\fs32\c&HA8C7BA&}东湾港 · 独立教学情境'),(0,duration,r'{\pos(68,245)\fs66\b1}现在建？ 分期建？'),(3,duration,r'{\pos(72,355)\fs60\b1}还是再等一年？'),(7,duration,r'{\pos(76,510)\fs30\c&H9DC7DB&}初始判断，留到六年经营结果后再检验')]
  (w/'shot.ass').write_text(ass(lines),encoding='utf-8-sig');out=w/'part.mp4'
  run([*source,'-i',WORK/(s['id']+'.wav'),'-map','0:v:0','-map','1:a:0','-t',duration,'-vf',vf,'-af',f'atempo={tempo},apad,loudnorm=I=-19:TP=-2:LRA=9,afade=t=in:d=0.08,afade=t=out:st={duration-.16}:d=0.16','-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,out],w)
  parts.append(out);records.append({**s,'spokenSeconds':spoken,'tempo':tempo})
 (WORK/'concat.txt').write_text(''.join("file '"+p.as_posix()+"'\n" for p in parts),encoding='utf-8');out=DEST/'investment-opening.mp4'
 run(['-f','concat','-safe',0,'-i',WORK/'concat.txt','-c','copy','-movflags','+faststart',out]);run(['-ss',8,'-i',out,'-frames:v',1,'-q:v',2,DEST/'investment-opening.jpg']);run(['-ss',150,'-i',SOURCE,'-frames:v',1,'-q:v',2,DEST/'yangshan-construction.jpg'])
 if (WORK/'construction-photo.jpg').exists():shutil.copy2(WORK/'construction-photo.jpg',DEST/'yangshan-construction.jpg')
 vtt=lambda t:f'00:{int(t)//60:02}:{int(t)%60:02}.000'
 (DEST/'investment-opening.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(vtt(s['from'])+' --> '+vtt(s['from']+s['duration'])+'\n'+s['text'] for s in shots)+'\n',encoding='utf-8')
 receipt={'lesson':18,'duration':44,'sourcePage':PAGE,'photoSource':PHOTO,'sourceDate':'2024-09-29','sourceTitle':'中国新地标 上海洋山港：打造全球集装箱码头的新标杆','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'shots':records,'verifiedDuration':float(probe(out)['format']['duration']),'audio':'原声静音；使用现有课程音色的合成旁白，不归于出镜人物。','boundary':'洋山港历史运营与建设画面；东湾港与全部投资数字为独立教学设定。','rights':'原画面权利归原权利人；24秒历史镜头用于课堂讨论，不代表完整报道再发行许可。'}
 (DEST/'edl.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (DEST/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第18讲片头</title><style>body{font:18px/1.8 "Microsoft YaHei",sans-serif;background:#f5f2e8;color:#173c4d;max-width:1100px;margin:auto;padding:24px}video{width:100%;aspect-ratio:1.6}a{color:#246d77}</style><h1>港口扩建与投资决策</h1><video controls playsinline preload="metadata" src="investment-opening.mp4" poster="investment-opening.jpg"><track kind="captions" src="investment-opening.vtt" srclang="zh" label="完整课程旁白（画面已含）"></video><p>44秒。洋山港2024年历史画面，课程合成旁白；东湾港与投资数字为独立教学情境。</p><p><a href="'+PAGE+'">央视网原报道</a> · <a href="edl.json">剪辑记录</a> · <a href="investment-opening.mp4" download>下载片头</a> · <a href="/port-expansion-preview.html?lesson=18&amp;page=1&amp;student=1">返回课件</a></p></html>',encoding='utf-8');print(json.dumps({'seconds':receipt['verifiedDuration'],'bytes':out.stat().st_size,'shots':len(records)}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--acquire',action='store_true');args=parser.parse_args()
 if args.acquire:acquire()
 else:main()
