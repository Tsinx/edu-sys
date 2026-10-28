from pathlib import Path
import json,hashlib,importlib.util
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT/'output/port-frontier-media';DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/frontier-media'
spec=importlib.util.spec_from_file_location('base_media',ROOT/'scripts/port-investment-media.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
spec2=importlib.util.spec_from_file_location('review_media',ROOT/'scripts/port-review-media.py');review=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(review)
def main():
 DEST.mkdir(parents=True,exist_ok=True);shots=json.loads((WORK/'shots.json').read_text(encoding='utf-8'));parts=[];records=[]
 for s in shots:
  w=WORK/s['id'];w.mkdir(exist_ok=True);duration=s['duration'];wav=WORK/(s['id']+'.wav');spoken=float(base.probe(wav)['format']['duration']);tempo=max(1,spoken/(duration-.35))
  if tempo>1.35:raise ValueError('Narration too fast: '+s['id'])
  src=review.SOURCES[s['source']] if 'source' in s else None
  if src and hashlib.sha256((ROOT/src['path']).read_bytes()).hexdigest()!=src['sha256']:raise ValueError('Source changed')
  title=(src['label']+' / 央视网 '+src['date'] if src else '港口管理概论 / 第19讲')+' · 课程合成旁白'
  lines=[(0,duration,r'{\pos(32,6)\fs20}'+title),(0,duration,r'{\an2\pos(640,782)\fs28\q2}'+review.subtitle(s['text']))]
  if src:inputs=['-ss',s['sourceStart'],'-i',ROOT/src['path']];vf='scale=1152:648,pad=1280:800:64:36:color=0x143c47,subtitles=shot.ass'
  else:
   inputs=['-f','lavfi','-i',f'color=c=0x143c47:s=1280x800:r=25:d={duration}'];vf='subtitles=shot.ass'
   if s['id']=='intro':lines +=[(0,duration,r'{\pos(72,155)\fs32\c&HA8C7BA&}从现场问题进入算法机制'),(0,duration,r'{\pos(68,272)\fs70\b1}港口AI与前沿技术'),(1,duration,r'{\pos(74,420)\fs35}识别 · 选择 · 可信协同')]
   else:lines +=[(0,duration,r'{\pos(70,145)\fs32\c&HA8C7BA&}夜班到港的一票教学货物'),(0,duration,r'{\pos(68,260)\fs70\b1}看见了，就能执行吗？'),(3,duration,r'{\pos(74,425)\fs34}CNN · DRL · 区块链 · 数字孪生与大模型'),(6,duration,r'{\pos(74,515)\fs27\c&H9DC7DB&}历史影像用于引入；图解与算例分别说明条件')]
  (w/'shot.ass').write_text(base.ass(lines),encoding='utf-8-sig');part=w/'part.mp4'
  base.run([*inputs,'-i',wav,'-map','0:v:0','-map','1:a:0','-t',duration,'-vf',vf,'-af',f'atempo={tempo},apad,loudnorm=I=-19:TP=-2:LRA=9,afade=t=in:d=0.08,afade=t=out:st={duration-.16}:d=0.16','-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,part],w)
  parts.append(part);records.append({**s,'spokenSeconds':spoken,'tempo':tempo})
 concat=WORK/'concat.txt';concat.write_text(''.join("file '"+p.as_posix()+"'\n" for p in parts),encoding='utf-8');out=DEST/'frontier-opening.mp4';base.run(['-f','concat','-safe',0,'-i',concat,'-c','copy','-movflags','+faststart',out]);base.run(['-ss',8,'-i',out,'-frames:v',1,'-q:v',2,DEST/'frontier-opening.jpg'])
 at=lambda t:f'00:{int(t)//60:02}:{int(t)%60:02}.000'
 (DEST/'frontier-opening.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(at(s['from'])+' --> '+at(s['from']+s['duration'])+'\n'+s['text'] for s in shots)+'\n',encoding='utf-8')
 edl={'lesson':19,'duration':36,'verifiedDuration':float(base.probe(out)['format']['duration']),'sources':{k:{a:b for a,b in v.items() if a!='path'} for k,v in review.SOURCES.items() if k in ('smart','green')},'shots':records,'outputSha256':hashlib.sha256(out.read_bytes()).hexdigest(),'audio':'历史报道原音静音；现有课程音色的合成旁白，不归于出镜人物。','boundary':'2025年青岛港与中国港口历史画面，不能推定未披露的CNN或DRL结构；C-01与后续计算为教学设定。'}
 (DEST/'edl.json').write_text(json.dumps(edl,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 links=' · '.join('<a href="'+v['page']+'">'+v['label']+' '+v['date']+'</a>' for v in edl['sources'].values())
 (DEST/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第19讲：港口AI与前沿技术</title><style>body{font:18px/1.8 "Microsoft YaHei",sans-serif;background:#f5f2e8;color:#173c4d;max-width:1100px;margin:auto;padding:24px}video{width:100%;aspect-ratio:1.6}a{color:#246d77}</style><h1>港口AI与前沿技术</h1><video controls playsinline preload="metadata" src="frontier-opening.mp4" poster="frontier-opening.jpg"><track kind="captions" src="frontier-opening.vtt" srclang="zh" label="课程旁白（画面已含）"></video><p>36秒。历史影像配课程合成旁白；课堂图解与演算另为教学设定。</p><p>'+links+'</p><p><a href="edl.json">剪辑记录</a> · <a href="assets.json">新闻配图来源</a> · <a href="/port-expansion-preview.html?lesson=19&amp;page=1">打开课件</a></p></html>',encoding='utf-8');print(json.dumps({'seconds':edl['verifiedDuration'],'bytes':out.stat().st_size}))
if __name__=='__main__':main()
