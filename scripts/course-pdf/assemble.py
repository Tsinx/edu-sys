"""Merge bounded parts on disk, verify every page, and create a stored ZIP.

Stored ZIP avoids a second burst of compression for already compressed PDFs.
PyMuPDF keeps the original vector text, equations, diagrams and source links.
"""
import json
from pathlib import Path
import sys
import zipfile
import fitz


def compress_photos(document):
    # Keep vector text/diagrams and transparent cutouts. Only opaque, large
    # raster images need JPEG recompression; otherwise a full-course PDF can
    # retain hundreds of megabytes of lossless photo data.
    seen = set()
    for page in document:
        for image in page.get_images():
            xref = image[0]
            if xref in seen: continue
            seen.add(xref)
            if image[1] or image[2] < 600 or image[3] < 400: continue
            original = document.extract_image(xref)
            if len(original['image']) < 300_000: continue
            pixmap = fitz.Pixmap(document, xref)
            if pixmap.alpha: continue
            if pixmap.n != 3: pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
            if max(pixmap.width, pixmap.height) > 1800:
                factor = 1800 / max(pixmap.width, pixmap.height)
                pixmap = fitz.Pixmap(pixmap, int(pixmap.width * factor), int(pixmap.height * factor))
            encoded = pixmap.tobytes('jpeg', jpg_quality=88)
            if len(encoded) < len(original['image']): page.replace_image(xref, stream=encoded)


def inspect(path, expected):
    with fitz.open(path) as document:
        if document.page_count != expected: raise ValueError(f'PDF_PAGE_COUNT:{path}:{document.page_count}:{expected}')
        for page in document:
            if abs(page.rect.width - 1200) > 0.5 or abs(page.rect.height - 750) > 0.5:
                raise ValueError(f'PDF_PAGE_SIZE:{path}:{page.number}')
            if not page.get_text().strip(): raise ValueError(f'PDF_EMPTY_TEXT:{path}:{page.number}')


def merge(inputs, destination, expected, title, toc=None):
    target = Path(destination); target.parent.mkdir(parents=True, exist_ok=True)
    pending = target.with_suffix('.pending.pdf')
    with fitz.open() as output:
        for path in inputs:
            with fitz.open(path) as source: output.insert_pdf(source, links=True, annots=False)
        if toc is None: compress_photos(output)
        output.set_metadata({'title': title, 'author': 'Course teaching team', 'subject': 'Published course slides', 'creator': 'edu-sys bounded offline PDF builder'})
        if toc: output.set_toc(toc)
        # Duplicate-object comparison is quadratic on large decks. Linear
        # garbage collection keeps whole-course exports bounded in CPU time.
        output.save(pending, garbage=1, deflate=True, use_objstms=1)
    inspect(pending, expected)
    pending.replace(target)


def main():
    spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    if spec['operation'] == 'chapter':
        merge(spec['parts'], spec['output'], spec['pages'], spec['title'])
    elif spec['operation'] == 'course':
        offset = 1; toc = []
        for chapter in spec['chapters']:
            inspect(chapter['path'], chapter['pages'])
            toc.append([1, f"{chapter['label']} - {chapter['title']}", offset]); offset += chapter['pages']
        merge([chapter['path'] for chapter in spec['chapters']], spec['output'], spec['pages'], spec['title'], toc)
        archive = Path(spec['archive']); pending = archive.with_suffix('.pending.zip')
        with zipfile.ZipFile(pending, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as bundle:
            for chapter in spec['chapters']: bundle.write(chapter['path'], chapter['filename'])
        with zipfile.ZipFile(pending) as bundle:
            if len(bundle.infolist()) != len(spec['chapters']) or bundle.testzip() is not None: raise ValueError('PDF_ZIP_INVALID')
        pending.replace(archive)
    elif spec['operation'] == 'verify':
        for item in spec['files']: inspect(item['path'], item['pages'])
    else: raise ValueError('PDF_OPERATION')


if __name__ == '__main__': main()
