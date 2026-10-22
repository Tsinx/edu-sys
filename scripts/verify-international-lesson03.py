"""Independently check the revised mathematics and the actual student PDF."""
from pathlib import Path
import hashlib
import json
import sys
import fitz
from PIL import Image, ImageDraw

root = Path.cwd()
sys.path.insert(0, str(root / '.runtime/factorisation-python'))
import sympy as s
x, a, b, c, q = s.symbols('x a b c q', real=True)
assert s.expand((x+3)**2) == x*x+6*x+9
assert s.solve(x*x+6*x+5, x) == [-5, -1]
assert s.expand(2*(x+2)**2-2) == 2*x*x+8*x+6
assert s.expand(2500-(q-50)**2) == 100*q-q*q
assert s.simplify((2*a*x+b)**2-(b*b-4*a*c)-4*a*(a*x*x+b*x+c)) == 0
for aa, bb, cc in [(1, -5, 6), (2, 9, 5), (-2, -3, 2), (1, -4, 4)]:
    d = bb*bb-4*aa*cc
    for sign in [-1, 1]:
        r = (-bb+sign*s.sqrt(d))/(2*aa)
        assert s.simplify(aa*r*r+bb*r+cc) == 0
for r in [s.Rational(-649, 1000), s.Rational(-3851, 1000)]:
    assert 2*r*r+9*r+5 == s.Rational(1402, 1000000)
assert (-5)**2-4*3*6 == -47
folder = root / 'output/international-mathematics/lesson-03-revision'
qa = folder / 'qa'
(qa/'mathematics.json').write_text(json.dumps({
    'status': 'passed', 'formulaCases': 4,
    'checks': ['square expansion', 'equivalent expression', 'nonmonic completion',
               'revenue vertex form', 'general derivation', 'both root branches',
               'negative leading coefficient', 'repeated root', 'no real root',
               'three-decimal residuals'],
    'source': 'Jacques 9th ed., section 2.1, printed pp.124-126 / PDF pp.141-143. Additional scaffolding is original.'
}, indent=2), encoding='utf-8')
file = folder / 'lecture-03-completing-square-and-quadratic-formula.pdf'
data = json.loads((folder/'lecture-metadata.json').read_text(encoding='utf-8'))
keys = data['slideKeys']
def page(key):
    return keys.index(key)+1
toc = [[1, 'Lecture 3: Quadratic Functions', 1],
       [2, 'Hour 1: Completing squares and understanding roots', 1],
       [3, 'The square pattern', page('im-l03-10-scaffold-square-01')],
       [3, 'One operation at a time', page('im-l03-10-scaffold-square-04')],
       [3, 'Where the quadratic formula comes from', page('im-l03-10-scaffold-origin-01')],
       [3, 'Signed coefficients and two root branches', page('im-l03-10-a')],
       [3, 'Discriminant: two, one or no real roots', page('im-l03-12-scaffold-discriminant-01')],
       [2, 'Hour 2: Coefficients, revenue and practice', 51],
       [3, 'Completing a square when a is not one', page('im-l03-12-scaffold-leading-01')],
       [3, 'Textbook example: noninteger roots', page('im-l03-12-scaffold-book-a-01')],
       [3, 'Revenue in completed-square form', page('im-l03-14-a')],
       [2, 'Optional Challenge', 101]]
doc = fitz.open(file)
assert len(doc) == 102
for i, p in enumerate(doc):
    assert abs(p.rect.width/p.rect.height-1.6) < .0001
    text = p.get_text()
    assert len(text) > 60 and 'Jacques' in text
    for private in ['teachingCue', 'assistantCue', 'Teacher guide', 'Check your reasoning']:
        assert private not in text, (i+1, private)
    for word in p.get_text('words'):
        assert word[0] >= -2 and word[1] >= -2 and word[2] <= p.rect.width+2 and word[3] <= p.rect.height+2, (i+1, word)
    fonts = p.get_fonts(full=True)
    assert fonts
    assert all(len(doc.extract_font(f[0])[3]) > 0 for f in fonts)
doc.set_toc(toc)
pending = folder/'lecture.pending.pdf'
doc.save(pending, garbage=4, deflate=True)
doc.close()
pending.replace(file)
check = fitz.open(file)
assert len(check) == 102 and len(check.get_toc()) == len(toc)
for start in [1, 26, 51, 76, 101]:
    stop = min(start+24, 102)
    count = stop-start+1
    sheet = Image.new('RGB', (1800, ((count+3)//4)*250), '#dfe3e0')
    draw = ImageDraw.Draw(sheet)
    for j, n in enumerate(range(start, stop+1)):
        pix = check[n-1].get_pixmap(matrix=fitz.Matrix(.29, .29))
        im = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        im.thumbnail((440, 220))
        xx, yy = (j % 4)*450, (j//4)*250
        sheet.paste(im, (xx, yy+20))
        draw.text((xx+5, yy+3), str(n), fill='#18232c')
    sheet.save(qa/f'contact-{start:03}.jpg')
check.close()
report = {'status': 'passed', 'pages': 102, 'bookmarks': len(toc),
          'embeddedFonts': True, 'textBounds': True, 'privateAnswersAbsent': True,
          'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
(qa/'pdf-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
