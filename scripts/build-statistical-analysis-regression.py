"""Reproducible evidence for lectures 3–5. Does not modify the original 480 rows.
Run with dependencies in docs/course/statistical-analysis/data/requirements.txt.
"""
from pathlib import Path
import hashlib, io, json, zipfile
import numpy as np
import pandas as pd
import scipy.stats as st
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve, roc_auc_score, precision_recall_curve, average_precision_score, confusion_matrix, brier_score_loss
from sklearn.calibration import calibration_curve

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'packages/course-content/src/statistical-analysis/regression-data.json'
raw=(ROOT/'packages/course-content/src/statistical-analysis/data.json').read_bytes()
old=json.loads(raw); people=pd.DataFrame(old['people']); rng=np.random.default_rng(20260920)
plots={}; tables={}; models={}
def arr(x): return np.asarray(x).tolist()
def series(x,y,label='观测',kind='points',color='teal'):
    return dict(label=label,kind=kind,color=color,values=np.column_stack([x,y]).tolist())
def plot(key,xlabel,ylabel,ss,**kw): plots[key]=dict(xlabel=xlabel,ylabel=ylabel,series=ss,**kw)
def table(key,headers,rows): tables[key]=dict(headers=headers,rows=rows)
def fit(y,x): return sm.OLS(np.asarray(y),sm.add_constant(np.asarray(x),has_constant='add')).fit()
def summary(m,names):
    return dict(n=int(m.nobs),r2=float(m.rsquared),adjR2=float(m.rsquared_adj),rmse=float(np.sqrt(np.mean(m.resid**2))),coefficients=[dict(name=n,b=float(b),se=float(e),lo=float(ci[0]),hi=float(ci[1]),p=float(p)) for n,b,e,ci,p in zip(names,m.params,m.bse,m.conf_int(),m.pvalues)])
def coefficient_table(key,m,names):
    table(key,['变量','系数','标准误','95% CI'],[[n,f'{b:.2f}',f'{e:.2f}',f'[{lo:.2f}, {hi:.2f}]'] for n,b,e,(lo,hi) in zip(names,m.params,m.bse,m.conf_int())])
def residual(key,m,x=None,xlabel='拟合值'):
    xx=m.fittedvalues if x is None else x
    plot(key,xlabel,'残差', [series(xx,m.resid),series([min(xx),max(xx)],[0,0],'零残差','line','ink')])

# Lecture 3: unchanged retail sample. Income is in 1000 yuan.
y=people.spend.to_numpy(); income=people.income.to_numpy()/1000; member=people.member.astype(int).to_numpy(); city=(people.city=='甲').astype(int).to_numpy()
Xs=[member,np.column_stack([member,city]),np.column_stack([member,city,income]),np.column_stack([member,city,income,people.age])]
names=[['截距','会员'],['截距','会员','甲城'],['截距','会员','甲城','收入（千元）'],['截距','会员','甲城','收入（千元）','年龄']]
fits=[fit(y,x) for x in Xs]; simple=fit(y,income); grid=np.linspace(min(income),max(income),80); pred=simple.get_prediction(sm.add_constant(grid)).summary_frame()
for i,m in enumerate(fits): models[f'retail{i+1}']=summary(m,names[i]); coefficient_table(f'retail{i+1}',m,names[i])
models['income']=summary(simple,['截距','收入（千元）']); coefficient_table('income',simple,['截距','收入（千元）'])
plot('retail-cloud','月收入（千元）','月消费（元）',[series(income,y)],xmin=0,ymin=0)
plot('retail-line','月收入（千元）','月消费（元）',[series(income,y),series(grid,pred['mean'],'OLS拟合','line','amber')],xmin=0,ymin=0)
plot('retail-city','月收入（千元）','月消费（元）',[series(income[city==c],y[city==c],label,color=col) for c,label,col in [(0,'乙城','teal'),(1,'甲城','amber')]],xmin=0,ymin=0)
for key,lo,hi,label in [('mean-ci','mean_ci_lower','mean_ci_upper','均值95% CI'),('prediction','obs_ci_lower','obs_ci_upper','个体95%预测区间')]:
    plot(key,'月收入（千元）','月消费（元）',[series(income,y),series(grid,pred['mean'],'拟合均值','line','ink')],bands=[dict(x=arr(grid),lo=arr(pred[lo]),hi=arr(pred[hi]),label=label)])
