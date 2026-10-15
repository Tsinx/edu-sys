"""Read-only final PDF checks and contact sheets for the two authored lectures."""
import hashlib
import json
from pathlib import Path
import re
import sys
import fitz

root=Path(__file__).resolve().parents[1]
illustrated12='--illustrated12' in sys.argv
illustrated='--illustrated11' in sys.argv
documentary='--documentary' in sys.argv
facilities='--facilities' in sys.argv
lesson=12 if illustrated12 else 11
folder=root/(f'output/pdf/port-facilities-v20-l{lesson}' if facilities else f'output/pdf/port-documentary-v19-l{lesson}' if documentary else 'output/pdf/port-safety-civic-v18' if illustrated12 else 'output/pdf/port-illustrated-v17' if illustrated else 'output/pdf/port-class-labs-v16')
out=root/(f'output/port-facility-repair/pdf-renders-l{lesson}' if facilities else f'output/port-documentary-recut/l{lesson}/pdf-renders' if documentary else 'output/port-twelve-media/pdf-renders' if illustrated12 else 'output/port-eleven-media/pdf-renders' if illustrated else 'output/port-class-lab-qa/pdf-renders')
out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((folder/'manifest.json').read_text(encoding='utf-8-sig'))
report=[]
for entry in manifest['files']:
    path=Path(entry['path'])
    assert hashlib.sha256(path.read_bytes()).hexdigest()==entry['sha256']
    document=fitz.open(path)
    assert len(document)==32
    assert len(document.get_toc())==32
    fonts=set()
    minimum=100000
    issues=[]
    for n,page in enumerate(document):
        text=page.get_text()
        minimum=min(minimum,len(text))
        assert len(text)>70,(entry['lesson'],n,len(text))
        assert not re.search(r'teachingCue|assistantCue|storyBeat|voyageStage|让学生|告诉学生',text)
        assert abs(page.rect.width-1200)<1 and abs(page.rect.height-750)<1
        for font in page.get_fonts():
            fonts.add(font[3])
            assert document.extract_font(font[0])[3]
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines',[]):
                for span in line['spans']:
                    x0,y0,x1,y1=span['bbox']
                    if x0 < -1 or y0 < -1 or x1>1201 or y1>751:
                        issues.append({'page':n+1,'text':span['text'],'bbox':span['bbox']})
        page.get_pixmap(matrix=fitz.Matrix(.6,.6),alpha=False).save(out/f'final-{entry["lesson"]}-{n+1:02}.png')
    assert not issues,issues
    for part in range(2):
        contact=fitz.open()
        sheet=contact.new_page(width=1600,height=1080)
        for i in range(16):
            n=part*16+i
            x=(i%4)*400
            y=(i//4)*270
            sheet.insert_text((x+10,y+16),f'{entry["lesson"]}-{n+1:02}',fontsize=12,color=(.15,.3,.33))
            sheet.insert_image(fitz.Rect(x,y+22,x+400,y+272),stream=document[n].get_pixmap(matrix=fitz.Matrix(.35,.35),alpha=False).tobytes('png'))
        sheet.get_pixmap(alpha=False).save(out/f'contact-{entry["lesson"]}-{part+1}.png')
        contact.close()
    report.append({'lesson':entry['lesson'],'pages':32,'minimumTextCharacters':minimum,'embeddedFonts':sorted(fonts),'bookmarks':32,'textOutsidePage':issues,'sha256':entry['sha256']})
    document.close()
(out.parent/'pdf-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
