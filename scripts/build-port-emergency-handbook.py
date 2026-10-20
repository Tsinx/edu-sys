"""Build the ten-page student handbook from the same authored source as its HTML edition."""
import json, shutil, hashlib
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph,Table,TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
ROOT=Path(__file__).resolve().parents[1]
book=json.loads((ROOT/'output/port-emergency/handbook.json').read_text(encoding='utf-8'))
for name,file in [('YaHei','msyh.ttc'),('YaHeiBold','msyhbd.ttc')]:pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file,subfontIndex=0))
pdfmetrics.registerFontFamily('YaHei',normal='YaHei',bold='YaHeiBold')
styles={
 'title':ParagraphStyle('title',fontName='YaHeiBold',fontSize=23,leading=33,textColor=HexColor('#153f50')),
 'intro':ParagraphStyle('intro',fontName='YaHei',fontSize=11,leading=19,textColor=HexColor('#607c71')),
 'h3':ParagraphStyle('h3',fontName='YaHeiBold',fontSize=12,leading=20,textColor=HexColor('#236b73')),
 'body':ParagraphStyle('body',fontName='YaHei',fontSize=10.2,leading=17,textColor=HexColor('#294f55'),wordWrap='CJK'),
 'note':ParagraphStyle('note',fontName='YaHei',fontSize=9.4,leading=16,textColor=HexColor('#89703f'),wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName='YaHei',fontSize=9.3,leading=15,textColor=HexColor('#294f55'),wordWrap='CJK'),
 'th':ParagraphStyle('th',fontName='YaHeiBold',fontSize=9.2,leading=15,textColor=HexColor('#fff6e1'),wordWrap='CJK'),
}
out=ROOT/'output/pdf/port-emergency-student-handbook.pdf';out.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(out),pagesize=A4);c.setTitle(book['title']+' - '+book['subtitle']);c.setAuthor('港口管理概论课程')
w,h=A4;left=47;content=w-left*2;bottoms=[]
for i,page in enumerate(book['chapters']):
 c.setFillColor(HexColor('#f9f7ee'));c.rect(0,0,w,h,stroke=0,fill=1)
 c.setFillColor(HexColor('#1f6973'));c.rect(left,h-50,content,3,stroke=0,fill=1)
 c.setFont('YaHei',8.5);c.setFillColor(HexColor('#758777'));c.drawString(left,h-38,'港口管理概论 / 第12讲 / 学生应急手册');c.drawRightString(w-left,h-38,book['version'])
 y=h-81
 def put(text,kind='body',gap=8):
  global y
  p=Paragraph(escape(text).replace('\n','<br/>'),styles[kind]);pw,ph=p.wrap(content,1000);p.drawOn(c,left,y-ph);y-=ph+gap
 put(page['kicker'],'note',6);put(page['title'],'title',13);put(page['intro'],'intro',14)
 for block in page['blocks']:
  put(block['heading'],'h3',7)
  if block.get('body'):put(block['body'])
  for j,s in enumerate(block.get('steps',[])):put(f'{j+1}.  {s}',gap=7)
  if block.get('table'):
   rows=block['table'];cols=len(rows[0]);widths=[content*.25]+[content*.75/(cols-1)]*(cols-1)
   data=[[Paragraph(escape(s),styles['th' if n==0 else 'cell']) for s in row] for n,row in enumerate(rows)]
   t=Table(data,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor('#214f5b')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[HexColor('#edf1e5'),HexColor('#f9f8ef')]),('LINEBELOW',(0,0),(-1,-1),.4,HexColor('#c4d1bd'))]));tw,th=t.wrap(content,1000);t.drawOn(c,left,y-th);y-=th+12
  if block.get('note'):put(block['note'],'note',11)
 if i==9:
  for j,s in enumerate(book['sources']):
   p=Paragraph(f'<link href="{escape(s["url"])}" color="#236b73">[{j+1}] {escape(s["label"])}</link>',styles['note']);pw,ph=p.wrap(content,1000);p.drawOn(c,left,y-ph);y-=ph+6
 if y<51:raise RuntimeError(f'Chapter {i+1} overflows: bottom {y}')
 bottoms.append(round(y,1));c.setStrokeColor(HexColor('#bfcdba'));c.line(left,40,w-left,40);c.setFont('YaHei',8);c.setFillColor(HexColor('#718476'));c.drawString(left,25,'教学情境 / 真实险情执行现场预案与授权指挥');c.drawRightString(w-left,25,f'{i+1:02d} / {len(book["chapters"]):02d}');c.bookmarkPage(page['id']);c.addOutlineEntry(page['title'],page['id']);c.showPage()
c.save();target=ROOT/'apps/teacher-web/public/handouts/port-emergency'/out.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(out,target)
print(json.dumps({'pages':len(book['chapters']),'pageBottoms':bottoms,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