residual('retail-residual',simple)
chosen=0; obs=float(y[chosen]); yh=float(simple.fittedvalues[chosen]); xx=float(income[chosen])
plot('one-residual','月收入（千元）','月消费（元）',[series(grid,pred['mean'],'拟合直线','line','teal'),series([xx,xx],[yh,obs],'残差','line','amber'),series([xx],[obs],'C001观测',color='amber'),series([xx],[yh],'C001预测',color='ink')])
table('one-customer',['C001','金额 / 数值'],[['收入（千元）',f'{xx:.3f}'],['观测消费（元）',f'{obs:.2f}'],['拟合消费（元）',f'{yh:.2f}'],['残差（元）',f'{obs-yh:.2f}']])
bs=np.linspace(simple.params[1]-65,simple.params[1]+65,101)
plot('loss','斜率（元/千元）','残差平方和（百万元²）',[series(bs,[np.sum((y-(y.mean()-b*income.mean()+b*income))**2)/1e6 for b in bs],'截距随斜率调整','line','amber')])
table('city-means',['范围','会员均值','非会员均值','差值'],[['总体','650','500','+150'],['甲城','750','800','−50'],['乙城','350','400','−50']])
table('coef-path',['模型','会员系数','95% CI','R²'],[[f'M{i+1}',f'{m.params[1]:.2f}',f'[{m.conf_int()[1,0]:.2f}, {m.conf_int()[1,1]:.2f}]',f'{m.rsquared:.3f}'] for i,m in enumerate(fits)])
plot('coef-path','模型序号','会员系数（元）',[series(range(1,5),[m.params[1] for m in fits],'点估计','line','amber')],intervals=[dict(x=i+1,lo=float(m.conf_int()[1,0]),hi=float(m.conf_int()[1,1])) for i,m in enumerate(fits)],xticks=[1,2,3,4])
plot('adjusted-lines','月收入（千元）','拟合消费（元）',[series(grid,fits[2].predict(np.column_stack([np.ones(len(grid)),np.full(len(grid),g),np.full(len(grid),c),grid])),lab,'line',col) for g,c,lab,col in [(0,0,'乙城非会员','teal'),(1,0,'乙城会员','amber'),(0,1,'甲城非会员','ink'),(1,1,'甲城会员','red')]])
# Fixed random split within this simulation; visits intentionally labelled leakage.
perm=np.random.default_rng(3901).permutation(len(y)); train,test=perm[:360],perm[360:]
candidate=[('均值基准',np.zeros((480,0))),('会员+城市',Xs[1]),('再加收入',Xs[2]),('再加年龄',Xs[3]),('含泄漏次数',np.column_stack([Xs[3],people.visits]))]
holdout=[]
for name,x in candidate:
    m=fit(y[train],x[train]); yh=m.predict(sm.add_constant(x[test],has_constant='add'))
    holdout.append([name,f'{m.rsquared:.3f}',f'{m.rsquared_adj:.3f}',f'{np.sqrt(np.mean(m.resid**2)):.1f}',f'{np.sqrt(np.mean((y[test]-yh)**2)):.1f}'])
table('holdout',['模型','训练R²','调整R²','训练RMSE','留出RMSE'],holdout)
models['split']=dict(seed=3901,train=arr(train),test=arr(test))

