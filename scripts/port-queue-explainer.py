"""Render an authored 16:10 teaching film from the course's exact FCFS records."""
from pathlib import Path
from functools import lru_cache
import bisect, hashlib, json, math, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'output/port-queue-explainer'
DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/queue-media'
W,H,FPS=1600,1000,25
BG='#123b49';INK='#f4f1e7';MUTED='#a9c4c1';TEAL='#62beb9';AMBER='#e2b165';DIM='#355c65';GREEN='#a0c49a'

@lru_cache(maxsize=32)
def font(size,bold=False):return ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if bold else 'C:/Windows/Fonts/msyh.ttc',size)
@lru_cache(maxsize=5000)
def glyph(value,size,color,bold=False):
 s=str(value);f=font(size,bold);b=f.getbbox(s);out=Image.new('RGBA',(b[2]-b[0]+8,b[3]-b[1]+10));ImageDraw.Draw(out).text((4-b[0],5-b[1]),s,font=f,fill=color);return out
def text(im,x,y,value,size=30,color=INK,bold=False,anchor='left'):
 out=glyph(str(value),size,color,bold)
 if anchor=='center':x-=out.width/2
 elif anchor=='right':x-=out.width
 im.paste(out,(round(x),round(y)),out)
def line(im,points,color=DIM,width=3):ImageDraw.Draw(im).line(points,fill=color,width=width)
def rect(im,box,fill,outline=None,width=1,radius=0):
 d=ImageDraw.Draw(im)
 if radius:d.rounded_rectangle(box,radius=radius,fill=fill,outline=outline,width=width)
 else:d.rectangle(box,fill=fill,outline=outline,width=width)
def clamp(v):return max(0,min(1,v))
def ease(v):v=clamp(v);return v*v*(3-2*v)
def lerp(a,b,p):return a+(b-a)*ease(p)
def stamp(t):return f'{int(t)//60:02}:{int(t)%60:02}'
def num(t):return f'{t:.1f}'.rstrip('0').rstrip('.')
def speech_at(s,term):return s['spokenSeconds']*s['text'].index(term)/len(s['text'])
def keyed(t,points):
 if t<=points[0][0]:return points[0][1]
 for (a,x),(b,y) in zip(points,points[1:]):
  if t<=b:return lerp(x,y,(t-a)/max(.001,b-a))
 return points[-1][1]
def arrow(im,x1,y1,x2,y2,color=MUTED,width=4):
 line(im,[(x1,y1),(x2,y2)],color,width)
 ang=math.atan2(y2-y1,x2-x1);d=ImageDraw.Draw(im);d.polygon([(x2,y2),(x2-15*math.cos(ang-.45),y2-15*math.sin(ang-.45)),(x2-15*math.cos(ang+.45),y2-15*math.sin(ang+.45))],fill=color)
def truck(im,x,y,label,color=TEAL,selected=False,scale=1):
 if x<-170 or x>W+10:return
 def b(a,c,e,f):return (x+a*scale,y+c*scale,x+e*scale,y+f*scale)
 d=ImageDraw.Draw(im)
 if selected:d.rounded_rectangle(b(-10,-13,153,108),radius=10,outline=AMBER,width=3)
 d.rounded_rectangle(b(0,0,92,57),radius=5,fill=color)
 for k in [17,34,51,68,85]:d.line([(x+k*scale,y+8*scale),(x+k*scale,y+48*scale)],fill=BG,width=max(1,round(2*scale)))
 d.polygon([(x+98*scale,y+15*scale),(x+124*scale,y+15*scale),(x+143*scale,y+38*scale),(x+143*scale,y+65*scale),(x+98*scale,y+65*scale)],fill=color)
 d.polygon([(x+105*scale,y+22*scale),(x+121*scale,y+22*scale),(x+133*scale,y+39*scale),(x+105*scale,y+39*scale)],fill='#d7ebe5')
 d.line([(x,y+65*scale),(x+145*scale,y+65*scale)],fill='#94b2b0',width=max(2,round(5*scale)))
 for k in [22,77,125]:d.ellipse(b(k-11,58,k+11,80),fill='#082c3a',outline='#d2ded4',width=max(1,round(2*scale)))
 text(im,x+72*scale,y+85*scale,label,round(25*scale),AMBER if selected else INK,True,'center')
