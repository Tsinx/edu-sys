"""Package original data and the executed student project, without teacher notes."""
from pathlib import Path
import hashlib,json,zipfile
import nbformat
ROOT=Path(__file__).resolve().parents[1]
base=ROOT/'apps/teacher-web/public/course-assets/statistical-analysis/text-15'
notebook=nbformat.read(base/'classroom.ipynb',as_version=4);nbformat.validate(notebook)
assert all(c.execution_count for c in notebook.cells if c.cell_type=='code')
assert not [o for c in notebook.cells for o in c.get('outputs',[]) if o.output_type=='error']
files=[p for p in base.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name not in ['manifest.json','text-analysis-student.zip']]
assert {p.name for p in files if p.parent==base/'data/raw'}=={'train.csv','dev.csv','test.csv'}
assert not [p for p in files if 'teacher' in p.name or 'script.md' in p.name]
manifest={str(p.relative_to(base)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}
(base/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(base/'text-analysis-student.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for p in [*sorted(files),base/'manifest.json']:
        z.write(p,str(p.relative_to(base)))
with zipfile.ZipFile(base/'text-analysis-student.zip') as z:
    assert z.testzip() is None
    for name,sha in manifest.items():assert hashlib.sha256(z.read(name)).hexdigest()==sha
print({'files':len(manifest)+1,'zip_bytes':(base/'text-analysis-student.zip').stat().st_size,'executed_cells':sum(c.cell_type=='code' for c in notebook.cells)})
