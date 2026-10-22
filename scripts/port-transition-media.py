"""Reproducible short classroom edits. Original footage stays in ignored output/."""
import argparse, hashlib, json, re, subprocess, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'output/port-transition-media'
DEST = ROOT / 'apps/teacher-web/public/course-assets/port-management/transition-media'
REPORTS = {
    'smart': 'https://tv.cctv.com/2025/05/22/VIDEu7abgnqxjck2rKBqygmP250522.shtml',
    'green': 'https://tv.cctv.com/2025/06/09/VIDEHV4MAQdbeBL4IovSAvuX250609.shtml',
}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0', 'Referer':'https://tv.cctv.com/'})
    return urllib.request.urlopen(req, timeout=90).read()

def acquire():
    WORK.mkdir(parents=True, exist_ok=True)
    for key, page in REPORTS.items():
        html = get(page).decode('utf-8')
        guid = re.search(r'var\s+guid\s*=\s*[\'"]([a-f0-9]{32})', html).group(1)
        api = f'https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid={guid}'
        info = json.loads(get(api))
        (WORK/f'{key}-source.json').write_text(json.dumps({'page':page,'api':api,'response':info}, ensure_ascii=False, indent=2), encoding='utf-8')
        video = info['video']
        chapters = video.get('chapters4') or video.get('chapters3') or video.get('chapters2') or video.get('chapters')
        urls = [c['url'].replace('http://','https://') for c in chapters if c.get('url')]
        target = WORK/f'{key}.mp4'
        if not target.exists():
            if len(urls)==1: target.write_bytes(get(urls[0]))
            else:
                subprocess.run(['ffmpeg','-v','error','-y','-i',info['hls_url'].replace('http://','https://'),'-c','copy',str(target)],check=True)
        print(json.dumps({'id':key,'title':info['title'],'duration':video['totalLength'],'bytes':target.stat().st_size},ensure_ascii=False),flush=True)

# Cut choices are set after examining source frames and transcribing the selected passage.
EDITS = [
 {'id':'smart','lesson':15,'start':34,'seconds':35,'intro':4,'outro':6,'duration':45,'date':'2025-05-22','title':'智慧港口与数字协同','question':'设备怎样接到任务？人员在哪里判断？','finding':'作业更快之后，货物能否更早交付？','boundary':'青岛港历史报道；单机作业效率不等于全程交付效率'},
 {'id':'green','lesson':16,'start':85,'seconds':27.4,'intro':4,'outro':6,'duration':37.4,'date':'2025-06-09','title':'绿色港口与可持续转型','question':'岸电替代了什么？哪些条件决定实际使用？','finding':'设施建成以后，怎样核实使用与减排？','boundary':'原报道含不同港口；历史比例与建设目标不是当前实绩'},
]

def run(args, cwd=None):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*map(str,args)],cwd=cwd,check=True)

def ass_time(n): return f'{int(n)//3600}:{int(n)//60%60:02}:{int(n)%60:02}.{int(round((n%1)*100)):02}'
def ass(lines):
    head='[Script Info]\nScriptType: v4.00+\nPlayResX:1280\nPlayResY:800\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Text,Microsoft YaHei,30,&H00E7F2F6,&H00FFFFFF,&H003C2D0B,&H003C2D0B,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'
    return head+''.join(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},Text,,0,0,0,,{text}\n' for a,b,text in lines)