def header(im,s,i):
 text(im,65,30,'港口管理概论 / 17',23,MUTED)
 text(im,1530,30,f'{i+1:02} / 10',23,MUTED,anchor='right')
 line(im,[(70,77),(1530,77)],DIM,2)
 text(im,65,108,s['title'],52,INK,True)
def phase(r,t):return 'pending' if t<r['arrival'] else 'queue' if t<r['start'] else 'service' if t<r['departure'] else 'complete'
def road(im,rows,t,focus='T03',y=435):
 text(im,70,205,'同一份逐车记录 · 状态示意，未另计行驶时间',24,MUTED)
 text(im,1530,200,f'模型时钟  {num(t)} 分钟',30,TEAL,True,'right')
 for x,label in [(110,'到达入口'),(620,'等候队列'),(1038,'核验台'),(1390,'离开')]:text(im,x,302,label,25,MUTED)
 rect(im,(70,y-5,1530,y+85),'#204955',radius=4)
 for x in range(80,1530,65):line(im,[(x,y+42),(x+30,y+42)],'#52747b',2)
 rect(im,(1020,y-78,1250,y+120),'#1c515b',TEAL,2,12)
 busy=next((r for r in rows if phase(r,t)=='service'),None)
 text(im,1135,y-57,'核验中' if busy else '空闲',26,TEAL if busy else MUTED,True,'center')
 queue=[r for r in rows if phase(r,t)=='queue']
 events=sorted({v[k] for v in rows for k in ['arrival','start','departure']})
 event=events[max(0,bisect.bisect_right(events,t)-1)];blend=ease((t-event)/.28)
 old_queue=[r for r in rows if phase(r,event-1e-8)=='queue']
 for r in rows:
  p=phase(r,t);color=AMBER if p=='queue' else TEAL if p=='service' else '#92aeb0'
  if p=='pending':
   if r['arrival']-t>.7:continue
   x=lerp(-180,120,1-(r['arrival']-t)/.7)
  elif p=='queue':
   x=825-queue.index(r)*175
   if blend<1:
    old=825-old_queue.index(r)*175 if r in old_queue else x-55
    x=lerp(old,x,blend)
  elif p=='service':
   x=1080
   if t-r['start']<.20:x=lerp(1060,1080,(t-r['start'])/.20)
  else:
   if t-r['departure']>.8:continue
   x=lerp(1320,1660,(t-r['departure'])/.8)
  truck(im,x,y-1,r['id'],color,r['id']==focus)
 if busy:
  rect(im,(1040,y+125,1230,y+133),'#355e67',radius=3)
  rect(im,(1040,y+125,1040+190*clamp((t-busy['start'])/busy['service']),y+133),TEAL,radius=3)
 text(im,70,y+151,f'排队 {len(queue)} 辆',27,AMBER)
 text(im,1530,y+151,f'已完成 {sum(phase(r,t)=="complete" for r in rows)} 辆',27,GREEN,anchor='right')
def clock_strip(im,record,t,y=713):
 x0,x1=180,1460;xp=lambda v:x0+v/8*(x1-x0)
 text(im,70,y-46,f'跟踪 {record["id"]}',25,AMBER,True)
 line(im,[(x0,y+16),(x1,y+16)],'#65828a',3)
 for val,label in [(record['arrival'],'到达'),(record['start'],'开始'),(record['departure'],'完成')]:
  if t>=val:
   line(im,[(xp(val),y-13),(xp(val),y+47)],INK,2);text(im,xp(val),y+53,f'{label} {num(val)}',24,INK,anchor='center')
 if t>record['arrival']:rect(im,(xp(record['arrival']),y,xp(min(t,record['start'])),y+32),AMBER)
 if t>record['start']:rect(im,(xp(record['start']),y,xp(min(t,record['departure'])),y+32),TEAL)
 ImageDraw.Draw(im).ellipse((xp(min(t,8))-6,y-8,xp(min(t,8))+6,y+40),fill=INK)
