"""Publish the two revised public worksheets and separate private guidance.

Input is the authoritative ranked-practice export. Portal entries are generated
from the same question objects, with only mathematical typography adapted.
"""
from pathlib import Path
import hashlib
import html
import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Flowable

root=Path(__file__).resolve().parents[1]
data=Path(sys.argv[1])
out=Path(sys.argv[2])
out.mkdir(parents=True,exist_ok=True)
packs=[p for p in json.loads((data/'private-packs.json').read_text(encoding='utf8')) if p['lesson'] in [4,5]]
schedules=[p for p in json.loads((data/'teaching-schedules.json').read_text(encoding='utf8')) if p['lesson'] in [4,5]]
sup=str.maketrans('0123456789-+','⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺')

def plain(value):
    text=value.replace('$','').replace('\\u2032','′').replace('\\,',' ').replace('\\;',' ').replace('\\!','')
    for a,b in [('\\times','×'),('\\cdot','×'),('\\ln','ln'),('\\approx','≈'),('\\ne','≠'),('\\le','≤'),('\\ge','≥'),('\\quad',' '),('\\to','→'),('\\infty','∞')]:
        text=text.replace(a,b)
    text=re.sub(r'\\sqrt\{([^{}]+)\}',r'√(\1)',text)
    text=re.sub(r'\\sqrt\s*([0-9a-zA-Z])',r'√\1',text)
    text=re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}',r'(\1)/(\2)',text)
    text=re.sub(r'\\frac\s*([0-9a-zA-Z])\s*([0-9a-zA-Z])',r'\1/\2',text)
    def power(m):
        exponent=m.group(1).strip('{}')
        return exponent.translate(sup) if exponent in {'1','2','3'} else '^('+exponent+')'
    text=re.sub(r'\^(\{[^{}]+\}|-?\d+|[a-zA-Z])',power,text)
    text=text.replace('{','').replace('}','')
    if '\\' in text:
        raise ValueError('Unconverted mathematical notation: '+text)
    return text

def source(q):
    s=q['source']
    return f"Jacques 9e, §{s['section']}, {s['selection']}, {s['subpart']}; printed p. {s['printedPage']} / PDF p. {s['pdfPage']}."

ranks={1:'Foundation',2:'Core',3:'Application',4:'Challenge (optional)'}
instructions='You have 20 minutes. Choose ONE answer (A-D) per question. All ten questions are available together. Work at your own pace; Rank 4 is optional. You may revise your choices before the deadline. Saved choices will be submitted automatically when time expires.'
portal=[]
for p in packs:
    entry=dict(lesson=p['lesson'],title=f"Lecture {p['lesson']}: "+('Growth, Powers & Logs (20 min)' if p['lesson']==4 else 'Rates & Derivatives (20 min)'),group=f"Lecture {p['lesson']} Practice",version=p['version'],durationMinutes=20,questions=[])
    for i,q in enumerate(p['questions']):
        stem=(instructions+'\n\n' if i==0 else '')+f"[{ranks[q['rank']]}]\n"+plain(q['stem'])+'\n\nSource: '+source(q)
        analysis=plain(q['solution'])+'\n\n'+ '\n'.join(f"{k}: {plain(q['optionExplanations'][k])}" for k in 'ABCD')+'\n\nAdaptation: '+q['source']['wordingAdaptation']+' '+q['source']['optionAdaptation']
        entry['questions'].append(dict(id=q['id'],version=q['version'],rank=q['rank'],stem=stem,options=[plain(o['text']) for o in q['options']],answer=q['correctOptionId'],analysis=analysis))
    portal.append(entry)
(out/'portal-entries.json').write_text(json.dumps(portal,ensure_ascii=False,indent=2),encoding='utf8')

