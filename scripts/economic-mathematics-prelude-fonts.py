"""Local OFL font subset; the full official sources are cached only in tmp/."""
from pathlib import Path
from urllib.request import urlopen
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import sys

base = Path('apps/teacher-web/public/course-assets/economic-mathematics/prelude')
cache = Path('tmp/economic-prelude-fonts')
cache.mkdir(parents=True, exist_ok=True)
text = ''.join(p.read_text(encoding='utf-8') for p in base.glob('*.js') if p.name != 'film.js')
text += Path('docs/course/economic-mathematics-prelude-notes.cjs').read_text(encoding='utf-8')
text += ''.join(p.read_text(encoding='utf-8') for p in base.glob('*.html'))
text += '教师备课第页秒分钟完整答案讲稿0123456789—≥≤×÷−⇒√π∞%/→←'
for family in ['Sans', 'Serif']:
    name = f'Noto{family}CJKsc-Regular.otf'
    source = cache / name
    if not source.exists():
        source.write_bytes(urlopen(f'https://raw.githubusercontent.com/notofonts/noto-cjk/main/{family}/OTF/SimplifiedChinese/{name}').read())
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff'
    options.layout_features = ['*']
    sub = subset.Subsetter(options=options)
    sub.populate(text=text)
    sub.subset(font)
    font.flavor = 'woff'
    target = base / 'fonts' / (family.lower() + '.woff')
    font.save(target)
    missing = sorted(set(ord(c) for c in text if '\u4e00' <= c <= '\u9fff') - set(font.getBestCmap()))
    assert not missing, missing
    print(target, target.stat().st_size, 'bytes; Chinese character coverage complete')

# Heavy display type for the geometric film's short impact titles.
display_source = cache / 'NotoSansSC.ttf'
if not display_source.exists():
    display_source.write_bytes(urlopen('https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf').read())
display_font = instantiateVariableFont(TTFont(display_source), {'wght': 900}, inplace=True)
display_options = subset.Options()
display_options.flavor = 'woff'
display_subset = subset.Subsetter(options=display_options)
display_subset.populate(text=text)
display_subset.subset(display_font)
display_font.flavor = 'woff'
display_font.save(base / 'fonts/display.woff')
print('Display weight 900 subset ready')

if '--pdf-fonts' in sys.argv:
    # The PDF engine embeds TrueType outlines. This avoids CID-CFF remapping
    # differences between browser font shaping and PDF subsetters.
    for family in ['Sans', 'Serif']:
        target = cache / (family.lower() + '-static.ttf')
        if target.exists():
            continue
        source = cache / f'Noto{family}SC.ttf'
        if not source.exists():
            source.write_bytes(urlopen(f'https://raw.githubusercontent.com/google/fonts/main/ofl/noto{family.lower()}sc/Noto{family}SC%5Bwght%5D.ttf').read())
        font = instantiateVariableFont(TTFont(source), {'wght': 400}, inplace=True)
        font.save(target)
        print(target)
