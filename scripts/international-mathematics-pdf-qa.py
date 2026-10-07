import os, json, subprocess
from pathlib import Path
from pypdf import PdfReader, PdfWriter
import pdfplumber
ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('IM_OUTPUT_ROOT', ROOT / 'output' / 'international-mathematics' / 'v2'))
slides = OUT / 'slides'
lessons = json.loads((OUT / 'course-definitions.json').read_text(encoding='utf-8'))['lessons']
writer = PdfWriter()
files, bookmarks = [], []
offset = 0
for lesson in lessons:
    n = lesson['number']
    file = slides / f'lesson-{n:02}.pdf'
    reader = PdfReader(file)
    assert len(reader.pages) == len(lesson['slides']), (n, len(reader.pages))
    assert all(abs(float(p.mediabox.width)/float(p.mediabox.height)-1.6)<0.001 for p in reader.pages)
    writer.append(str(file), import_outline=False)
    parent = writer.add_outline_item(f'{n:02} {lesson["title"]}', offset)
    bookmarks.append({'title':lesson['title'],'page':offset+1,'kind':'lesson'})
    for hour in lesson['hours']:
        start = offset + hour['localStart'] - 1
        title = f'Hour {hour["number"]}: {hour["title"]}'
        writer.add_outline_item(title, start, parent=parent)
        bookmarks.append({'title':title,'page':start+1,'kind':'hour'})
    files.append(file)
    offset += len(lesson['slides'])
writer.add_metadata({'/Title':'Higher Mathematics: Calculus for Economics and Business — v2','/Author':'Course materials based on Ian Jacques, 9th edition','/Subject':'1280 core + 32 optional student slides; 32 teaching-hour blocks'})
merged = slides / 'complete-course-student-slides.pdf'
with merged.open('wb') as stream: writer.write(stream)
writer.close()
reopened = PdfReader(merged)
assert len(reopened.pages) == offset == 1312
destinations = [item for block in reopened.outline for item in (block if isinstance(block,list) else [block])]
assert len(destinations) == len(bookmarks) == 48
assert [reopened.get_destination_page_number(d)+1 for d in destinations] == [b['page'] for b in bookmarks]
issues, pages = [], 0
for file in files:
    with pdfplumber.open(file) as pdf:
        for number, page in enumerate(pdf.pages,1):
            pages += 1
            text = page.extract_text() or ''
            if not text.strip(): issues.append({'file':file.name,'page':number,'issue':'blank'})
            if any('\u4e00'<=c<='\u9fff' for c in text): issues.append({'file':file.name,'page':number,'issue':'Chinese in student PDF'})
            if any(token in text for token in ('Assistant boundary:', 'Explain this page in clear English.', 'Teacher planning only')): issues.append({'file':file.name,'page':number,'issue':'private instruction'})
            for char in page.chars:
                if char.get('text','').strip() and (char['x0'] < -1 or char['x1'] > page.width+1 or char['top'] < -1 or char['bottom'] > page.height+1): issues.append({'file':file.name,'page':number,'issue':'outside PDF bounds','character':char['text']})
qa = OUT / 'qa'
poppler = Path('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
samples = []
for n in (1,5,14):
    lesson = lessons[n-1]
    for number in sorted({1,9,16,24,lesson['hours'][1]['localStart'],len(lesson['slides'])-2,len(lesson['slides'])}):
        target = qa / f'pdf-lesson-{n:02}-page-{number:02}'
        subprocess.run([str(poppler),'-f',str(number),'-singlefile','-scale-to','1600','-png',str(slides/f'lesson-{n:02}.pdf'),str(target)],check=True,capture_output=True)
        samples.append(str(target.with_suffix('.png')))
report = {'lecturePdfs':len(files),'lecturePages':pages,'completeCoursePages':len(reopened.pages),'bookmarks':bookmarks,'aspectRatio':'16:10','issues':issues,'renderedSamplePages':samples}
(qa/'student-pdf-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'studentPages':pages,'issues':len(issues),'bookmarks':len(bookmarks),'merged':str(merged)}))
assert not issues