pdfmetrics.registerFont(TTFont('Course',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('CourseBold',r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Chinese',r'C:\Windows\Fonts\simhei.ttf'))
blue=colors.HexColor('#2357d8')
ink=colors.HexColor('#18232c')
style=ParagraphStyle('body',fontName='Course',fontSize=10.5,leading=14,textColor=ink,spaceAfter=6)
small=ParagraphStyle('source',parent=style,fontSize=7.5,leading=10,textColor=colors.HexColor('#56616c'),spaceBefore=5)
heading=ParagraphStyle('heading',parent=style,fontName='CourseBold',fontSize=12,leading=16,textColor=blue,spaceBefore=10)
title=ParagraphStyle('title',parent=heading,fontSize=18,leading=23,spaceAfter=12)
zh=ParagraphStyle('zh',parent=style,fontName='Chinese',fontSize=10.5,leading=17)

def para(text,kind=style):
    return Paragraph(html.escape(text).replace('\n','<br/>'),kind)

class Graph(Flowable):
    def __init__(self,spec):
        super().__init__();self.spec=spec;self.width=250;self.height=108
    def draw(self):
        c=self.canv;s=self.spec;x0,x1=s['xMin'],s['xMax'];y0,y1=s['yMin'],s['yMax']
        X=lambda x:24+(x-x0)/(x1-x0)*210
        Y=lambda y:15+(y-y0)/(y1-y0)*80
        c.setStrokeColor(colors.HexColor('#bec8d1'));c.setLineWidth(.5)
        for n in range(5):
            x=x0+(x1-x0)*n/4;y=y0+(y1-y0)*n/4
            c.line(X(x),15,X(x),95);c.line(24,Y(y),234,Y(y))
            c.setFont('Course',6);c.drawCentredString(X(x),5,f'{x:g}');c.drawRightString(20,Y(y)-2,f'{y:g}')
        c.saveState();clip=c.beginPath();clip.rect(24,15,210,80);c.clipPath(clip,stroke=0)
        c.setStrokeColor(blue);c.setLineWidth(1.8);path=c.beginPath()
        for i in range(151):
            x=x0+(x1-x0)*i/150;y=sum(a*x**j for j,a in enumerate(s['coefficients']))
            (path.moveTo if i==0 else path.lineTo)(X(x),Y(y))
        c.drawPath(path);c.restoreState()

def question(q,i,answers=False):
    block=[para(f"Q{i+1} · {ranks[q['rank']]}",heading),para(plain(q['stem']))]
    if q.get('graph'):
        block.extend([Graph(q['graph']),para(q['graph']['caption'],small)])
    block.extend(para(o['id']+'. '+plain(o['text'])) for o in q['options'])
    block.append(para('Source: '+source(q),small))
    if answers:
        block.extend([Spacer(1,8),para('Correct answer: '+q['correctOptionId'],heading),para(plain(q['solution']))])
        block.extend(para(k+': '+plain(q['optionExplanations'][k])) for k in 'ABCD')
        block.append(para('Wording adaptation: '+q['source']['wordingAdaptation']+' Options: '+q['source']['optionAdaptation'],small))
    return block

def make(name,story,label):
    def footer(canvas,doc):
        canvas.setFont('Course',7.5);canvas.setFillColor(colors.HexColor('#56616c'))
        canvas.drawString(44,28,label+' · release 2.0.0 · 2026-10-26')
        canvas.drawRightString(A4[0]-44,28,str(doc.page))
    doc=SimpleDocTemplate(str(out/name),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=34,bottomMargin=45,title=label,author='International Mathematics course')
    doc.build(story,onFirstPage=footer,onLaterPages=footer)

for p in packs:
    story=[]
    for start in range(0,10,2):
        story.extend([para(f"Lecture {p['lesson']} · {p['title']}",title),para('20 minutes · 3 Foundation + 3 Core + 3 Application + 1 optional Challenge. Choose one answer; partial completion is welcome.',small)])
        for i in range(start,start+2):story.append(KeepTogether(question(p['questions'][i],i)))
        if start<8:story.append(PageBreak())
    make(f"lesson-{p['lesson']:02d}-choice-practice.pdf",story,'Student choice worksheet')

teacher=[]
for p in packs:
    for i,q in enumerate(p['questions']):
        if teacher:teacher.append(PageBreak())
        teacher.extend([para(f"TEACHER · Lecture {p['lesson']} · Q{i+1}",title),*question(q,i,True)])
make('teacher-answer-book-04-05.pdf',teacher,'Private teacher answer book')

guides=[]
for index,p in enumerate(schedules):
    if index:guides.append(PageBreak())
    guides.extend([para(f"Lecture {p['lesson']} · Revised teaching schedule",title),para('90 minutes = 45 teaching + 25 teaching + 20 ranked practice'),para('中英文备课：前70分钟讲授，最后20分钟全班同卷。\n学生按个人进度作答；选做题不作为后续学习先修条件。',zh)])
    for b in p['blocks']:
        guides.append(para(f"Teaching block {b['hour']} · {b['duration']} minutes · local pages {b['localStart']}-{b['localEnd']}",heading))
        for segment in b['segments']:
            offset=0 if b['hour']==1 else 45
            guides.append(para(f"{segment['start']+offset}-{segment['end']+offset} min | 页 {segment['localStart']}-{segment['localEnd']} | {segment['cue']}",zh))
        guides.append(para(b['guide']))
    guides.append(para('70-72 min: instructions · 72-86 min: individual choices · 86-90 min: feedback',heading))
    guides.append(para('学习通设置：限时20分钟、结束前可修改、到时自动提交、结束后显示答案。只保存未开始；不以完成数量给学生贴能力标签。',zh))
    guides.append(para('Lecture 4: distinguish continuous crossing from the first whole-week report.' if p['lesson']==4 else 'Lecture 5: use position 7 m, interval average 5 m/s and instantaneous rate 4 m/s to distinguish the three quantities. No power-rule exercises.'))
make('bilingual-teaching-schedules-04-05.pdf',guides,'Private bilingual teaching schedules')

manifest={p.name:dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in out.glob('*.pdf')}
(out/'pdf-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(json.dumps(dict(packs=len(packs),questions=sum(len(p['questions']) for p in packs),pdfs=manifest),ensure_ascii=False))
