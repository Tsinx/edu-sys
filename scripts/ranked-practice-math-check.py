"""Independent symbolic recomputation, including equivalence of distractors."""
import json, sys
from pathlib import Path
import sympy as sp
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
errors=[]
namespace={name:sp.Symbol(name) for name in ['x','y','a','b','c','d','Q','P','Y','L','t','T','A']}
namespace['round']=lambda v,n:sp.Rational(str(round(float(v),int(n))))
def first_exceeding_year(flow,variable,threshold):
    return next(n for n in range(1,101) if sp.integrate(flow,(variable,n-1,n))>threshold)
namespace['first_exceeding_year']=first_exceeding_year
def equivalent(a,b):
    if a == b: return True
    if isinstance(a,sp.Tuple) or isinstance(b,sp.Tuple): return a == b
    return sp.simplify(a-b) == 0
for pack in data:
    for q in pack['questions']:
        actual=sp.sympify(q['verification']['expression'],locals=namespace)
        options=[sp.sympify(s,locals=namespace) for s in q['verification']['options']]
        valid=[i for i,o in enumerate(options) if equivalent(actual,o)]
        expected='ABCD'.index(q['correctOptionId'])
        if valid != [expected]: errors.append(f"{q['id']}: expected {expected}, valid {valid}, actual {actual}")
        for i in range(4):
            for j in range(i):
                if equivalent(options[i],options[j]): errors.append(f"{q['id']}: equivalent options {j}/{i}")
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f"Independently recomputed {sum(len(p['questions']) for p in data)} keys; no equivalent distractors.")