def render():
    DEST.mkdir(parents=True,exist_ok=True); records=[]
    for e in EDITS:
        key=e['id']; w=WORK/key;w.mkdir(exist_ok=True)
        for part,title,question in [('intro',e['title'],e['question']),('outro','港口观察',e['finding'])]:
            length=e[part]
            (w/f'{part}.ass').write_text(ass([(0,length,r'{\pos(78,100)\fs26\c&H8DBFDC&}'+f'港口管理概论 / 第{e["lesson"]}讲'),(0,length,r'{\pos(76,265)\fs58\b1}'+title),(0,length,r'{\pos(78,420)\fs34}'+question),(0,length,r'{\pos(78,690)\fs23\c&HBACAC1&}'+f'央视网原报道节选 · {e["date"]} · 原声保留')]),encoding='utf-8-sig')
            run(['-f','lavfi','-i',f'color=c=0x103444:s=1280x800:r=25:d={length}','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',length,'-vf',f'subtitles={part}.ass','-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,f'{part}.mp4'],w)
        (w/'source.ass').write_text(ass([(0,e['seconds'],r'{\pos(24,8)\fs21}'+f'新闻节选 / {e["date"]} · 台标与原声保留'),(0,e['seconds'],r'{\pos(24,768)\fs21}'+e['boundary'])]),encoding='utf-8-sig')
        run(['-ss',e['start'],'-i',WORK/f'{key}.mp4','-t',e['seconds'],'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x103444,subtitles=source.ass','-af',f'loudnorm=I=-19:TP=-2:LRA=11,afade=t=in:d=0.10,afade=t=out:st={e["seconds"]-.15}:d=0.15','-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,'cut.mp4'],w)
        (w/'concat.txt').write_text("file 'intro.mp4'\nfile 'cut.mp4'\nfile 'outro.mp4'\n",encoding='utf-8')
        run(['-f','concat','-safe',0,'-i',w/'concat.txt','-c','copy','-movflags','+faststart',DEST/f'{key}.mp4'])
        run(['-ss',e['intro']+8,'-i',DEST/f'{key}.mp4','-frames:v',1,'-q:v',2,DEST/f'{key}.jpg'])
        def vtt(t):return f'00:{int(t)//60:02}:{int(t)%60:02}.{int(round((t%1)*1000)):03}'
        (DEST/f'{key}.vtt').write_text(f'WEBVTT\n\n{vtt(0)} --> {vtt(e["intro"])}\n{e["question"]}\n\n{vtt(e["intro"])} --> {vtt(e["intro"]+e["seconds"])}\n{e["boundary"]}\n\n{vtt(e["intro"]+e["seconds"])} --> {vtt(e["duration"])}\n{e["finding"]}\n',encoding='utf-8')
        info=json.loads((WORK/f'{key}-source.json').read_text(encoding='utf-8'))
        records.append({**e,'sourcePage':REPORTS[key],'sourceTitle':info['response']['title'],'sourceSha256':hashlib.sha256((WORK/f'{key}.mp4').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256((DEST/f'{key}.mp4').read_bytes()).hexdigest(),'captionType':'课程观察提示，非原报道完整转写','rights':'原报道版权归原权利人，课堂短节选；课程自编提问及剪辑。'})
        print('Rendered',key,flush=True)
    for source,second,name in [('smart',66,'qingdao-control'),('green',106,'electric-trucks')]:
        run(['-ss',second,'-i',WORK/f'{source}.mp4','-frames:v',1,'-q:v',2,DEST/f'{name}.jpg'])
    stills=[{'file':name+'.jpg','sourcePage':REPORTS[source],'sourceSecond':second,'sha256':hashlib.sha256((DEST/f'{name}.jpg').read_bytes()).hexdigest()} for source,second,name in [('smart',66,'qingdao-control'),('green',106,'electric-trucks')]]
    (DEST/'stills.json').write_text(json.dumps(stills,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (DEST/'edl.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    cards=''.join(f'<article><h2>第{e["lesson"]}讲 · {e["title"]}</h2><video controls preload="metadata" poster="{e["id"]}.jpg" src="{e["id"]}.mp4"></video><p>{e["question"]}</p><p><a href="{e["sourcePage"]}">{e["sourceTitle"]}</a> · {e["date"]}；原片{e["start"]}—{e["start"]+e["seconds"]}秒，剪辑{e["duration"]}秒。</p><p>{e["boundary"]}</p><a href="{e["id"]}.mp4" download>下载片头</a></article>' for e in records)
    (DEST/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第15—16讲片头</title><style>body{background:#f6f2e7;color:#153f50;font:18px/1.7 "Microsoft YaHei",sans-serif;margin:35px auto;padding:20px;max-width:1100px}video{width:100%;aspect-ratio:1.6;background:#103444}article{margin:40px 0}a{color:#246c76}</style><h1>港口管理概论 · 第15—16讲片头</h1>'+cards+'<p><a href="edl.json">剪辑与校验记录</a></p></html>',encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['acquire','render']);args=parser.parse_args()
    {'acquire':acquire,'render':render}[args.mode]()
