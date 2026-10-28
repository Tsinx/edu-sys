"""Two 32-second review openings from locally cached, credited historical footage."""
from pathlib import Path
import subprocess,json,hashlib,importlib.util
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'output/port-review-media';DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/review-media-v2'
spec=importlib.util.spec_from_file_location('investment_media',ROOT/'scripts/port-investment-media.py');media=importlib.util.module_from_spec(spec);spec.loader.exec_module(media)
SOURCES={
 'smart':{'path':'output/port-transition-media/smart.mp4','page':'https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml','date':'2025-05-22','label':'青岛港历史报道','sha256':'353d0cb87b000e5644503c70ab34dd347d7b5732d934a71acd3d9e260cdd9e6b'},
 'guoyuan':{'path':'output/port-trade-media/guoyuan.mp4','page':'https://tv.cctv.com/2023/03/16/VIDEE8NoWdAPxzAoyF22kdjX230316.shtml','date':'2023-03-16','label':'重庆果园港历史报道','sha256':'a7e7e8f21aa7d992af35a58a192f4c6e90b43d2fdc6635acd146d4eebf56b909'},
 'green':{'path':'output/port-transition-media/green.mp4','page':'https://tv.cctv.com/2025/06/09/VIDEHV4MAQdbeBL4IovSAvuX250609.shtml','date':'2025-06-09','label':'中国港口绿色转型历史报道','sha256':'8e988f5c2b814caea34f3b0f0c2c874e7808a23102df740389c9d27abed8c1cb'}
}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def subtitle(text):
 if len(text)<=34:return text
 boundaries=[i+1 for i,c in enumerate(text) if c in '，。；？' and 14<i<35]
 at=boundaries[-1] if boundaries else 31
 return text[:at]+r'\N'+text[at:]
