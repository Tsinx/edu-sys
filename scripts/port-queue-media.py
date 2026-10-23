"""Edit lecture 17 from inspected historical B-roll and course-authored narration."""
from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'output/port-queue-media'
DEST=ROOT/'apps/teacher-web/public/course-assets/port-management/queue-media'
SOURCE=ROOT/'output/port-transition-media/smart.mp4'
SOURCE_PAGE='https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml'
def run(args,cwd=None):
 subprocess.run(['ffmpeg','-hide_banner','-v','error','-y',*map(str,args)],cwd=cwd,check=True)
def probe(path):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))
def time(n):return f'{int(n)//3600}:{int(n)//60%60:02}:{int(n)%60:02}.{int(n%1*100):02}'
def ass(lines):
 return ('[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 800\n\n[V4+ Styles]\n'
 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n'
 'Style: Text,Microsoft YaHei,30,&H00E8F2F5,&H00FFFFFF,&H00283B44,&H00283B44,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\n'
 'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'+
 ''.join(f'Dialogue: 0,{time(a)},{time(b)},Text,,0,0,0,,{s}\n' for a,b,s in lines))
def main():
 DEST.mkdir(exist_ok=True,parents=True)
 shots=json.loads((WORK/'shots.json').read_text(encoding='utf-8'));outputs=[];records=[]
 for shot in shots:
  key=shot['id'];duration=shot['duration'];w=WORK/key;w.mkdir(exist_ok=True)
  audio=probe(WORK/(key+'.wav'));spoken=float(audio['format']['duration'])
  speed=max(1,spoken/(duration-.55))
  if speed>1.35:raise ValueError('Narration too long: '+key)
  if 'sourceStart' in shot:
   source_args=['-ss',shot['sourceStart'],'-i',SOURCE]
   lines=[(0,duration,r'{\pos(24,10)\fs21}青岛港历史作业画面 / 央视网 2025-05-22'),
    (0,duration,r'{\pos(24,768)\fs21}课程合成旁白 · 画面不代表东湾港或拥堵事件现场')]
   vf='scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x113a48,subtitles=shot.ass'
  else:
   source_args=['-f','lavfi','-i',f'color=c=0x113a48:s=1280x800:r=25:d={duration}']
   lines=[(0,duration,r'{\pos(75,85)\fs26\c&H94C6CB&}港口管理概论 / 第17讲')]
   if key=='intro':lines +=[(0,duration,r'{\pos(72,260)\fs65\b1}港口拥堵的非线性'),(0,duration,r'{\pos(76,400)\fs36}平均能力足够，为什么仍然会等？')]
   else:lines +=[(0,duration,r'{\pos(75,210)\fs40}东湾港南闸口 · 独立教学情境'),(0,duration,r'{\pos(75,320)\fs85\b1}90票     99票'),(0,duration,r'{\pos(76,455)\fs34}每小时平均处理能力仍为100票'),(5,duration,r'{\pos(76,555)\fs37\c&H96C5E0&}等待会增加多少？')]
   lines +=[(0,duration,r'{\pos(76,710)\fs22}实拍镜头：青岛港历史报道；港名与业务数字为课程设定')]
   vf='subtitles=shot.ass'
  # Complete narration is also available as a VTT track; short captions preserve the source image.
  (w/'shot.ass').write_text(ass(lines),encoding='utf-8-sig')
  out=w/'part.mp4'
  run([*source_args,'-i',WORK/(key+'.wav'),'-map','0:v:0','-map','1:a:0','-t',duration,'-vf',vf,
       '-af',f'atempo={speed},apad,loudnorm=I=-19:TP=-2:LRA=9,afade=t=in:d=0.08,afade=t=out:st={duration-.16}:d=0.16',
       '-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,out],w)
  outputs.append(out);records.append({**shot,'spokenSeconds':spoken,'tempo':speed})
 (WORK/'concat.txt').write_text(''.join("file '"+p.as_posix()+"'\n" for p in outputs),encoding='utf-8')
 final=DEST/'queue-opening.mp4'
 run(['-f','concat','-safe',0,'-i',WORK/'concat.txt','-c','copy','-movflags','+faststart',final])
 run(['-ss',100,'-i',SOURCE,'-frames:v',1,'-q:v',2,DEST/'queue-opening.jpg'])
 def vtt(t):return f'00:{int(t)//60:02}:{int(t)%60:02}.000'
 (DEST/'queue-opening.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(vtt(s['from'])+' --> '+vtt(s['from']+s['duration'])+'\n'+s['text'] for s in shots)+'\n',encoding='utf-8')
 metadata=probe(final)
 receipt={'lesson':17,'title':'港口拥堵的非线性','duration':46,'sourcePage':SOURCE_PAGE,'sourceTitle':'[新闻直播间]山东 青岛港自动化码头 每小时装卸超62箱 第13次刷新世界纪录','sourceDate':'2025-05-22',
  'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(final.read_bytes()).hexdigest(),
  'shots':records,'audio':'课程合成旁白，使用现有授课音色。镜头原声静音；不归于出镜人物。','boundary':'青岛港历史作业镜头，非拥堵事件现场；东湾港、到达率和服务率为独立教学设定。','rights':'原画面版权归原权利人。课堂短节选与课程提问，不代表完整报道的再发行许可。',
  'verifiedDuration':float(metadata['format']['duration'])}
 (DEST/'edl.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (DEST/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第17讲片头</title><style>body{font:18px/1.8 \"Microsoft YaHei\",sans-serif;background:#f5f2e8;color:#173c4d;max-width:1000px;margin:30px auto;padding:20px}video{width:100%;aspect-ratio:1.6}a{color:#246d77}</style><h1>第17讲：港口拥堵的非线性</h1><video controls src="queue-opening.mp4" poster="queue-opening.jpg"><track kind="captions" src="queue-opening.vtt" srclang="zh" label="课程旁白全文"></video><p>46秒，课程合成旁白。青岛港历史作业画面，非东湾港或拥堵事件现场；数字为独立教学设定。</p><p><a href="'+SOURCE_PAGE+'">央视网原报道，2025-05-22</a> · <a href="edl.json">剪辑与校验记录</a> · <a href="queue-opening.mp4" download>下载片头</a></p></html>',encoding='utf-8')
 print(json.dumps({'duration':receipt['verifiedDuration'],'bytes':final.stat().st_size,'shots':len(records)},ensure_ascii=False))
if __name__=='__main__':main()