def gate(im,x,y,label,open_,value):
 text(im,x+95,y-230,label,28,MUTED,anchor='center')
 rect(im,(x,y,x+18,y+120),TEAL if open_ else AMBER,radius=4)
 a=math.radians(80*ease(open_));end=(x+9+170*math.cos(a),y+14-170*math.sin(a))
 line(im,[(x+9,y+14),end],TEAL if open_ else AMBER,12)
 text(im,x+95,y+146,'已满足' if open_ else '尚未满足',27,TEAL if open_ else AMBER,True,'center')
 text(im,x+95,y+188,f'{value} 分钟',28,INK,anchor='center')
def two_gates(im,s,local,car_first):
 arrival,available=(1,4) if car_first else (5,3);start=max(arrival,available)
 final_cue=next(c for c in s['cues'] if ('开工只能' if car_first else '开工要等到') in c['text'])
 first_time=s['cues'][1]['from']+1.3;final_time=final_cue['from']+1.4
 t=keyed(local,[(0,0),(first_time,min(arrival,available)),(final_cue['from'],min(arrival,available)+.25),(final_time,start),(s['duration'],start+.45)])
 text(im,70,210,'两项条件同时满足，才可以开始服务',29,MUTED)
 text(im,1530,207,f'模型时钟  {num(t)} 分钟',30,TEAL,True,'right')
 gate(im,265,520,'① 车已经到',t>=arrival,arrival)
 gate(im,760,520,'② 台已经空',t>=available,available)
 arrow(im,500,535,675,535,MUTED)
 if t>=start:
  arrow(im,1025,535,1190,535,TEAL,6);text(im,1335,457,'开始核验',32,TEAL,True,'center');text(im,1335,522,f'{start} 分钟',65,INK,True,'center')
 else:text(im,1335,527,'暂不能开工',32,AMBER,True,'center')
 if min(arrival,available)<=t<start:
  text(im,800,748,'车在等核验台' if car_first else '核验台在等车',37,AMBER,True,'center')
 elif t>=start:
  text(im,800,748,'先到的车等待3分钟' if car_first else '本车无需排队；台先空了2分钟',37,INK,True,'center')
def timebars(im,rows,y,x0=310,x1=1475,span=12,visible=1,focus=''):
 xp=lambda v:x0+v/span*(x1-x0)
 for k,r in enumerate(rows):
  yy=y+k*48;text(im,220,yy-3,r['id'],25,AMBER if r['id']==focus else INK,True)
  if visible<=k/len(rows):continue
  end=lerp(r['arrival'],r['departure'],clamp((visible-k/len(rows))*len(rows)))
  if end>r['arrival']:rect(im,(xp(r['arrival']),yy,xp(min(end,r['start'])),yy+23),AMBER)
  if end>r['start']:rect(im,(xp(r['start']),yy,xp(end),yy+23),TEAL)
  if end>=r['departure']-.001:text(im,xp(r['departure'])+8,yy-3,num(r['departure']),21,MUTED)
 for n in range(0,span+1,2):line(im,[(xp(n),y-13),(xp(n),y+len(rows)*48-12)],'#325460',1);text(im,xp(n),y+len(rows)*48+1,str(n),21,MUTED,anchor='center')

