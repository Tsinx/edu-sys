"""Check authored slide geometry budgets, media decoding and portable delivery references."""
import json, subprocess, sys, hashlib
from pathlib import Path
from PIL import ImageFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'output/port-trade-media'

def run(args):
    return subprocess.run(args,check=True,capture_output=True,text=True,encoding='utf-8',errors='replace')

def check_media():
    base=ROOT/'apps/teacher-web/public/course-assets/port-management/trade-media'
    edits=json.loads((base/'edl.json').read_text(encoding='utf-8')); results=[]
    for e in edits:
        video=base/(e['id']+'.mp4')
        assert hashlib.sha256(video.read_bytes()).hexdigest()==e['outputSha256']
        probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]).stdout)
        v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
        duration=float(probe['format']['duration'])
        assert (v['width'],v['height'])==(1280,800)
        assert v['codec_name']=='h264' and v['pix_fmt']=='yuv420p' and a['codec_name']=='aac'
        assert abs(duration-e['duration'])<.15,(e['id'],duration)
        run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'])
        sound=run(['ffmpeg','-hide_banner','-i',str(video),'-af','volumedetect','-vn','-sn','-f','null','-']).stderr
        assert 'mean_volume: -inf' not in sound
        frame=WORK/(e['id']+'-final-frame.jpg')
        run(['ffmpeg','-v','error','-y','-ss',str(e['intro']+min(8,e['seconds']/2)),'-i',str(video),'-frames:v','1','-q:v','2',str(frame)])
        results.append({'id':e['id'],'duration':duration,'fullDecode':'pass','audio':'present/non-silent','resolution':[v['width'],v['height']],'frame':str(frame)})
    return results

def lines(text,width,size):
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',size)
    n=1;line=''
    for char in text:
        if font.getlength(line+char)>width:n+=1;line=char
        else:line+=char
    return n

def check_layout():
    spec=json.loads((ROOT/'output/port-trade-delivery/layout-inputs.json').read_text(encoding='utf-8'))
    errors=[]; measures=[]
    for p in spec:
        title_size=62 if p['visual']=='trade-cover' else 49
        if lines(p['title'],1448,title_size)>1:errors.append((p['slideKey'],'title wraps'))
        if lines(p['lead'],1448,28 if p['visual']=='trade-cover' else 26)>1:errors.append((p['slideKey'],'lead wraps'))
        for point in p['points']:
            if lines(point,(1448-56)/3,24)>3:errors.append((p['slideKey'],'observation exceeds 3 lines'))
        rows=p.get('rows',[])
        is_table=p['visual'] in ['records','decision','trade-documents'] or (p['visual']=='trade-flow' and rows and len(rows[0])==4)
        if rows and is_table:
            width=946 if p['visual']=='trade-documents' else 1448;size=25 if p['visual']=='trade-documents' else 26
            columns=len(rows[0]);widths=[width*.25]+[width*.75/(columns-1)]*(columns-1) if columns>1 else [width]
            heights=[max(lines(s,widths[j]-40,size) for j,s in enumerate(row))*size*1.5+(32 if i==0 else 36) for i,row in enumerate(rows)]
            height=sum(heights);measures.append({'key':p['slideKey'],'estimatedTableHeight':height,'budget':510})
            if height>510:errors.append((p['slideKey'],f'table needs {height}px'))
    assert not errors,json.dumps(errors,ensure_ascii=False)
    return {'pages':len(spec),'font':'Microsoft YaHei','headingLeadAndPointBudgets':'pass','tableBudgets':measures,'boundary':'字体与几何预算检查，不替代浏览器排版及操作验收。'}

result={'media':check_media(),'layout':check_layout()}
(WORK/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'videos':len(result['media']),'fullDecode':'pass','layoutPages':result['layout']['pages']},ensure_ascii=False))