# Lecture 4: independent controlled mechanisms, never disguised as retail results.
x=np.linspace(0,10,180); noise=rng.normal(0,2,len(x)); linear=4+2*x+noise; curved=4+2*x+.65*(x-5)**2+noise; hetero=4+2*x+rng.normal(size=len(x))*(.5+.7*x)
diag={}; synthetic={}
for key,yy in [('linear',linear),('curved',curved),('hetero',hetero)]:
    m=fit(yy,x); diag[key]=m; synthetic[key]=dict(x=arr(x),y=arr(yy)); models[key]=summary(m,['截距','x'])
    plot(key,'投入 x（模拟单位）','产出 y（模拟单位）',[series(x,yy),series(x,m.fittedvalues,'线性拟合','line','amber')]); residual(f'{key}-residual',m)
quad=fit(curved,np.column_stack([x,x*x])); models['quadratic']=summary(quad,['截距','x','x²']); residual('quadratic-residual',quad)
plot('quadratic','投入 x','产出 y',[series(x,curved),series(x,quad.fittedvalues,'二次拟合','line','amber')])
logy=np.exp(1+.2*x+rng.normal(0,.23,len(x))); logfit=fit(np.log(logy),x); synthetic['log']=dict(x=arr(x),y=arr(logy)); models['log']=summary(logfit,['截距','x'])
plot('log-raw','投入 x','正值产出 y',[series(x,logy),series(x,np.exp(logfit.fittedvalues),'exp(拟合log y)','line','amber')])
plot('log-fit','投入 x','ln(y)',[series(x,np.log(logy)),series(x,logfit.fittedvalues,'对数线性拟合','line','amber')]); residual('log-residual',logfit)
err=np.zeros(180)
for i in range(1,180): err[i]=.8*err[i-1]+rng.normal()
serial=fit(4+2*x+err,x); synthetic['serial']=dict(x=arr(x),y=arr(4+2*x+err)); residual('serial',serial,np.arange(1,181),'记录顺序 t')
plot('lag','前一期残差','本期残差',[series(serial.resid[:-1],serial.resid[1:])])
for key,m in [('normal',diag['linear']),('hetero',diag['hetero'])]:
    ordered=st.probplot(m.resid,dist='norm',fit=False); qx,qy=ordered
    plot(f'qq-{key}','标准正态理论分位数','排序后的残差',[series(qx,qy),series([min(qx),max(qx)],[np.mean(qy)+np.std(qy,ddof=1)*min(qx),np.mean(qy)+np.std(qy,ddof=1)*max(qx)],'位置尺度参考线','line','amber')])
base_x=np.linspace(0,10,50); base_y=3+1.6*base_x+rng.normal(0,1.3,50); base=fit(base_y,base_x)
for key,extra in [('outlier',(5,29)),('leverage',(19,33.4)),('influence',(19,2))]:
    ax=np.r_[base_x,extra[0]]; ay=np.r_[base_y,extra[1]]; m=fit(ay,ax); inf=m.get_influence(); models[key]=summary(m,['截距','x']); synthetic[key]=dict(x=arr(ax),y=arr(ay)); gx=np.array([0,20])
    plot(key,'x','y',[series(base_x,base_y),series([extra[0]],[extra[1]],'待核查点',color='red'),series(gx,m.predict(sm.add_constant(gx)),'包含该点','line','amber'),series(gx,base.predict(sm.add_constant(gx)),'其余50点','line','ink')],xmin=0,xmax=20)
    plot(f'{key}-cook','观测序号','Cook距离',[series(np.arange(1,52),inf.cooks_distance[0],'影响诊断')])
    table(f'{key}-compare',['拟合范围','斜率','R²'],[['全部51点',f'{m.params[1]:.3f}',f'{m.rsquared:.3f}'],['其余50点（敏感性）',f'{base.params[1]:.3f}',f'{base.rsquared:.3f}']])
