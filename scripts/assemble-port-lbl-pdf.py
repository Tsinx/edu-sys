from pathlib import Path
import json, hashlib
from pypdf import PdfReader, PdfWriter

root=Path('output/port-lbl-qa/pdf-pages')
output=Path('output/pdf')
output.mkdir(parents=True,exist_ok=True)
metadata=json.loads((root/'page-metadata.json').read_text(encoding='utf-8'))
assert len(metadata)==106
checks=[]
for lesson,start,end,label in [(2,0,52,'第二讲'),(3,52,106,'第三讲')]:
    writer=PdfWriter()
    for index in range(start,end):
        reader=PdfReader(root/f'page-{index+1:03d}.pdf')
        assert len(reader.pages)==1,(index,len(reader.pages))
        page=reader.pages[0]
        assert abs(float(page.mediabox.width)/float(page.mediabox.height)-1.6)<.001
        text=page.extract_text()
        assert len(text)>45,(index,text)
        assert '教师动画控制' not in text
        assert 'teachingCue' not in text
        writer.add_page(page)
        writer.add_outline_item(f'{index-start+1:02d} {metadata[index]["title"]}',index-start)
    writer.add_metadata({'/Title':f'港口管理概论·{label}·LBL','/Author':'港口管理课程','/Subject':'独立编排的课堂课件静态备份；路线非实时AIS'})
    writer.compress_identical_objects(remove_duplicates=True,remove_unreferenced=True)
    name=output/f'港口管理-{label}-LBL-v3-{end-start}页.pdf'
    with name.open('wb') as file:writer.write(file)
    final=PdfReader(name)
    checks.append({'lesson':lesson,'path':str(name),'pages':len(final.pages),'bookmarks':len(final.outline),'textCharacters':sum(len(page.extract_text()) for page in final.pages),'bytes':name.stat().st_size,'sha256':hashlib.sha256(name.read_bytes()).hexdigest()})
(output/'port-lbl-pdf-check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=True,indent=2))
