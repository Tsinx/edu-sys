"""Independent symbolic and numerical checks of the 31 computational written answers."""
from pathlib import Path
import sys,json,math
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/courseware/economic-integral-methods-2026-11-01'
sys.path.insert(0,str(OUT/'python-deps'))
import sympy as s
x=s.symbols('x',real=True)
xp=s.symbols('x',positive=True)
cases=[]
def case(key,f,F,points,var=x):
    residual=s.simplify(s.trigsimp(s.diff(F,var)-f))
    fn=s.lambdify(var,f,'math');primitive=s.lambdify(var,F,'math')
    errors=[]
    for p in points:
        h=1e-5*max(1,abs(p))
        actual=(primitive(p+h)-primitive(p-h))/(2*h)
        expected=fn(p)
        relative=abs(actual-expected)/max(1,abs(expected))
        assert relative<3e-6,(key,p,actual,expected)
        errors.append(relative)
    assert residual==0,(key,residual)
    cases.append({'question':key,'symbolicResidual':'0','samplePoints':points,'maxRelativeError':max(errors)})
R=[-1.2,-.2,0,.4,1.3]
P=[.2,.5,1,2,3]
case('17-1-1',s.cos(3*x-1),s.sin(3*x-1)/3,R)
case('17-1-2',x*s.exp(x*x),s.exp(x*x)/2,R)
case('17-1-3',2*x/(1+x*x),s.log(1+x*x),R)
case('17-1-4',(2*x+1)/(x*x+x+2),s.log(x*x+x+2),R)
case('17-2-1',1/(4+x*x),s.atan(x/2)/2,R)
case('17-2-2',1/s.sqrt(9-4*x*x),s.asin(2*x/3)/2,[-1.3,-.4,0,.3,1.2])
case('17-2-3',x/s.sqrt(1-x*x),-s.sqrt(1-x*x),[-.8,-.2,0,.4,.85])
case('17-2-4',s.log(xp)**2/xp,s.log(xp)**3/3,P,xp)
case('17-3-1',1/(s.sqrt(xp)*(1+s.sqrt(xp))),2*s.log(1+s.sqrt(xp)),P,xp)
case('17-3-2',s.sqrt(1-x*x),(x*s.sqrt(1-x*x)+s.asin(x))/2,[-.8,-.2,0,.4,.85])
case('17-3-3',1/(1+xp**s.Rational(2,3)),3*xp**s.Rational(1,3)-3*s.atan(xp**s.Rational(1,3)),P,xp)
case('17-3-4',1/(1+x*x),s.atan(x),R)
case('17-4-1',(3*x+1)/(x*x+2*x+5),s.Rational(3,2)*s.log(x*x+2*x+5)-s.atan((x+1)/2),R)
case('17-4-2',x/(1+x**4),s.atan(x*x)/2,R)
# The two components have different real logarithm expressions.
case('17-4-3-left',1/(xp*s.log(xp)),s.log(-s.log(xp)),[.1,.3,.6,.8],xp)
case('17-4-3-right',1/(xp*s.log(xp)),s.log(s.log(xp)),[1.2,1.7,2,4],xp)
case('17-4-4-left',-x,-x*x/2,[-3,-1,-.2])
case('17-4-4-right',x,x*x/2,[.2,1,3])
case('18-1-1',x*s.exp(x),(x-1)*s.exp(x),R)
case('18-1-2',x*s.cos(x),x*s.sin(x)+s.cos(x),R)
case('18-1-3',s.log(2*xp),xp*s.log(2*xp)-xp,P,xp)
case('18-1-4',s.atan(x),x*s.atan(x)-s.log(1+x*x)/2,R)
case('18-2-1',(x*x+1)*s.exp(x),(x*x-2*x+3)*s.exp(x),R)
case('18-2-2',x*s.exp(2*x),s.exp(2*x)*(2*x-1)/4,R)
case('18-2-3',xp*s.log(xp),xp*xp*s.log(xp)/2-xp*xp/4,P,xp)
case('18-2-4',x*x*s.cos(x),x*x*s.sin(x)+2*x*s.cos(x)-2*s.sin(x),R)
case('18-3-1',s.exp(x)*s.cos(x),s.exp(x)*(s.sin(x)+s.cos(x))/2,R)
case('18-3-2',s.exp(2*x)*s.cos(x),s.exp(2*x)*(2*s.cos(x)+s.sin(x))/5,R)
case('18-3-3',s.sin(x)**2,x/2-s.sin(2*x)/4,R)
case('18-4-1',s.log(xp)/(xp*xp),-(s.log(xp)+1)/xp,P,xp)
case('18-4-2',x*s.atan(x),(x*x+1)*s.atan(x)/2-x/2,R)
case('18-4-3',x**3*s.exp(x*x),(x*x-1)*s.exp(x*x)/2,R)
case('18-4-4',s.log(1+x*x),x*s.log(1+x*x)-2*x+2*s.atan(x),R)
# Zero-point derivative of x|x|/2, where the branch theorem is not invoked.
h=s.symbols('h',real=True)
assert s.limit(s.Abs(h)/2,h,0,dir='+')==0
assert s.limit(s.Abs(h)/2,h,0,dir='-')==0
# Useful recurrence versus a tautology: a return to I is not by itself information.
I,J,H=s.symbols('I J H')
assert s.expand((I-(H-I))).coeff(I)==2
assert s.simplify(I-(x*s.exp(x)-(x*s.exp(x)-I)))==0
assert abs(math.sqrt(math.cos(math.pi)**2)-(-math.cos(math.pi)))<1e-12
assert math.sqrt(math.cos(math.pi)**2)!=math.cos(math.pi)
# The classroom parameter example is deliberately split at a=0.
a=s.symbols('a',nonzero=True,real=True)
assert s.simplify(s.diff(s.exp(a*x)*(a*x-1)/a**2,x)-x*s.exp(a*x))==0
assert s.diff(x*x/2,x)==x
question_ids={c['question'].removesuffix('-left').removesuffix('-right') for c in cases}
assert len(question_ids)==31
result={'computationalQuestions':31,'conceptualQuestion':'18-3-4: tautology gives no new information','checks':cases,'zeroDerivativeAndBranchChecks':True,'cycleCoefficientChecks':True,'parameterZeroCase':True}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'math-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'computationalQuestions':31,'symbolicCases':len(cases),'allPassed':True}))