z=x+rng.normal(0,.12,len(x)); cy=3+2*x+1*z+rng.normal(0,2,len(x)); cm=fit(cy,np.column_stack([x,z])); synthetic['collinear']=dict(x=arr(x),z=arr(z),y=arr(cy)); models['collinear']=summary(cm,['截距','x','z']); coefficient_table('collinear',cm,['截距','x','z'])
plot('collinear','解释变量 x','解释变量 z',[series(x,z)])
vif=float(variance_inflation_factor(sm.add_constant(np.column_stack([x,z])),1)); table('vif',['诊断量','本次结果'],[['corr(x,z)',f'{np.corrcoef(x,z)[0,1]:.5f}'],['VIF(x)',f'{vif:.1f}'],['VIF(z)',f'{vif:.1f}']])
hc=diag['hetero'].get_robustcov_results(cov_type='HC3'); models['heteroHC3']=summary(hc,['截距','x'])
table('hc3',['同一斜率估计','系数','标准误','95% CI'],[[label,f'{m.params[1]:.3f}',f'{m.bse[1]:.3f}',f'[{m.conf_int()[1,0]:.3f}, {m.conf_int()[1,1]:.3f}]'] for label,m in [('常规OLS',diag['hetero']),('HC3稳健',hc)]])
table('diagnostic-models',['同一弯曲样本','R²','残差RMSE'],[['直线',f'{diag["curved"].rsquared:.3f}',f'{np.sqrt(np.mean(diag["curved"].resid**2)):.3f}'],['二次项',f'{quad.rsquared:.3f}',f'{np.sqrt(np.mean(quad.resid**2)):.3f}']])

# Lecture 5: moderation; pointwise t intervals retain coefficient covariance.
mx=rng.uniform(1,9,240); mz=rng.uniform(1,5,240); my=20+2*mx+3*(mz-3)+1.7*mx*(mz-3)+rng.normal(0,5,240)
design=np.column_stack([mx,mz-3,mx*(mz-3)]); mm=fit(my,design); models['moderation']=summary(mm,['截距','x','z−3','x(z−3)']); coefficient_table('moderation',mm,['截距','x','z−3','x(z−3)']); synthetic['moderation']=dict(x=arr(mx),z=arr(mz),y=arr(my))
mg=np.linspace(1,9,60); ss=[]
for z0,label,col in [(1.5,'z=1.5','teal'),(3,'z=3','ink'),(4.5,'z=4.5','amber')]:
    ss.append(series(mg,mm.predict(np.column_stack([np.ones(60),mg,np.full(60,z0-3),mg*(z0-3)])),label,'line',col))
plot('moderation-lines','投入 x','拟合绩效 y',ss,xmin=1,xmax=9)
plot('parallel-lines','投入 x','示意绩效 y',[series(mg,20+2*mg+3*(z0-3),label,'line',col) for z0,label,col in [(1.5,'低z','teal'),(3,'中z','ink'),(4.5,'高z','amber')]],xmin=1,xmax=9)
plot('moderation-support','投入 x','情境 z',[series(mx,mz)],xmin=0,xmax=10,ymin=0,ymax=6)
zg=np.linspace(1,5,80); contrast=np.column_stack([np.zeros(80),np.ones(80),np.zeros(80),zg-3]); effect=contrast@mm.params; se=np.sqrt(np.einsum('ij,jk,ik->i',contrast,mm.cov_params(),contrast)); critical=st.t.ppf(.975,mm.df_resid)
plot('conditional-effect','情境 z','x的条件斜率',[series(zg,effect,'条件斜率','line','amber'),series([1,5],[0,0],'零斜率','line','ink')],bands=[dict(x=arr(zg),lo=arr(effect-critical*se),hi=arr(effect+critical*se),label='逐点95% CI')])
slopes=[]
for z0 in [1.5,3,4.5]:
    c=np.array([0,1,0,z0-3]); b=float(c@mm.params); e=float(np.sqrt(c@mm.cov_params()@c)); slopes.append([z0,f'{b:.3f}',f'{e:.3f}',f'[{b-critical*e:.3f}, {b+critical*e:.3f}]'])
