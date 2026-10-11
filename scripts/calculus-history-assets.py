"""Prepare licensed historical art and local OFL fonts for the calculus film.

This never generates images or copies credentials. ImageGen selections are copied
into assets separately. Full official font sources stay in the ignored cache.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from hashlib import sha256
import json
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

base = Path('apps/teacher-web/public/course-assets/economic-mathematics/calculus-history')
cache = Path('tmp/calculus-history-assets')
cache.mkdir(parents=True, exist_ok=True)
(base / 'assets').mkdir(exist_ok=True)
(base / 'fonts').mkdir(exist_ok=True)
sources = json.loads((base / 'sources.json').read_text(encoding='utf-8'))
for asset in sources['assets']:
    if 'media' not in asset:
        continue
    original = cache / Path(asset['file']).name
    if not original.exists():
        request = Request(asset['media'], headers={'User-Agent':'EconomicMathematicsCourse/1.0 (educational media preparation)'})
        original.write_bytes(urlopen(request, timeout=60).read())
    image = Image.open(original).convert('RGB')
    image.thumbnail((1920,1920), Image.Resampling.LANCZOS)
    target = base / asset['file']
    image.save(target, quality=93, optimize=True)
    print(target.name, image.size)

text = ''.join(p.read_text(encoding='utf-8') for p in base.glob('*') if p.suffix in ['.js','.json','.html','.css'])
text += '0123456789.−+=≠→←↔×÷∞√²δΔεπ∀∃′|()[]/<>≤≥–—：？。·hxyQSLR牛顿莱布尼茨贝克莱极限无穷小变化率差商误差保证输入范围所有非零整数之比正方形对角线集合悖论历史场景插画公共领域肖像论文原件现代数学图示课程组李行之经济数学'
for family in ['Sans','Serif']:
    font_cache = Path('tmp/economic-prelude-fonts')
    source = font_cache / f'Noto{family}CJKsc-Regular.otf'
    if not source.exists():
        source = cache / f'Noto{family}CJKsc-Regular.otf'
        if not source.exists():
            source.write_bytes(urlopen(f'https://raw.githubusercontent.com/notofonts/noto-cjk/main/{family}/OTF/SimplifiedChinese/{source.name}').read())
    font = TTFont(source)
    options = subset.Options(); options.flavor = 'woff'; options.layout_features = ['*']
    sub = subset.Subsetter(options=options); sub.populate(text=text); sub.subset(font)
    missing = sorted(set(ord(c) for c in text if '\u4e00' <= c <= '\u9fff') - set(font.getBestCmap()))
    assert not missing, missing
    font.flavor = 'woff'; font.save(base / 'fonts' / f'{family.lower()}.woff')
    license_source = Path(f'apps/teacher-web/public/course-assets/economic-mathematics/prelude/fonts/OFL-{family.lower()}.txt')
    (base / 'fonts' / f'OFL-{family.lower()}.txt').write_bytes(license_source.read_bytes())

display_source = Path('tmp/economic-prelude-fonts/NotoSansSC.ttf')
if not display_source.exists():
    display_source = cache / 'NotoSansSC.ttf'
    if not display_source.exists():
        display_source.write_bytes(urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf').read())
font = instantiateVariableFont(TTFont(display_source), {'wght':900}, inplace=True)
options = subset.Options(); options.flavor='woff'; options.layout_features=['*']
sub=subset.Subsetter(options=options); sub.populate(text=text); sub.subset(font)
font.flavor='woff'; font.save(base/'fonts/display.woff')

manifest = [{"file": str(p.relative_to(base)).replace('\\','/'), "bytes":p.stat().st_size,"sha256":sha256(p.read_bytes()).hexdigest()} for d in ['assets','fonts'] for p in sorted((base/d).glob('*')) if p.is_file()]
(base/'asset-fingerprints.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared licensed art and complete local Chinese font coverage.')