def main():
 DEST.mkdir(parents=True,exist_ok=True);films=json.loads((WORK/'films.json').read_text(encoding='utf-8'));receipts=[]
 for key,s in SOURCES.items():
  if digest(ROOT/s['path'])!=s['sha256']:raise ValueError('Source changed: '+key)
 for film in films:
  lesson=film['lesson'];parts=[];shots=[]
  for s in film['shots']:
   name=str(film.get('voiceKey',lesson))+'-'+s['id'];w=WORK/name;w.mkdir(exist_ok=True);duration=s['duration'];wav=WORK/(name+'.wav');spoken=float(media.probe(wav)['format']['duration']);tempo=max(1,spoken/(duration-.35))
   if tempo>1.35:raise ValueError('Narration too fast: '+name)
   src=SOURCES[s['source']] if 'source' in s else None
   label=(src['label']+' / 央视网 '+src['date'] if src else '港口管理概论 / 第'+str(lesson)+'讲')+' · 课程合成旁白'
   lines=[(0,duration,r'{\pos(32,6)\fs20}'+label),(0,duration,r'{\an2\pos(640,782)\fs28\q2}'+subtitle(s['text']))]
   if src:
    inputs=['-ss',s['sourceStart'],'-i',ROOT/src['path']];vf='scale=1152:648,pad=1280:800:64:36:color=0x143c47,subtitles=shot.ass'
   else:
    inputs=['-f','lavfi','-i',f'color=c=0x143c47:s=1280x800:r=25:d={duration}'];vf='subtitles=shot.ass'
    if s['id']=='intro':lines +=[(0,duration,r'{\pos(72,155)\fs32\c&HA8C7BA&}港口管理概论 · 复习'+('一' if lesson==20 else '二')),(0,duration,r'{\pos(68,275)\fs64\b1}'+film['title']),(1,duration,r'{\pos(74,420)\fs33}'+('贸易 → 作业 → 等待 → 交付 → 恢复' if lesson==20 else '通关 → 数字协同 → 绿色改造 → 投资'))]
    else:lines +=[(0,duration,r'{\pos(70,150)\fs31\c&HA8C7BA&}完整案例 · 条件与结论相连'),(0,duration,r'{\pos(68,268)\fs62\b1}'+('局部更快，交付就更可靠吗？' if lesson==20 else '眼前可行，长期也值得吗？')),(3,duration,r'{\pos(74,430)\fs32}'+('箱流、在港时间、排队与中断恢复' if lesson==20 else '一批重庆备件，两类长期投资')),(5,duration,r'{\pos(74,510)\fs27\c&H9DC7DB&}历史镜头用于引入；后续数字为独立教学设定')]
   (w/'shot.ass').write_text(media.ass(lines),encoding='utf-8-sig');part=w/'part.mp4'
   media.run([*inputs,'-i',wav,'-map','0:v:0','-map','1:a:0','-t',duration,'-vf',vf,'-af',f'atempo={tempo},apad,loudnorm=I=-19:TP=-2:LRA=9,afade=t=in:d=0.08,afade=t=out:st={duration-.16}:d=0.16','-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,part],w)
   parts.append(part);shots.append({**s,'spokenSeconds':spoken,'tempo':tempo})
  concat=WORK/(str(lesson)+'-concat.txt');concat.write_text(''.join("file '"+p.as_posix()+"'\n" for p in parts),encoding='utf-8');stem='review'+str(lesson)+'-opening';out=DEST/(stem+'.mp4')
  media.run(['-f','concat','-safe',0,'-i',concat,'-c','copy','-movflags','+faststart',out]);media.run(['-ss',8,'-i',out,'-frames:v',1,'-q:v',2,DEST/(stem+'.jpg')])
  clock=lambda t:f'00:{int(t)//60:02}:{int(t)%60:02}.000'
  (DEST/(stem+'.vtt')).write_text('WEBVTT\n\n'+'\n\n'.join(clock(s['from'])+' --> '+clock(s['from']+s['duration'])+'\n'+s['text'] for s in film['shots'])+'\n',encoding='utf-8')
  used={s['source'] for s in shots if 'source' in s}
  record={'lesson':lesson,'title':film['title'],'duration':32,'verifiedDuration':float(media.probe(out)['format']['duration']),'sources':{k:{a:b for a,b in s.items() if a!='path'} for k,s in SOURCES.items() if k in used},'shots':shots,'outputSha256':digest(out),'audio':'原报道声音静音；现有课程音色的合成旁白，不归于出镜人物。','boundary':'每段历史影像分别注明地点、报道日期；第21讲后段为中国港口绿色转型报道，不推定其镜头均在重庆。后续案例为独立教学设定。','rights':'历史片段供课堂讨论，画面权利归原权利人。'}
  receipts.append(record);print(json.dumps({'lesson':lesson,'seconds':record['verifiedDuration'],'bytes':out.stat().st_size}))
 (DEST/'edl.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第20、21讲复习片头</title><style>body{font:18px/1.8 "Microsoft YaHei",sans-serif;background:#f5f2e8;color:#173c4d;max-width:1100px;margin:auto;padding:24px}video{width:100%;aspect-ratio:1.6}a{color:#246d77}</style><h1>港口管理概论 · 两次综合复习</h1>'
 for r in receipts:
  stem='review'+str(r['lesson'])+'-opening';html+='<h2>第'+str(r['lesson'])+'讲：'+r['title']+'</h2><video controls playsinline preload="metadata" src="'+stem+'.mp4" poster="'+stem+'.jpg"><track kind="captions" src="'+stem+'.vtt" srclang="zh" label="完整课程旁白（画面已含）"></video><p>32秒，历史影像配课程合成旁白；案例另为教学设定。</p><p>'+' · '.join('<a href="'+s['page']+'">'+s['label']+' '+s['date']+'</a>' for s in r['sources'].values())+'</p><p><a href="/port-expansion-preview.html?lesson='+str(r['lesson'])+'&amp;page=1">打开授课页</a> · <a download href="'+stem+'.mp4">下载片头</a></p>'
 (DEST/'index.html').write_text(html+'<p><a href="edl.json">剪辑记录</a></p></html>',encoding='utf-8')
if __name__=='__main__':main()
