"""Package the authorized prelude only, without copying unrelated course assets."""
import hashlib, json, shutil, zipfile, sys
from pathlib import Path

assets=Path('apps/teacher-web/public/course-assets/economic-mathematics/prelude')
output=Path('output/economic-mathematics/prelude-v1')

if '--film-only' in sys.argv:
    # Keep this revision independent of concurrently edited course/player features.
    names=['motion.html','motion-player.js','film-source.js','film.js','prelude.css',
           'economic-mathematics-prelude.mp4','motion-study-15s.mp4','score.wav','sample-score.wav',
           'poster.png','storyboard.json','THREE-LICENSE.txt']
    sources={name:assets/name for name in names}
    for source in (assets/'fonts').iterdir():
        if source.is_file():sources['fonts/'+source.name]=source
    for name in ['media-qa.json','sample-media-qa.json','score.json','contact-sheet.png','sample-contact-sheet.png']:
        sources['verification/'+name]=output/name
    for name in ['economic-mathematics-prelude.mjs','economic-mathematics-prelude-fonts.py']:
        sources['source-tools/'+name]=Path('scripts')/name
    readme=('经济数学 · 撞色动效短片 V2\n\n'
            '完整影片：economic-mathematics-prelude.mp4，90秒，1920×1200，60fps。\n'
            '代表样片：motion-study-15s.mp4，15秒。\n'
            '实时预览：motion.html，支持暂停、重播、静音及时间轴；三维预览需要WebGL2。\n'
            '直接播放MP4无需WebGL。全部字体、音轨和运行代码都在本包内。\n\n'
            '动画源文件为film-source.js；预览和导出共用render函数。\n'
            '分镜、配色、数学模型、14组文字和来源见storyboard.json。\n'
            'source-tools内脚本在edu-sys项目根目录运行；film.js已包含Three.js。\n'
            '短片采用钴蓝、亮黄、鲜绿，俯冲与环绕、字形碰撞与几何回弹。\n'
            '旧版恢复副本保存在项目output/economic-mathematics/prelude-v1/history目录。\n'
            '本包聚焦短片；40页课堂序章仍通过项目课程资源入口使用。\n').encode('utf-8')
    overrides={'motion.html':sources['motion.html'].read_text(encoding='utf-8').replace('<a href="index.html">进入40页序章</a>','').encode('utf-8')}
    records=[]
    for name,source in sources.items():
        data=overrides.get(name) if name in overrides else source.read_bytes()
        records.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    records.append({'path':'README.txt','bytes':len(readme),'sha256':hashlib.sha256(readme).hexdigest()})
    dest=output/'economic-mathematics-prelude-film-v2.zip'
    with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name,source in sources.items():
            if name in overrides:z.writestr(name,overrides[name])
            else:z.write(source,name)
        z.writestr('README.txt',readme)
        z.writestr('manifest.json',json.dumps({'revision':'chromatic-motion-v2-2026-10-08','files':records},ensure_ascii=False,indent=2))
    with zipfile.ZipFile(dest) as z:
        assert z.testzip() is None
        for r in records:assert hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256']
    print(dest,len(records),'hashed files',dest.stat().st_size,'bytes')
    sys.exit(0)

release=output/'release'
release.mkdir(parents=True,exist_ok=True)
for source in assets.rglob('*'):
    if source.is_file():
        target=release/source.relative_to(assets);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
for source in [Path('docs/course/economic-mathematics-prelude-script.md'),Path('docs/course/economic-mathematics-prelude-notes.cjs'),Path('docs/course/economic-mathematics-prelude-validation.md')]:
    target=release/'preparation'/source.name;target.parent.mkdir(exist_ok=True);shutil.copy2(source,target)
for source in Path('scripts').glob('economic-mathematics-prelude*'):
    if source.is_file():
        target=release/'source-tools'/source.name;target.parent.mkdir(exist_ok=True);shutil.copy2(source,target)
for name in ['media-qa.json','sample-media-qa.json','score.json','source-fingerprint.json','teaching-route.json','pdf-qa.json','browser-qa.json','contact-sheet.png','sample-contact-sheet.png']:
    source=output/name
    if source.exists():
        target=release/'verification'/name;target.parent.mkdir(exist_ok=True);shutil.copy2(source,target)
records=[]
for file in sorted(release.rglob('*')):
    if file.is_file() and file.name!='manifest.json':records.append({'path':file.relative_to(release).as_posix(),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(release/'manifest.json').write_text(json.dumps({'release':'economic-mathematics-prelude-v1','courseId':'course-economic-mathematics','files':records},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
dest=output/'economic-mathematics-prelude-offline.zip'
with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for file in sorted(release.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(release))
with zipfile.ZipFile(dest) as z:
    assert z.testzip() is None
    for r in records:assert hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256']
print(dest,len(records),'hashed files',dest.stat().st_size,'bytes')
