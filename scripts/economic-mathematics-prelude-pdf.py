"""Vector preparation PDF. Same authored pages, all reveals, notes outside 1600x1000 canvas.

Uses PyMuPDF and the bundled OFL fonts; no external browser process or web service.
"""
import json, math
from pathlib import Path
import fitz
from fontTools.ttLib import TTFont

BASE = Path('apps/teacher-web/public/course-assets/economic-mathematics/prelude')
OUT = Path('output/economic-mathematics/prelude-v1')
data = json.loads((OUT / 'pdf-content.json').read_text(encoding='utf-8'))
font_files = {}
for name in ['sans', 'serif']:
    font_files[name] = Path('tmp/economic-prelude-fonts') / (name + '-static.ttf')
fonts = {k: fitz.Font(fontfile=str(p)) for k, p in font_files.items()}
doc = fitz.open()
INK = '#102c35'; PAPER = '#f1ede3'; TEAL = '#347f76'; ORANGE = '#c5613d'
def color(h):
    return tuple(int(h[i:i+2], 16) / 255 for i in (1, 3, 5))

def rect(x, y, w, h, fill, stroke=None, width=1):
    page.draw_rect(fitz.Rect(x,y,x+w,y+h), color=color(stroke) if stroke else None, fill=color(fill) if fill else None, width=width)

def line(points, stroke=TEAL, width=2):
    shape=page.new_shape()
    shape.draw_polyline(points)
    shape.finish(color=color(stroke),width=width,closePath=False)
    shape.commit()

def dot(x,y,r=10,fill=ORANGE):
    page.draw_circle((x,y),r,color=None,fill=color(fill))

def text(s, x, y, width, size=34, face='sans', fill=INK, leading=1.5):
    """Top-aligned text, preserving authored breaks and wrapping CJK at character boundaries."""
    start=y
    for para in str(s).split('\n'):
        current=''
        for ch in para:
            candidate=current+ch
            if current and fonts[face].text_length(candidate,fontsize=size)>width:
                page.insert_text((x,y+size),current,fontname=face,fontsize=size,color=color(fill))
                y+=size*leading;current=ch
            else: current=candidate
        if current: page.insert_text((x,y+size),current,fontname=face,fontsize=size,color=color(fill))
        y+=size*leading
    checks.append({'page':index+1,'text':s,'x':x,'top':start,'bottom':y,'right':x+width})
    return y

