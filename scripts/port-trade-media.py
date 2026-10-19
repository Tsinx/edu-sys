"""Source-backed classroom excerpts. Keep original reports in ignored output, export brief annotated cuts."""
import argparse, hashlib, json, re, subprocess, urllib.request, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'output/port-trade-media'
WORK.mkdir(parents=True, exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8')
REPORTS = {
    'customs': 'https://tv.cctv.com/2025/08/25/VIDEp4ty3Zzsiews5VaCoCkG250825.shtml',
    'inspection': 'https://tv.cctv.com/2026/07/31/VIDEdkKqJxZxKuXWcON3Lirk260731.shtml',
    'guoyuan': 'https://tv.cctv.com/2023/03/16/VIDEE8NoWdAPxzAoyF22kdjX230316.shtml',
    'repair': 'https://tv.cctv.com/2025/01/13/VIDECzlehKsiZEUZ2CSU1TRk250113.shtml',
    'bonded': 'https://tv.cctv.com/2026/04/28/VIDE8cw5Bndsp3cVdYehjWkA260428.shtml',
}

def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://tv.cctv.com/'})
    return urllib.request.urlopen(request, timeout=45).read()

def discover():
    results = []
    for key, url in REPORTS.items():
        html = get(url).decode('utf-8')
        guid = re.search(r'var\s+guid\s*=\s*[\'"]([a-f0-9]{32})', html).group(1)
        api = f'https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid={guid}'
        data = json.loads(get(api))
        (WORK / f'{key}-source.json').write_text(json.dumps({'page': url, 'api': api, 'response': data}, ensure_ascii=False, indent=2), encoding='utf-8')
        results.append({'id': key, 'title': data.get('title'), 'duration': data.get('video', {}).get('totalLength'), 'video': data.get('video')})
    print(json.dumps(results, ensure_ascii=False, indent=2))

def download():
    for key in REPORTS:
        info = json.loads((WORK / f'{key}-source.json').read_text(encoding='utf-8'))
        video = info['response']['video']
        chapters = video.get('chapters4') or video.get('chapters3') or video.get('chapters2') or video.get('chapters')
        urls = [x['url'].replace('http://', 'https://') for x in chapters if x.get('url')]
        target = WORK / f'{key}.mp4'
        if not target.exists():
            if not urls:
                hls = info['response']['hls_url'].replace('http://', 'https://')
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', hls, '-c', 'copy', str(target)], check=True)
            elif len(urls) == 1:
                target.write_bytes(get(urls[0]))
            else:
                files = []
                for i, url in enumerate(urls):
                    part = WORK / f'{key}-{i}.mp4'
                    part.write_bytes(get(url)); files.append(part)
                concat = WORK / f'{key}-concat.txt'
                concat.write_text(''.join(f"file '{p.as_posix()}'\n" for p in files), encoding='utf-8')
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', str(target)], check=True)
        print(key, target.stat().st_size, hashlib.sha256(target.read_bytes()).hexdigest())

EDITS = [
 {'id':'customs','source':'inspection','start':18,'seconds':30,'intro':4,'outro':6,'duration':40,'title':'海关手续：查验安排怎样改变？','question':'观察货物特点、查验地点和仍需满足的条件','finding':'便利化改变办理方式，适用条件仍需逐项核实','date':'2026-07-31','caption':'高新技术货物查验案例，不是全部货物的通用流程'},
 {'id':'bonded','source':'bonded','start':30,'seconds':20,'intro':6,'outro':6,'duration':32,'title':'全国综保区：规模之外看功能','question':'记录报道期间、统计对象与指标，再讨论能否外推','finding':'进出口总值不等于利润，也不能证明每区同样增长','date':'2026-04-28','caption':'2026年一季度全国口径；不作为单区排名或利润数据'},
 {'id':'guoyuan','source':'guoyuan','start':230,'seconds':35,'intro':4,'outro':6,'duration':45,'title':'重庆果园港：水铁公怎样连接？','question':'追踪港口、铁路和外部通道之间的接续','finding':'区位联系需要服务组织；整座港区不等于综保区围网','date':'2023-03-16','caption':'2023年历史影像；片中班次与数量不是2026年现值'},
 {'id':'repair','source':'repair','start':100,'seconds':30,'intro':4,'outro':6,'duration':40,'title':'航空保税维修：客户购买什么？','question':'识别技术、航材、场地和交付能力怎样形成服务','finding':'海南业务案例；适用政策与专业条件须分别核实','date':'2025-01-13','caption':'原报道地点为海南，不是重庆现场或通用政策'},
]

def run(args):
    subprocess.run(['ffmpeg','-v','error','-y',*map(str,args)], check=True)

def ass_time(t):
    return f'{int(t)//3600}:{int(t)//60%60:02}:{int(t)%60:02}.{int(round(t%1*100)):02}'

def render():
    dest=ROOT/'apps/teacher-web/public/course-assets/port-management/trade-media'; dest.mkdir(parents=True,exist_ok=True)
    font=Path('C:/Windows/Fonts/msyh.ttc'); bold=Path('C:/Windows/Fonts/msyhbd.ttc')
    def text(draw,xy,s,size=32,fill='#ebeadc',strong=False):
        draw.text(xy,s,font=ImageFont.truetype(str(bold if strong else font),size),fill=fill)
    manifests=[]
    for edit in EDITS:
        key=edit['id']; work=WORK/key;work.mkdir(exist_ok=True)
        for name,heading,body in [('intro',edit['title'],edit['question']),('outro','回到这票货物的决定',edit['finding'])]:
            im=Image.new('RGB',(1280,800),'#103444');d=ImageDraw.Draw(im)
            d.line((78,155,1202,155),fill='#4f7978',width=2);text(d,(78,85),'港口观察 / 13' if key=='customs' else '港口观察 / 14',26,fill='#bda36e')
            # Intentional line breaks keep every title at a readable size.
            title_lines=[heading] if len(heading)<=19 else [heading[:12],heading[12:]]
            for i,line in enumerate(title_lines):text(d,(72,250+i*83),line,54,strong=True)
            for i,line in enumerate([body[j:j+29] for j in range(0,len(body),29)]):text(d,(78,465+i*54),line,32,fill='#cfdbcf')
            text(d,(78,677),f'央视网原报道节选 · {edit["date"]}',23,fill='#9bb8af')
            text(d,(78,720),'课程提问与剪辑 / 港口管理概论',22,fill='#9bb8af')
            im.save(work/f'{name}.png')
            dur=edit[name]
            run(['-loop','1','-i',work/f'{name}.png','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',dur,'-r',25,'-c:v','libx264','-threads',2,'-preset','fast','-crf',21,'-pix_fmt','yuv420p','-c:a','aac','-ar',48000,'-ac',2,'-video_track_timescale',12800,work/f'{name}.mp4'])
        # Native report remains intact and uncropped in the 16:10 teaching canvas.
        ass='[Script Info]\nScriptType: v4.00+\nPlayResX:1280\nPlayResY:800\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Info,Microsoft YaHei,21,&H00E9EEE4,&H00FFFFFF,&H00103444,&H00103444,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'
        ass+=f'Dialogue: 0,0:00:00.00,{ass_time(edit["seconds"])},Info,,0,0,0,,{{\\pos(26,8)}}新闻节选 / {edit["date"]} · 原台标、原声保留\n'
        ass+=f'Dialogue: 0,0:00:00.00,{ass_time(edit["seconds"])},Info,,0,0,0,,{{\\pos(26,768)}}{edit["caption"]}\n'
        (work/'source.ass').write_text(ass,encoding='utf-8-sig')
        # Run from the cut directory so libass receives a simple relative path on Windows.
        command=['ffmpeg','-v','error','-y','-ss',str(edit['start']),'-i',str(WORK/f'{edit["source"]}.mp4'),'-t',str(edit['seconds']),'-vf','scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0x103444,subtitles=source.ass','-af',f'afade=t=in:d=0.12,afade=t=out:st={edit["seconds"]-.18}:d=0.18','-r','25','-c:v','libx264','-threads','2','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-ar','48000','-ac','2','-video_track_timescale','12800','cut.mp4']
        subprocess.run(command,cwd=work,check=True)
        (work/'concat.txt').write_text("file 'intro.mp4'\nfile 'cut.mp4'\nfile 'outro.mp4'\n",encoding='utf-8')
        run(['-f','concat','-safe',0,'-i',work/'concat.txt','-c','copy','-movflags','+faststart',dest/f'{key}.mp4'])
        # Cover shows a native frame, not an invented illustration of a real location.
        run(['-ss',edit['intro']+min(10,edit['seconds']/2),'-i',dest/f'{key}.mp4','-frames:v',1,'-q:v',2,dest/f'{key}.jpg'])
        def vtt(t):return f'{int(t)//3600:02}:{int(t)//60%60:02}:{int(t)%60:02}.000'
        captions=f'WEBVTT\n\n{vtt(0)} --> {vtt(edit["intro"])}\n{edit["title"]}。{edit["question"]}\n\n{vtt(edit["intro"])} --> {vtt(edit["intro"]+edit["seconds"])}\n新闻观察：{edit["caption"]}\n\n{vtt(edit["intro"]+edit["seconds"])} --> {vtt(edit["duration"])}\n{edit["finding"]}\n'
        (dest/f'{key}.vtt').write_text(captions,encoding='utf-8')
        info=json.loads((WORK/f'{edit["source"]}-source.json').read_text(encoding='utf-8'))
        record={**edit,'sourcePage':REPORTS[edit['source']],'sourceTitle':info['response']['title'],'sourceSha256':hashlib.sha256((WORK/f'{edit["source"]}.mp4').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256((dest/f'{key}.mp4').read_bytes()).hexdigest(),'captionType':'课程观察字幕，非原报道完整逐字转写','rights':'原报道版权归原权利人；片头、片尾与教学观察文字为本课程编写。'}
        manifests.append(record);print('Rendered',key,edit['duration'],flush=True)
    (dest/'edl.json').write_text(json.dumps(manifests,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    cards=''.join(f'<article><h2>{e["title"]}</h2><video controls preload="metadata" poster="{e["id"]}.jpg" src="{e["id"]}.mp4"><track kind="captions" src="{e["id"]}.vtt" srclang="zh" label="中文观察字幕"></video><p>{e["question"]}</p><p>原报道：<a href="{e["sourcePage"]}">{e["sourceTitle"]}</a> · {e["date"]}</p><p>原片 {e["start"]}—{e["start"]+e["seconds"]}秒；课堂剪辑{e["duration"]}秒。{e["captionType"]}。</p><a href="{e["id"]}.mp4" download>下载本段MP4</a></article>' for e in manifests)
    html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>港口管理概论 · 通关与保税业务视频</title><style>body{margin:0;background:#f2efdf;color:#194454;font:18px/1.7 "Microsoft YaHei",sans-serif}main{max-width:1100px;margin:40px auto;padding:24px}h1{font-size:32px}article{margin:50px 0;padding-bottom:35px;border-bottom:1px solid #9db5a5}video{width:100%;aspect-ratio:1.6;background:#103444}a{color:#236f7c}p{overflow-wrap:anywhere}</style><main><h1>港口管理概论 · 通关与保税业务视频</h1><p>第13讲1段，第14讲3段。新闻保持原时点与案例地点；课程观察字幕用于提示分析问题，不是原报道的完整转写。</p>'+cards+'<p><a href="edl.json">剪辑范围、来源与文件校验记录</a></p></main></html>'
    (dest/'index.html').write_text(html,encoding='utf-8')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('mode', choices=['discover', 'download','render'])
    args = parser.parse_args()
    {'discover':discover,'download':download,'render':render}[args.mode]()
