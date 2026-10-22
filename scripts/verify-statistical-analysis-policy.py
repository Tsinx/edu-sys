"""Independent matrix/aggregation audit. Does not import the teaching estimator."""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
import pandas as pd
from scipy.stats import t

ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--data',type=Path,required=True);args=p.parse_args()
expected=json.loads((ROOT/'packages/course-content/src/statistical-analysis/policy-data.json').read_text(encoding='utf-8'))
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
def near(name,a,b,tol=1e-8): check(f'{name}: {a} versus {b}',bool(np.allclose(a,b,atol=tol,rtol=tol)))
check('source bytes',hashlib.sha256(args.data.read_bytes()).hexdigest()==expected['source']['sha256'])
raw=pd.read_stata(args.data,convert_categoricals=False)
d=raw.loc[raw[['yeduc','p504thn','weight','recp']].notna().all(axis=1)].copy()
d['age']=74-d.p504thn
eligible=d.age.between(2,6)|d.age.between(12,17)
s=d.loc[eligible].copy();w=s.loc[s.lhwage.notna()].copy()
check('raw count',len(raw)==152990);check('valid count',len(d)==152989)
check('education count',len(s)==78470);check('wage count',len(w)==31061)
check('selection count',len(s)-len(w)==47409)
check('district count',s.birthpl.nunique()==w.birthpl.nunique()==290)

def matrices(sample,outcome,weighted=True):
    high=sample.recp.to_numpy(float); young=sample.age.between(2,6).to_numpy(float)
    x=np.column_stack([np.ones(len(sample)), high, young, high*young])
    weights=sample.weight.to_numpy(float) if weighted else np.ones(len(sample))
    y=sample[outcome].to_numpy(float);groups=sample.birthpl.to_numpy(int)
    bread=np.linalg.inv(x.T@(weights[:,None]*x))
    beta=bread@(x.T@(weights*y));residual=y-x@beta
    scores=x*(weights*residual)[:,None]
    grouped=np.array([scores[groups==g].sum(axis=0) for g in np.unique(groups)])
    correction=len(np.unique(groups))/(len(np.unique(groups))-1)*(len(y)-1)/(len(y)-x.shape[1])
    cov=bread@grouped.T@grouped@bread*correction
    return beta,cov,x,weights,y,groups

for label,sample,outcome in [('education',s,'yeduc'),('first',w,'yeduc'),('reduced',w,'lhwage')]:
    b,v,x,a,y,g=matrices(sample,outcome)
    near(label+' coefficient',b[3],expected[label]['beta'])
    near(label+' CR1 standard error',np.sqrt(v[3,3]),expected[label]['se'])
    near(label+' t interval',[b[3]-t.ppf(.975,289)*np.sqrt(v[3,3]),b[3]+t.ppf(.975,289)*np.sqrt(v[3,3])],expected[label]['ci'])
    table=[]
    for hi in [0,1]:
        for yo in [0,1]:
            mask=(x[:,1]==hi)&(x[:,2]==yo)
            table.append(float(np.sum(a[mask]*y[mask])/np.sum(a[mask])))
    near(label+' direct four means',table[3]-table[2]-table[1]+table[0],b[3])

fs,fsvar,z,a,educ,g=matrices(w,'yeduc')
rf,rfvar,_,_,y,_=matrices(w,'lhwage')
x=np.column_stack([z[:,:3],educ])
iv_bread=np.linalg.inv(z.T@(a[:,None]*x))
beta=iv_bread@(z.T@(a*y))
resid=y-x@beta
scores=z*(a*resid)[:,None]
grouped=np.array([scores[g==group].sum(axis=0) for group in np.unique(g)])
correction=290/289*(len(w)-1)/(len(w)-4)
cov=iv_bread@grouped.T@grouped@iv_bread.T*correction
near('independent IV moments',beta[3],expected['iv']['beta'])
near('independent IV cluster covariance',np.sqrt(cov[3,3]),expected['iv']['se'])
near('same-sample ratio',rf[3]/fs[3],beta[3])
near('one excluded instrument t-squared',fs[3]**2/fsvar[3,3],expected['first']['clusterT2'])

for candidate in [-1e6,-10.,-1.,0.,.136173,1.,10.,1e6]:
    test=w.copy();test['transformed']=test.lhwage.astype(float)-candidate*test.yeduc.astype(float)
    b,v,*_=matrices(test,'transformed')
    observed=b[3]**2/v[3,3]
    check(f'direct AR beta={candidate}',observed<=expected['ar']['critical2'])
q=expected['ar']['quadratic'];discriminant=q[1]**2-4*q[0]*q[2]
check('AR analytic all-real set',q[0]<0 and discriminant<0 and expected['ar']['kind']=='all-real')

for age in [2,6,12,17,24]:
    def gap(k):
        a=d.loc[d.age.eq(k)]
        means=[np.average(a.loc[a.recp.eq(h),'yeduc'].to_numpy(float),weights=a.loc[a.recp.eq(h),'weight'].to_numpy(float)) for h in [0,1]]
        return means[1]-means[0]
    target=next(r for r in expected['cohorts'] if r['age74']==age)
    near(f'independent cohort contrast age={age}',gap(age)-gap(12),target['beta'])
out=ROOT/'output/statistical-analysis-policy';out.mkdir(parents=True,exist_ok=True)
(out/'independent-numeric-audit.json').write_text(json.dumps({'checked':len(checks),'checks':checks,'failures':[]},indent=2)+'\n',encoding='utf-8')
print(f'Independent checks: {len(checks)}, failures: 0')