def art(kind,x=895,y=300,w=590,h=555):
    def xy(a,b): return (x+a/650*w,y+b/600*h)
    def path(points, stroke=TEAL,width=2): line([xy(a,b) for a,b in points],stroke,width)
    def point(a,b,r=10,fill=ORANGE): xx,yy=xy(a,b);dot(xx,yy,r*w/650,fill)
    if kind in ['orbit','loop','network','rays']:
        for k in range(12):
            theta=k*math.pi/12
            points=[]
            for n in range(121):
                a=n/120*math.tau;rx=240-k*13;ry=220-k*9
                points.append((325+rx*math.cos(a)*math.cos(theta)-ry*math.sin(a)*math.sin(theta),300+rx*math.cos(a)*math.sin(theta)+ry*math.sin(a)*math.cos(theta)))
            path(points,'#80b9aa' if k%3 else TEAL,1.7)
        point(480,155,25);point(325,300,12)
    elif kind in ['allocation','steps','ninety-nine']:
        for i in range(100):
            xx,yy=xy(80+i%10*47,66+i//10*47)
            fill='#548f88' if kind=='ninety-nine' and i<99 else '#e2ccbb' if kind=='ninety-nine' else '#54a59a' if i<64 else '#d6b79b'
            rect(xx,yy,39*w/650,39*h/600,fill)
    elif kind=='contour':
        for level in range(160,651,35):
            points=[]
            for i in range(251):
                u=i*.4;r=(level-40*math.sqrt(u))/30;v=r*r
                if r>=0 and v<=100:points.append((55+u*5.4,540-v*4.8))
            if len(points)>1:path(points,'#72ab9e',2)
        point(400,280,17)
    elif kind=='area':
        for i in range(24):
            u=i/24*8;height=(120+24*u-3*u*u)*1.5
            xx,yy=xy(66+i*21.5,490-height);rect(xx,yy,20*w/650,height*h/600,'#71b2a6' if i%4 else TEAL)
        path([(55,490),(608,490)],'#96b0a8')
    else:
        path([(65,90),(65,500),(603,500)],'#96b0a8')
        if kind=='family':
            for k in range(-2,3):
                path([(80+i*5,480-.0013*(10+i*5)**2+k*37) for i in range(101)],ORANGE if k==0 else '#78aaa0')
        elif kind=='limit':
            fun=lambda a:480-320*(1-math.exp(-(a-70)/210))
            path([(80+i*5,fun(80+i*5)) for i in range(101)])
            for a in [100,200,300,370,410,428]:point(a,fun(a),8)
            page.draw_circle(xy(450,fun(450)),12*w/650,color=color(ORANGE),fill=color(PAPER),width=3)
        else:
            fun=lambda a:480-.0013*(a-70)**2
            path([(80+i*5,fun(80+i*5)) for i in range(101)],TEAL,4)
            if kind in ['derivative','marginal']:
                slope=-.0026*(340-70);path([(180,fun(340)+slope*(180-340)),(550,fun(340)+slope*(550-340))],ORANGE,3);point(340,fun(340))
            else:
                for a in [165,400,539]:point(a,fun(a))

checks=[]
for index,p in enumerate(data['pages']):
    page=doc.new_page(width=1600,height=1250)
    for name,f in font_files.items():page.insert_font(fontname=name,fontfile=str(f))
    special=p.get('special',False); bg='#173c43' if special else PAPER; fg=PAPER if special else INK; secondary='#afd6c8' if special else '#487870'
    rect(0,0,1600,1000,bg)
    if p['layout']=='film':
        page.insert_image(fitz.Rect(0,0,1600,1000),filename=str(BASE/'poster.png'))
    else:
        if special:
            sh=page.new_shape();sh.draw_polyline([(1510,0),(1600,0),(1600,1000),(1320,1000)]);sh.finish(fill=color('#a4472e'),color=None,closePath=True);sh.commit()
        text('经济数学 / 第1讲',82,38,650,23,fill=secondary)
        text(p['section'],1235,38,283,23,fill=secondary)
        line([(82,87),(1518,87)],'#9bb6a9',1)
        layout=p['layout']; y=125
        hero=layout in ['hero','teacher']; title_size=102 if layout=='hero' else 146 if layout=='teacher' else 80 if layout=='question' else 72
        if hero:y=190
        title_width=870 if hero else 830 if p.get('visual') else 1415
        bottom=text(p['title'],88,y,title_width,title_size,'serif',fg,1.22)
        if p.get('subtitle'):bottom=text(p['subtitle'],88,bottom+20,1380 if not p.get('visual') else 850,31,fill=secondary,leading=1.5)
        y=bottom+42
        if p.get('visual'):art(p['visual'],x=890 if not hero else 850,y=270 if not hero else 155,w=620 if not hero else 730,h=590 if not hero else 680)
        if layout=='map':
            for i,u in enumerate(data['units']):
                x=88+i%4*362;yy=330+i//4*263
                line([(x,yy),(x+325,yy)],TEAL,4);text(f"{u['n']:02}",x,yy+15,100,52,fill=ORANGE)
                text(u['title'],x,yy+92,340,32);text(f"{u['hours']}学时 · 第{u['lessons']}讲",x,yy+155,340,24,fill=TEAL)
        if p.get('unit'):
            u=data['units'][p['unit']-1];text(f"{u['n']:02} / {u['hours']}学时 / 第{u['lessons']}讲",88,y,760,25,fill=ORANGE);y+=95
        if p.get('lines'):
            if layout in ['numbers','assessment']:lineY=785
            else:lineY=y+30 if hero else y
            for l in p['lines']:lineY=text(l,88,lineY,755 if p.get('visual') else 1415,52 if layout=='teacher' else 34,'serif' if layout=='teacher' else 'sans',fg,1.65)+9
            if layout not in ['numbers','assessment']:y=lineY
        if p.get('items'):
            count=len(p['items']);w=1424/count; itemY=330 if layout in ['numbers','assessment','four'] else max(340,y)
            for i,(h,b) in enumerate(p['items']):
                x=88+i*w
                if layout=='four':art(['orbit','function','area','contour'][i],x,itemY,w-25,260);text(h,x+65,635,w-55,58,'serif');text(b,x+10,730,w-24,29)
                elif layout in ['numbers','assessment']:
                    line([(x,itemY),(x,itemY+280)],'#b0c2b6',2);text(h,x+25,itemY+20,w-35,110,'serif',TEAL);text(b,x+25,itemY+190,w-35,31)
                elif layout=='book':
                    rect(x,itemY,7,315,TEAL);text(h,x+33,itemY,w-50,43,fill=ORANGE);text(b,x+33,itemY+85,w-50,32,leading=1.9)
                else:
                    text(f'{i+1:02}',x,itemY,w-35,52,fill=ORANGE);line([(x,itemY+87),(x+w-50,itemY+87)],'#9db5a6',2);text(h,x,itemY+110,w-40,37,fill=fg);text(b,x,itemY+185,w-40,29,fill=fg,leading=1.65)
            y=itemY+340
        if p.get('rows'):
            colx=[88,428,790,1150];top=max(y,340)
            for i,c in enumerate(p['columns']):text(c,colx[i],top,330,32,fill=TEAL)
            line([(88,top+68),(1512,top+68)],TEAL,2)
            for r,row in enumerate(p['rows']):
                for i,c in enumerate(row):text(c,colx[i],top+99+r*112,340,34,fill=fg)
                line([(88,top+186+r*112),(1512,top+186+r*112)],'#afc2b6',1)
            y=top+333
        if p.get('options'):
            for i,v in enumerate(p['options']):
                x=88+i*355;line([(x,y+25),(x+325,y+25)],TEAL,3);text(f'{chr(65+i)}  {v}',x,y+55,345,36,fill=fg)
        if p.get('reveals'):
            yy=max(y+25,410 if layout=='derivation' else 0)
            for r in p['reveals']:
                size=35 if layout=='derivation' else 31
                rect(88,yy+8,5,36,ORANGE);yy=text(r,112,yy,1300 if not p.get('visual') else 760,size,fill=fg,leading=1.55)+18
            if p.get('conclusion'):text(p['conclusion'],112,yy+8,1300,29,fill=TEAL)
        text(p.get('source','经济数学 · 2026'),82,942,1320,20,fill=secondary);text(f'{index+1:02} / 40',1430,942,120,20,fill=secondary)
    rect(0,1000,1600,250,'#ffffff')
    n=data['notes'][index]
    text(f'教师备课 · 第{index+1}页 · {n[0]}秒 · {n[1]}',80,1019,1440,24,fill=ORANGE)
    yy=text(n[2],80,1060,1440,23,leading=1.5)
    text('答案与边界：'+n[3],80,yy+8,1440,22,fill='#48666b',leading=1.5)

doc.set_metadata({'title':'经济数学第1讲 · 完整答案与逐页备课讲稿','author':'李行之','subject':'40页 / 45分钟 / 原创几何动态艺术开场','keywords':'经济数学,序章,教师备课'})
dest=Path('output/pdf/economic-mathematics-prelude-teacher.pdf');dest.parent.mkdir(parents=True,exist_ok=True)
doc.subset_fonts();doc.save(dest,garbage=4,deflate=True);doc.close()
failures=[r for r in checks if r['bottom']>1240 or (r['top']<930 and r['bottom']>930)]
(OUT/'pdf-text-bounds.json').write_text(json.dumps({'pages':40,'issues':failures},ensure_ascii=False,indent=2),encoding='utf-8')
print(dest,'40 pages; text-bound issues:',len(failures))
