"""Assemble/reopen the PDFs, add navigation, and verify every question's presence."""
import json, re
from pathlib import Path
from pypdf import PdfReader, PdfWriter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/international-mathematics/practice-v1'
DOCS=OUT/'documents'
checks=[]
w=PdfWriter();offset=0
for lesson in range(1,17):
    file=DOCS/f'lesson-{lesson:02}-choice-practice.pdf'
    reader=PdfReader(file)
    assert len(reader.pages)==5, file
    text='\n'.join(page.extract_text() for page in reader.pages)
    for q in range(1,11): assert f'Q{q} · Rank' in text,(lesson,q)
    assert 'Correct answer:' not in text
    assert not re.search(r'[\u4e00-\u9fff]',text)
    w.append(reader,import_outline=False)
    parent=w.add_outline_item(f'Lesson {lesson:02}',offset)
    for rank,page in [(1,0),(2,1),(3,3),(4,4)]:
        w.add_outline_item(f'Rank {rank}'+(' (optional)' if rank==4 else ''),offset+page,parent=parent)
    checks.append({'file':file.name,'pages':5,'questions':10})
    offset+=5
w.add_metadata({'/Title':'Combined choice workbook - 16 lessons / 160 questions','/Author':'International Mathematics / edu-sys'})
w.write(DOCS/'combined-choice-workbook.pdf')
for name,total in [('teacher-answer-book.pdf',160),('bilingual-teaching-schedules.pdf',16)]:
    reader=PdfReader(DOCS/name);assert len(reader.pages)==total
    text='\n'.join(page.extract_text() for page in reader.pages)
    if name.startswith('teacher'): assert text.count('Correct answer:')==160
    else: assert text.count('70–90 min')==16
    updated=PdfWriter();updated.append(reader,import_outline=False)
    for lesson in range(1,17):
        first=(lesson-1)*(10 if total==160 else 1)
        parent=updated.add_outline_item(f'Lesson {lesson:02}',first)
        if total==160:
            for q in range(1,11):updated.add_outline_item(f'Question {q}',first+q-1,parent=parent)
    updated.add_metadata({'/Title':'Teacher answer book' if total==160 else 'Bilingual teaching schedules','/Author':'International Mathematics / edu-sys'})
    updated.write(DOCS/name)
    checks.append({'file':name,'pages':total,'lessonBookmarks':16})
reader=PdfReader(DOCS/'combined-choice-workbook.pdf');assert len(reader.pages)==80
assert len([e for e in reader.outline if not isinstance(e,list)])==16
checks.append({'file':'combined-choice-workbook.pdf','pages':80,'lessonBookmarks':16,'rankBookmarks':64})
# Text geometry is checked against page bounds, in addition to rendered-page review.
import pdfplumber
bad=[]
for entry in checks:
    with pdfplumber.open(DOCS/entry['file']) as pdf:
        for n,p in enumerate(pdf.pages):
            outside=[c for c in p.chars if c['text'].strip() and (c['x0']<0 or c['x1']>p.width+1 or c['top']<0 or c['bottom']>p.height+1)]
            if outside:bad.append({'file':entry['file'],'page':n+1,'outside':len(outside)})
assert not bad,bad
(OUT/'qa/pdf-reopen.json').write_text(json.dumps({'status':'passed','pdfs':checks,'charactersOutsidePage':bad},indent=2),encoding='utf8')
print('Reopened 19 final PDFs, verified all questions/bookmarks and page-bound text geometry.')
