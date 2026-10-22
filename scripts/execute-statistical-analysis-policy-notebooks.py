"""Run student ZIP materials in a separate writable directory, with a fixed Python kernel."""
from pathlib import Path
import argparse
import json
import shutil
import sys
import nbformat
from nbclient import NotebookClient
from nbconvert import HTMLExporter

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'apps/teacher-web/public/course-assets/statistical-analysis/project-12-13'
OUT=ROOT/'output/statistical-analysis-policy/project'
p=argparse.ArgumentParser();p.add_argument('--data',type=Path,required=True);args=p.parse_args()
OUT.mkdir(parents=True,exist_ok=True)
for source in SOURCE.iterdir():
    if source.is_file() and source.suffix in ['.py','.ipynb','.md','.txt','.json']:
        shutil.copy2(source,OUT/source.name)
(OUT/'data').mkdir(exist_ok=True)
shutil.copy2(args.data,OUT/'data/inpresdata.dta')
kernel=OUT/'kernels/inpres-qa';kernel.mkdir(parents=True,exist_ok=True)
(kernel/'kernel.json').write_text(json.dumps({'argv':[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}'],
 'display_name':'INPRES QA Python','language':'python'}),encoding='utf-8')
from jupyter_client.kernelspec import KernelSpecManager
manager=KernelSpecManager(kernel_dirs=[str(OUT/'kernels')])
records=[]
for name in ['01_did','02_iv']:
    notebook=nbformat.read(OUT/f'{name}.ipynb',as_version=4)
    nbformat.validate(notebook)
    client=NotebookClient(notebook,timeout=180,kernel_name='inpres-qa',resources={'metadata':{'path':str(OUT)}})
    client.km=None
    client.kernel_manager_class # ensure kernel machinery is configured
    # Use the specified kernel without changing the user's global Jupyter setup.
    from jupyter_client import KernelManager
    client.km=KernelManager(kernel_name='inpres-qa',kernel_spec_manager=manager)
    try:
        client.execute()
    finally:
        if client.km is not None:
            client.km.shutdown_kernel(now=True)
    nbformat.write(notebook,OUT/f'{name}.ipynb')
    exporter=HTMLExporter(template_name='classic')
    html,_=exporter.from_notebook_node(notebook)
    (OUT/f'{name}.html').write_text(html,encoding='utf-8')
    errors=[o for cell in notebook.cells if cell.cell_type=='code' for o in cell.outputs if o.output_type=='error']
    figures=sum(1 for cell in notebook.cells if cell.cell_type=='code' for o in cell.outputs if 'image/png' in o.get('data',{}))
    assert not errors and figures>=1
    records.append({'notebook':name,'codeCells':sum(c.cell_type=='code' for c in notebook.cells),'figures':figures,'errors':len(errors)})
    print(json.dumps(records[-1]),flush=True)
(OUT.parent/'notebook-execution.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