def render(s,i,local,data,captions=True):
 im=Image.new('RGB',(W,H),BG);p=clamp(local/s['duration']);header(im,s,i);base=data['base'];slow=data['slow'];key=s['id']
 if key in ['question','arrive','serve']:
  if key=='question':t=keyed(local,[(0,0),(s['duration']*.45,1),(s['duration'],1.2)])
  elif key=='arrive':t=keyed(local,[(0,0),(max(1,speech_at(s,'第一分钟'))+1,1),(s['duration'],1.6)])
  else:t=keyed(local,[(0,2),(max(1,speech_at(s,'第四分钟'))+.2,4),(max(2,speech_at(s,'第六分钟'))+.5,6),(s['duration'],6.5)])
  road(im,base[:4],t)
  if key=='question':text(im,800,730,'到达了 ≠ 已经开始服务',44,AMBER,True,'center')
  else:clock_strip(im,base[2],t)
 elif key=='clocks':
  text(im,70,210,'一辆车的经历，不能只用核验用时概括',29,MUTED)
  a,b,d=1,4,6;x=lambda v:200+(v-1)/5*1200
  line(im,[(150,460),(1460,460)],'#76928f',3)
  if p>.14:rect(im,(x(a),440,x(lerp(a,b,(p-.14)/.31)),484),AMBER)
  if p>.48:rect(im,(x(b),440,x(lerp(b,d,(p-.48)/.22)),484),TEAL)
  for value,label in [(a,'到达'),(b,'开始'),(d,'完成')]:
   if p>(0 if value==a else .39 if value==b else .66):
    line(im,[(x(value),413),(x(value),514)],INK,2);text(im,x(value),345,label,29,INK,anchor='center');text(im,x(value),532,f'{value} 分钟',31,INK,True,'center')
  if p>.39:text(im,560,655,'排队 3 分钟',39,AMBER,True,'center')
  if p>.66:text(im,1160,655,'服务 2 分钟',39,TEAL,True,'center')
  if p>.76:
   line(im,[(200,732),(1400,732)],MUTED,3);text(im,800,757,'系统停留 5 分钟 = 排队 + 服务',38,INK,True,'center')
 elif key in ['car-first','server-first']:two_gates(im,s,local,key=='car-first')
 elif key=='rule':
  text(im,70,210,'把“条件何时同时满足”写进模型',29,MUTED)
  text(im,800,335,'开始 = max（本车到达，前车完成）',53,INK,True,'center')
  text(im,800,446,'选择较晚的时刻',34,TEAL,True,'center')
  if p>.30:
   text(im,395,584,'车先到：max（1，4）= 4',34,AMBER,True,'center')
   text(im,1200,584,'台先空：max（5，3）= 5',34,TEAL,True,'center')
  if p>.66:
   line(im,[(220,695),(1380,695)],DIM,2)
   text(im,800,730,'先判断谁在等谁，再决定优先改善什么',34,MUTED,anchor='center')
 elif key=='propagate':
  text(im,70,205,'只把T02服务从2改为3分钟；到达顺序与其他服务时长不变',28,MUTED)
  text(im,70,310,'基准',31,INK,True);timebars(im,base[:4],320,visible=1)
  text(im,70,577,'T02变慢',31,AMBER,True);timebars(im,slow[:4],586,visible=clamp(p*1.65),focus='T02')
  labels=[(2,'T02完成晚1分钟'),(3,'T03排队多1分钟'),(4,'T04排队多1分钟')]
  if p>.24:
   for n,(who,label) in enumerate(labels):
    if p>.24+n*.19:text(im,430+n*450,252,label,27,AMBER,True,'center')
  if p>.78:text(im,800,821,'新增服务1分钟 → 下游两辆合计多等2辆·分钟',32,AMBER,True,'center')
 elif key=='gap':
  text(im,70,208,'T05在第10分钟到达；先前延误是否仍会影响它？',29,MUTED)
  text(im,70,325,'基准',31,INK,True);timebars(im,base[3:],345,visible=1)
  text(im,70,520,'变慢后',31,AMBER,True);timebars(im,slow[3:],540,visible=1)
  x10=310+10/12*(1475-310);line(im,[(x10,296),(x10,694)],GREEN,3)
  current=lerp(7,12,clamp((p-.12)/.76));cursor=310+current/12*(1475-310)
  line(im,[(cursor,300),(cursor,667)],AMBER,2);text(im,1530,256,f'模型时钟 {num(current)} 分钟',25,TEAL,True,'right')
  text(im,x10,712,'T05都在10分钟开工',29,GREEN,True,'center')
  if p>.47:text(im,800,808,'8或9分钟已空台 < 10分钟才到车：间隙吸收了延误',31,INK,True,'center')
 elif key=='challenge':
  text(im,70,210,'相同8辆车 · 每车服务2分钟 · 只改变到达节奏',29,MUTED)
  for row,label in [(0,'A 均匀到达'),(1,'B 成对到达')]:
   y=365+row*205;text(im,75,y-70,label,30,INK,True)
   for j in range(8):
    target=300+j*151 if row==0 else 300+(j//2)*310+(j%2)*100
    x=lerp(target-120,target,clamp(p*2.2-j*.08));truck(im,x,y,f'T{j+1:02}',TEAL,False,.65)
  text(im,800,795,'谁在等？从何时开始？何时消失？',39,AMBER,True,'center')
 rect(im,(0,873,W,946),'#0b303d');line(im,[(70,873),(1530,873)],DIM,1)
 if captions:
  cue=next((c for c in s['cues'] if c['from']<=local<c['to']),None)
  if cue:
   chunks=[];current=''
   for ch in cue['text']:
    if font(31).getlength(current+ch)>1410:chunks.append(current);current=ch
    else:current+=ch
   if current:chunks.append(current)
   for k,part in enumerate(chunks[:2]):text(im,800,884+k*39,part,31,INK,False,'center')
 text(im,65,962,'课程原创示意 · 单台 / 先到先服务 / 同到按编号 · 时刻单位：分钟 · 基准每车2分钟',20,MUTED)
 return im

def run(args):subprocess.run(['ffmpeg','-hide_banner','-v','error','-y',*map(str,args)],check=True)
def vtt(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def prepare_cues(s):
 clauses=re.findall(r'[^，。？！；]+[，。？！；]?',s['text']);items=[];current=''
 for part in clauses:
  if current and len(current+part)>34:items.append(current);current=part
  else:current+=part
  if part.endswith(('。','？','！')):items.append(current);current=''
 if current:items.append(current)
 weight=sum(len(c) for c in items);from_=0;out=[]
 for item in items:
  to=from_+s['spokenSeconds']*len(item)/weight;out.append({'from':from_,'to':to,'text':item});from_=to
 return out
def main():
 DEST.mkdir(exist_ok=True,parents=True);data=json.loads((WORK/'shots.json').read_text(encoding='utf-8'))
 for s in data['shots']:s['cues']=prepare_cues(s)
 # Pad natural narration to each scene. No tempo change and no music over the explanations.
 audio_parts=[]
 for s in data['shots']:
  out=WORK/(s['id']+'-padded.wav');run(['-i',WORK/(s['id']+'.wav'),'-af','apad,afade=t=in:d=0.04','-t',s['duration'],'-ar',48000,'-ac',1,'-c:a','pcm_s16le',out]);audio_parts.append(out)
 (WORK/'audio-concat.txt').write_text(''.join("file '"+p.as_posix()+"'\n" for p in audio_parts),encoding='utf-8')
 run(['-f','concat','-safe',0,'-i',WORK/'audio-concat.txt','-c','copy',WORK/'narration.wav'])
 final=DEST/'queue-explainer.mp4';log=(WORK/'render.log').open('w',encoding='utf-8')
 cmd=['ffmpeg','-hide_banner','-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate',str(FPS),'-i','pipe:0','-i',str(WORK/'narration.wav'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-threads','2','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','loudnorm=I=-18:TP=-2:LRA=8','-movflags','+faststart','-t',str(data['duration']),str(final)]
 process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
 try:
  for i,s in enumerate(data['shots']):
   count=round(s['duration']*FPS)
   for n in range(count):process.stdin.write(render(s,i,n/FPS,data).tobytes())
   render(s,i,s['duration']*.68,data).save(WORK/f'{i+1:02}-{s["id"]}.png')
   print(f'Rendered {i+1}/10 {s["id"]}: {s["from"]+s["duration"]:.2f}s',flush=True)
 finally:process.stdin.close()
 code=process.wait();log.close()
 if code:raise RuntimeError((WORK/'render.log').read_text(encoding='utf-8'))
 render(data['shots'][1],1,data['shots'][1]['duration']*.85,data,False).save(DEST/'queue-explainer.jpg',quality=94)
 cues=[(s['from']+c['from'],s['from']+c['to'],c['text']) for s in data['shots'] for c in s['cues']]
 (DEST/'queue-explainer.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{vtt(a)} --> {vtt(b)}\n{t}' for a,b,t in cues)+'\n',encoding='utf-8')
 (DEST/'queue-explainer-chapters.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{vtt(s["from"])} --> {vtt(s["from"]+s["duration"])}\n{s["title"]}' for s in data['shots'])+'\n',encoding='utf-8')
 receipt={**data,'videoSha256':hashlib.sha256(final.read_bytes()).hexdigest(),'size':[W,H],'fps':FPS,'audio':'现有授课音色的课程合成旁白，原速，无背景音乐。','captions':'画面内完整字幕，另附VTT。各句按语音总时长与字数配时，非逐词强制对齐。','evidenceClass':'全部为课程原创概念动画，非实港录像；排程由共享FCFS模型导出。'}
 (DEST/'queue-explainer-edl.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 chapters=''.join(f'<li><button type="button" data-start="{s["from"]}"><span>{stamp(s["from"])}</span> {s["title"]}</button></li>' for s in data['shots'])
 transcript=''.join(f'<p><strong>{stamp(s["from"])} {s["title"]}</strong><br>{s["text"]}</p>' for s in data['shots'])
 html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>等待怎样形成 · 第17讲教学动画</title><style>*{box-sizing:border-box}body{margin:0;background:#eef1e8;color:#173e4c;font:17px/1.7 "Microsoft YaHei",sans-serif}main{max-width:1200px;margin:auto;padding:26px}h1{font-size:30px}video{display:block;width:100%;aspect-ratio:1.6;background:#123b49}a{color:#236b76}ol{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:9px}button{font:inherit;text-align:left;padding:12px;min-height:48px;border:1px solid #a0bbae;color:#234c5b;background:#f9f8ee;cursor:pointer;width:100%}button:hover,button:focus-visible{background:#dceae2}button span{color:#657e75;margin-right:12px}details{border-top:1px solid #b4c6b6;padding-top:18px}summary{cursor:pointer;min-height:44px}footer{font-size:14px;color:#55726e}nav{display:flex;gap:22px;flex-wrap:wrap}@media(max-width:650px){main{padding:16px}h1{font-size:24px}ol{grid-template-columns:1fr}button{font-size:15px}}</style><main><nav><a href="/port-expansion-preview.html?lesson=17&page=4&student=1">返回第4页</a><a href="/port-queue-lab.html?scene=hand">进入模拟一</a></nav><h1>等待怎样形成：车、服务台与两道开工条件</h1><p>先看过程，再判断谁在等待、延误怎样传播。完整旁白字幕已嵌入画面。</p><video controls playsinline preload="metadata" src="queue-explainer.mp4" poster="queue-explainer.jpg"><track kind="captions" src="queue-explainer.vtt" srclang="zh" label="中文旁白（画面已含）"><track kind="chapters" src="queue-explainer-chapters.vtt" srclang="zh" label="讲解章节"></video><ol>'''+chapters+'''</ol><details><summary>阅读完整讲解文字</summary>'''+transcript+'''</details><footer><p>课程原创概念动画；单台、先到先服务、同到按编号，初始空闲。每车基准2分钟用于逐车示例，第11页恢复平均0.6分钟的随机基准。车辆位移不另计行驶时间。</p><p><a href="queue-explainer.mp4" download>下载MP4</a> · <a href="queue-explainer.vtt" download>下载字幕</a> · <a href="queue-explainer-edl.json">动画脚本与模型记录</a></p></footer></main><script>const video=document.querySelector('video');for(const button of document.querySelectorAll('[data-start]'))button.addEventListener('click',()=>{video.currentTime=Number(button.dataset.start);video.play().catch(()=>{});video.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});</script></html>'''
 (DEST/'queue-explainer.html').write_text(html,encoding='utf-8')
 print(json.dumps({'seconds':data['duration'],'bytes':final.stat().st_size,'sha256':receipt['videoSha256']},ensure_ascii=False))
if __name__=='__main__':main()
