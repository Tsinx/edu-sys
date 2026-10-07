import json,subprocess
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
ROOT=Path(__file__).resolve().parents[1]/'output/international-mathematics/v2'
qa=ROOT/'qa';samples=[];issues=[];results=[]
poppler=Path('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
for name in ['course-syllabus-and-textbook-map','english-exercise-workbook','detailed-answer-book','teacher-manual-bilingual']:
    file=ROOT/'documents'/f'{name}.pdf';count=len(PdfReader(file).pages)
    for number in sorted({1,2,3,count//2,count-1,count}):
        target=qa/f'document-{name}-{number:03}'
        subprocess.run([str(poppler),'-f',str(number),'-singlefile','-scale-to','1400','-png',str(file),str(target)],check=True,capture_output=True)
        samples.append(str(target.with_suffix('.png')))
    with pdfplumber.open(file) as pdf:
        for i,page in enumerate(pdf.pages,1):
            assert (page.extract_text() or '').strip(),(name,i)
            for ch in page.chars:
                if ch['text'].strip() and (ch['x0']<0 or ch['x1']>page.width+1 or ch['top']<0 or ch['bottom']>page.height+1):issues.append({'file':name,'page':i,'char':ch['text']})
            page.close()
    results.append({'file':name,'pages':count});print(name,count,flush=True)
(qa/'document-visual-audit.json').write_text(json.dumps({'documents':results,'renderedPages':samples,'boundsIssues':issues,'review':'Representative renders ready for visual review.','acceptance':'Local PDF checks only; classroom and projector acceptance separate.'},indent=2),encoding='utf-8')
assert not issues