table('simple-slopes',['情境z','条件斜率','标准误','95% CI'],slopes)
uncentered=fit(my,np.column_stack([mx,mz,mx*mz])); models['moderationUncentered']=summary(uncentered,['截距','x','z','xz'])
table('centering',['参数','未中心化','z−3中心化'],[[n,f'{a:.3f}',f'{b:.3f}'] for n,a,b in zip(['截距','x系数','z系数','交互系数'],uncentered.params,mm.params)])
eta=np.linspace(-6,6,100); logistic=lambda v:1/(1+np.exp(-v)); pr=logistic(eta)
plot('logistic','线性预测值 η','概率 p',[series(eta,pr,'Logit','line','teal')],ymin=0,ymax=1)
plot('lpm','解释变量 x（示意）','预测概率',[series(eta,.5+.15*eta,'线性概率示意','line','amber'),series([-6,6],[0,0],'概率下界','line','ink'),series([-6,6],[1,1],'概率上界','line','ink')])
plot('marginal','线性预测值 η','边际效应 βp(1−p)',[series(eta,pr*(1-pr),'β=1的示意','line','amber')],ymin=0)
plot('links','线性预测值 η','概率',[series(eta,pr,'Logit','line','teal'),series(eta,st.norm.cdf(eta/1.6),'Probit(η/1.6)','line','amber')],ymin=0,ymax=1)
table('odds',['概率p','优势p/(1−p)','log优势'],[[f'{p:.2f}',f'{p/(1-p):.3f}',f'{np.log(p/(1-p)):.3f}'] for p in [.1,.2,.5,.8,.9]])
table('or',['起始概率','OR=2后概率','概率差（百分点）'],[[f'{p:.2f}',f'{2*p/(1+p):.3f}',f'{100*(2*p/(1+p)-p):.1f}'] for p in [.1,.5,.8]])

# UCI original archive. No resampling, no duration, no fabricated client identifiers.
archive=ROOT/'docs/course/statistical-analysis/data/bank-marketing-uci.zip'
with zipfile.ZipFile(archive) as outer:
    inner=outer.read('bank-additional.zip')
with zipfile.ZipFile(io.BytesIO(inner)) as z:
    csv=z.read('bank-additional/bank-additional-full.csv'); description=z.read('bank-additional/bank-additional-names.txt')
(archive.parent/'bank-additional-names.txt').write_bytes(description)
bank=pd.read_csv(io.BytesIO(csv),sep=';'); assert len(bank)==41188
# Conservative inputs known before today's call. Drop contact schedule and campaign count too.
numeric=['age','previous']; categorical=['job','marital','education','default','housing','loan','poutcome']
features=numeric+categorical; target=(bank.y=='yes').astype(int).to_numpy(); n=len(bank); a=int(n*.7); b=int(n*.85)
transform=ColumnTransformer([('num',StandardScaler(),numeric),('cat',OneHotEncoder(handle_unknown='ignore'),categorical)])
pipe=make_pipeline(transform,LogisticRegression(C=1,solver='lbfgs',max_iter=3000)); pipe.fit(bank.iloc[:a][features],target[:a]); assert pipe[-1].n_iter_[0]<3000
pv=pipe.predict_proba(bank.iloc[a:b][features])[:,1]; pt=pipe.predict_proba(bank.iloc[b:][features])[:,1]
# Illustrative equal error cost: validation minimises FP+FN, tie -> highest threshold.
thresholds=np.linspace(.01,.99,99); costs=[int(np.sum((pv>=t)!=target[a:b])) for t in thresholds]; best=max(t for t,c in zip(thresholds,costs) if c==min(costs))
fpr,tpr,_=roc_curve(target[b:],pt); precision,recall,_=precision_recall_curve(target[b:],pt); fraction,mean=calibration_curve(target[b:],pt,n_bins=8,strategy='quantile')
def thin(x,y,count=180):
    ii=np.unique(np.linspace(0,len(x)-1,min(count,len(x))).astype(int)); return x[ii],y[ii]
