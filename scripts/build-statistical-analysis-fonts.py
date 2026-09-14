from pathlib import Path
from fontTools import subset
root=Path(__file__).resolve().parents[1]
paths=list((root/'packages/course-content/src/statistical-analysis').glob('*.ts'))+list((root/'apps/teacher-web/src/features/statistical-analysis').glob('*.tsx'))
text=''.join(p.read_text(encoding='utf-8') for p in paths)+''.join(chr(i) for i in range(32,255))+'ⅠⅡⅢⅣ₀₁₂₃₄₅₆₇₈₉−±×÷→≠≈σμ∈√甲乙'
out=root/'apps/teacher-web/public/course-assets/statistical-analysis/fonts'
out.mkdir(parents=True,exist_ok=True)
for family,name in [('Sans','sans'),('Serif','serif')]:
    options=subset.Options();options.flavor='woff';options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
    font=subset.load_font(str(root/f'docs/course/statistical-analysis/font-originals/Noto{family}CJKsc-Regular.otf'),options)
    sub=subset.Subsetter(options=options);sub.populate(text=text);sub.subset(font)
    subset.save_font(font,str(out/f'{name}.woff'),options)
(out/'OFL.txt').write_bytes((root/'docs/course/statistical-analysis/font-originals/OFL.txt').read_bytes())
print('Local OFL fonts subset from all course text.')
