"""Rebuild the teaching fixtures; classroom playback never runs this script."""
from pathlib import Path
import json
import csv
import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'packages/course-content/src/statistical-analysis'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20260913)

def summary(values):
    a = np.asarray(values, dtype=float)
    n = len(a)
    q1, median, q3 = np.quantile(a, [.25, .5, .75])
    inner = a[(a >= q1-1.5*(q3-q1)) & (a <= q3+1.5*(q3-q1))]
    sd = np.std(a, ddof=1)
    se = sd / np.sqrt(n)
    ci = stats.t.interval(.95, n-1, loc=np.mean(a), scale=se)
    return dict(n=n, mean=float(np.mean(a)), median=float(median), sd=float(sd), se=float(se), q1=float(q1), q3=float(q3), low=float(min(inner)), high=float(max(inner)), ci=list(map(float, ci)))

people = []
for member, city, n, mean in [(True,'甲',180,750),(True,'乙',60,350),(False,'甲',60,800),(False,'乙',180,400)]:
    a = rng.lognormal(0,.55,n)
    a = np.round(a/a.sum()*(mean*n)*100).astype(int)
    a[-1] += mean*n*100-int(a.sum())
    for cents in a:
        spend = float(cents/100)
        people.append(dict(id=f'C{len(people)+1:03}',member=member,city=city,spend=spend,
            income=round(float(max(2500, rng.normal(11000 if city=='甲' else 6000,1500))),2),
            age=int(rng.integers(22,66)), visits=int(max(1,round(spend/150+rng.normal(0,1))))))
groups = [summary([p['spend'] for p in people if p['member']==m]) for m in [True,False]]
m, c = groups
se = np.sqrt(m['se']**2+c['se']**2)
df = (m['se']**2+c['se']**2)**2/(m['se']**4/(m['n']-1)+c['se']**4/(c['n']-1))
delta = m['mean']-c['mean']
welch = dict(delta=delta,se=float(se),df=float(df),t=float(delta/se),p=float(2*stats.t.sf(abs(delta/se),df)),ci=list(map(float,stats.t.interval(.95,df,loc=delta,scale=se))))
cells = [dict(member=member,city=city,**summary([p['spend'] for p in people if p['member']==member and p['city']==city])) for city in ['甲','乙'] for member in [True,False]]
cell_welch=[]
for a,b in [(cells[0],cells[1]),(cells[2],cells[3])]:
    va,vb=a['sd']**2/a['n'],b['sd']**2/b['n']
    se_city=(va+vb)**.5
    df_city=(va+vb)**2/(va**2/(a['n']-1)+vb**2/(b['n']-1))
    d_city=a['mean']-b['mean']
    cell_welch.append(dict(delta=d_city,se=se_city,df=df_city,ci=list(map(float,stats.t.interval(.95,df_city,loc=d_city,scale=se_city)))))
sample25 = rng.normal(500,180,(100,25))
sample100 = rng.normal(500,180,(100,100))
intervals = [dict(mean=float(a.mean()),lo=float(a.mean()-1.96*36),hi=float(a.mean()+1.96*36)) for a in sample25]
sampling = dict(mu=500,sigma=180,n=25,se=36,means25=sample25.mean(axis=1).tolist(),means100=sample100.mean(axis=1).tolist(),firstSample=sample25[0].tolist(),secondSample=sample25[1].tolist(),intervals=intervals,covered=sum(x['lo']<=500<=x['hi'] for x in intervals))
ax=[10,8,13,9,11,14,6,4,12,7,5]
anscombe = [dict(x=ax,y=[8.04,6.95,7.58,8.81,8.33,9.96,7.24,4.26,10.84,4.82,5.68]),dict(x=ax,y=[9.14,8.14,8.74,8.77,9.26,8.10,6.13,3.10,9.13,7.26,4.74]),dict(x=ax,y=[7.46,6.77,12.74,7.11,7.81,8.84,6.08,5.39,8.15,6.42,5.73]),dict(x=[8,8,8,8,8,8,8,19,8,8,8],y=[6.58,5.76,7.71,8.84,8.47,7.04,5.25,12.50,5.56,7.91,6.89])]
for a in anscombe:
    a.update(meanX=float(np.mean(a['x'])),meanY=float(np.mean(a['y'])),r=float(np.corrcoef(a['x'],a['y'])[0,1]))
monthly=[]
for i in range(24):
    customers=round(900+35*i+90*np.sin(2*np.pi*i/12))
    per=round(500+2*i+75*np.sin(2*np.pi*(i-2)/12),2)
    monthly.append(dict(month=f'{1+i//12}年{i%12+1:02}月',customers=customers,perPerson=per,total=round(customers*per,2)))
anova_values=[rng.normal(v,100,30).tolist() for v in [450,500,550]]
f,p=stats.f_oneway(*anova_values)
variables=['spend','income','age','visits']
corr=np.corrcoef([[p[k] for p in people] for k in variables]).tolist()
data=dict(label='教学模拟；观察月顾客样本 n=480',seed=20260913,people=people,groups=groups,cells=cells,cellWelch=cell_welch,welch=welch,sampling=sampling,anscombe=anscombe,monthly=monthly,correlation=corr,nullCurve=[dict(x=float(x),density=float(stats.t.pdf(x,welch['df']))) for x in np.linspace(-6,6,1201)],
    anova=dict(label='独立三店教学样本，每店30人',values=anova_values,groups=[summary(a) for a in anova_values],f=float(f),p=float(p)),
    sources=[dict(id='simulation',title='自编教学模拟',detail='固定随机种子20260913；顾客样本、正态总体抽样和全品牌月报是不同口径。顾客样本按会员分层，组内独立抽样假设用于推断演示；不能识别会员制因果效应。'),dict(id='anscombe',title='Anscombe (1973) / R datasets',url='https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/anscombe.html'),dict(id='asa',title='ASA (2016) p值声明',url='https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf'),dict(id='wilke',title='Wilke, Fundamentals of Data Visualization',url='https://clauswilke.com/dataviz/directory-of-visualizations.html')])
assert len(people)==480 and abs(delta-150)<1e-8
assert all(abs(a['meanY']-7.5)<.002 for a in anscombe)
assert all(cells[i]['mean'] < cells[i+1]['mean'] for i in [0,2])
(OUT/'data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
DOC=ROOT/'docs/course/statistical-analysis'; DOC.mkdir(parents=True,exist_ok=True)
with (DOC/'customers.csv').open('w',encoding='utf-8-sig',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=list(people[0]));writer.writeheader();writer.writerows(people)
(DOC/'sources.json').write_text(json.dumps(data['sources'],ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(groups=groups,welch=welch,coverage=sampling['covered']),ensure_ascii=False))
