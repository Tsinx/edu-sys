"""Independent numerical acceptance: raw CSV -> GLM Newton, dummy OLS, CR1."""
import os
for key in ['OPENBLAS_NUM_THREADS','MKL_NUM_THREADS','OMP_NUM_THREADS']: os.environ[key]='1'
from pathlib import Path
import csv,json
import numpy as np
from scipy.linalg import lstsq
from scipy.special import expit
ROOT=Path(__file__).resolve().parents[1]
D=json.loads((ROOT/'packages/course-content/src/statistical-analysis/causal-data.json').read_text(encoding='utf-8'))
rows=list(csv.DictReader((ROOT/'docs/course/statistical-analysis/data/training-panel.csv').open(encoding='utf-8')))
stores=list(csv.DictReader((ROOT/'docs/course/statistical-analysis/data/training-stores.csv').open(encoding='utf-8')))
checks=0
def near(a,b,tol=1e-8):
 global checks
 assert np.allclose(a,b,atol=tol,rtol=tol),(np.max(np.abs(np.array(a)-np.array(b))),tol)
 checks+=1
assert len(rows)==2880 and len(stores)==120
assert len({(r['id'],r['month']) for r in rows})==2880
sales=np.array([float(r['sales']) for r in rows]).reshape(120,24)
d=np.array([int(s['treated']) for s in stores])
z=np.array([int(r['training']) for r in rows],float)
near(z.reshape(120,24),d[:,None]*(np.arange(1,25)>=13))
before=sales[:,:12].mean(1);after=sales[:,12:].mean(1)
near(before,[s['before'] for s in D['stores']]);near(after,[s['after'] for s in D['stores']])
raw=np.column_stack((before,[float(s['area']) for s in stores],[int(s['urban']) for s in stores]))
x=np.column_stack((np.ones(120),(raw-raw.mean(0))/raw.std(0,ddof=1)))
b=np.zeros(4)
for _ in range(40):
 e=expit(x@b);score=x.T@(d-e);info=x.T@((e*(1-e))[:,None]*x)
 delta=np.linalg.solve(info,score);b+=delta
 if np.max(np.abs(delta))<1e-12: break
e=expit(x@b);near(e,[s['propensity'] for s in D['stores']],2e-7)
logit=x@b;caliper=.2*logit.std(ddof=1);near(caliper,D['matching']['caliper'],2e-7)
c=np.where(d==0)[0];pairs=[]
for i in np.where(d==1)[0]:
 j=c[np.argmin(abs(logit[c]-logit[i]))]
 if abs(logit[j]-logit[i])<=caliper:pairs.append((i,j))
near(pairs,np.array(D['matching']['pairs'])[:,:2])
ti,ci=np.array(pairs).T
near(np.mean(after[ti]-after[ci]),D['matching']['estimate'])
w=e/(1-e);wc=w[d==0]
near(after[d==1].mean()-np.average(after[d==0],weights=wc),D['weighting']['estimate'],2e-7)
near(wc.sum()**2/(wc@wc),D['weighting']['essControl'],2e-7)
for j,item in enumerate(D['balance']):
 denom=np.sqrt((raw[d==1,j].var(ddof=1)+raw[d==0,j].var(ddof=1))/2)
 near(denom,item['denominator'])
 near((raw[ti,j].mean()-raw[ci,j].mean())/denom,item['matchedSmd'])
 near((raw[d==1,j].mean()-np.average(raw[d==0,j],weights=wc))/denom,item['weightedSmd'],2e-7)
near(np.quantile(D['weighting']['bootstrap'],[.025,.975]),D['weighting']['ci'])
assert len(D['weighting']['bootstrap'])==499
y=sales.ravel();ids=np.repeat(np.arange(120),24);month=np.tile(np.arange(24),120)
for kind in ['pooled','fe','twfe']:
 if kind=='pooled': X=np.column_stack((np.ones(2880),z))
 else:
  X=np.column_stack((np.eye(120)[ids],z))
  if kind=='twfe':X=np.column_stack((X[:,:-1],np.eye(24)[month,1:],z))
 fit=lstsq(X,y,lapack_driver='gelsy')[0];res=y-X@fit
 bread=np.linalg.inv(X.T@X)
 scores=np.array([X[ids==i].T@res[ids==i] for i in range(120)])
 cov=bread@(scores.T@scores)@bread*(120/119)*(2879/(2880-X.shape[1]))
 m=next(m for m in D['models'] if m['kind']==kind)
 near(fit[-1],m['beta']);near(np.sqrt(cov[-1,-1]),m['se'])
 near(res,m['residuals'])
 near(m['n'],2880);near(m['clusters'],120)
result={'checks':checks,'uniqueStoreMonths':len(rows),'matchingPairs':len(pairs),'independentMethods':['CSV aggregation','Newton propensity','dummy-variable QR OLS','full-matrix cluster sandwich'],'passed':True}
out=ROOT/'output/statistical-analysis-causal';out.mkdir(parents=True,exist_ok=True)
(out/'numeric-acceptance.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