rx,ry=thin(fpr,tpr); px,py=thin(recall,precision)
plot('roc','假阳性率 FPR','真阳性率 TPR',[series(rx,ry,'测试集ROC','line','teal'),series([0,1],[0,1],'随机排序参考','line','ink')],xmin=0,xmax=1,ymin=0,ymax=1)
prevalence=float(target[b:].mean())
plot('pr','召回率 Recall','精确率 Precision',[series(px,py,'测试集PR','line','amber'),series([0,1],[prevalence,prevalence],'测试集阳性率','line','ink')],xmin=0,xmax=1,ymin=0,ymax=1)
plot('calibration','平均预测概率','实际阳性比例',[series(mean,fraction,'8个等频分箱','line','teal'),series([0,1],[0,1],'理想校准','line','ink')],xmin=0,xmax=1,ymin=0,ymax=1)
plot('threshold','决策阈值','验证集错分数',[series(thresholds,costs,'FP + FN','line','amber')],xmin=0,xmax=1)
counts=[]
for label,slice_ in [('训练',slice(0,a)),('验证',slice(a,b)),('测试',slice(b,n))]: counts.append([label,int(len(target[slice_])),int(target[slice_].sum()),f'{target[slice_].mean()*100:.2f}%'])
table('bank-split',['时间顺序分段','记录数','认购记录','认购比例'],counts)
cmatrix=confusion_matrix(target[b:],pt>=best,labels=[0,1]); tn,fp,fn,tp=map(int,cmatrix.ravel())
table('confusion',['测试集','预测不认购','预测认购'],[['实际不认购',tn,fp],['实际认购',fn,tp]])
metrics=dict(auc=float(roc_auc_score(target[b:],pt)),ap=float(average_precision_score(target[b:],pt)),brier=float(brier_score_loss(target[b:],pt)),threshold=float(best),accuracy=float((tn+tp)/(n-b)),precision=float(tp/(tp+fp)) if tp+fp else None,recall=float(tp/(tp+fn)),prevalence=prevalence)
table('bank-metrics',['测试集指标','计算结果'],[['ROC AUC',f'{metrics["auc"]:.3f}'],['Average precision',f'{metrics["ap"]:.3f}'],['Brier（越低越好）',f'{metrics["brier"]:.3f}'],['阈值（验证集选择）',f'{best:.2f}'],['准确率',f'{metrics["accuracy"]:.3f}'],['全预测不认购的准确率',f'{1-prevalence:.3f}']])
table('bank-quality',['核查项','结果'],[['原始行数',n],['完全相同行（保留，身份未知）',int(bank.duplicated().sum())],['education=unknown',int((bank.education=='unknown').sum())],['pdays=999（不作天数）',int((bank.pdays==999).sum())],['本模型使用特征数',len(features)]])
bankmeta=dict(source='https://archive.ics.uci.edu/dataset/222/bank+marketing',doi='10.24432/C5K306',license='CC BY 4.0',file='bank-additional-full.csv',rows=n,archiveSHA256=hashlib.sha256(archive.read_bytes()).hexdigest(),csvSHA256=hashlib.sha256(csv).hexdigest(),features=features,excluded=[c for c in bank.columns if c not in features+['y']],split=[a,b-a,n-b],metrics=metrics,confusion=cmatrix.tolist(),policy='Chronological 70/15/15; preprocessing fit on train only; fixed L2 C=1; threshold min validation FP+FN with highest tie; frozen test; no duration; no client ID; duplicates retained.')
output=dict(seed=20260920,originalDataSHA256=hashlib.sha256(raw).hexdigest(),plots=plots,tables=tables,models=models,synthetic=synthetic,bank=bankmeta)
pd.DataFrame(dict(originalRow=np.arange(a+1,n+1),partition=['validation']*(b-a)+['test']*(n-b),target=target[a:],probability=np.r_[pv,pt])).to_csv(archive.parent/'bank-evaluation.csv',index=False,float_format='%.15g')
DEST.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
(archive.parent/'provenance-regression.json').write_text(json.dumps(dict(seed=output['seed'],originalDataSHA256=output['originalDataSHA256'],bank=bankmeta),ensure_ascii=False,indent=2)+'\n')
print(f'Wrote {len(plots)} plots, {len(tables)} tables; bank metrics: {metrics}')
