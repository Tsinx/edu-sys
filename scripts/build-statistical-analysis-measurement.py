"""Reproduce lectures 6–7. Offline after archiving the official UCI download."""
from pathlib import Path
import csv
import hashlib
import io
import json
import zipfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/course/statistical-analysis/data'
SEED = 20261011
KEYS = ['R1', 'R2', 'R3', 'T1', 'T2', 'T3']
FEATURES = ['Fresh', 'Milk', 'Grocery', 'Frozen', 'Detergents_Paper', 'Delicassen']
LABELS = ['生鲜', '乳品', '杂货', '冷冻', '清洁纸品', '熟食']
PLOTS, TABLES = {}, {}

def table(key, headers, rows):
    TABLES[key] = dict(headers=headers, rows=rows)

def series(label, values, color='teal', kind='points'):
    return dict(label=label, values=np.asarray(values).tolist(), color=color, kind=kind)

def plot(key, xlabel, ylabel, values, **kwargs):
    PLOTS[key] = dict(xlabel=xlabel, ylabel=ylabel, series=values, **kwargs)

def alpha(x):
    k = x.shape[1]
    return float(k / (k - 1) * (1 - x.var(axis=0, ddof=1).sum() / x.sum(axis=1).var(ddof=1)))

def pca(x):
    mean = x.mean(axis=0)
    centered = x - mean
    _, s, vt = np.linalg.svd(centered, full_matrices=False)
    weights = vt.T
    for j in range(weights.shape[1]):
        if weights[np.argmax(np.abs(weights[:, j])), j] < 0:
            weights[:, j] *= -1
    scores = centered @ weights
    eigen = s ** 2 / (len(x) - 1)
    return dict(mean=mean.tolist(), weights=weights.tolist(), scores=scores.tolist(),
                eigenvalues=eigen.tolist(), explained=(eigen/eigen.sum()).tolist())

def rounded(x, digits=3):
    return f'{float(x):.{digits}f}'

def build_survey():
    rng = np.random.default_rng(SEED)
    latent = rng.multivariate_normal([0, 0], [[1, .3], [.3, 1]], 240)
    continuous = np.column_stack([latent[:, j//3] + rng.normal(0, .55, 240) for j in range(6)])
    scored = (np.digitize(continuous, [-1.1, -.35, .35, 1.1]) + 1).astype(float)
    raw = scored.copy()
    raw[:, 5] = 6 - raw[:, 5]
    # Missing responses remain missing, including a respondent who skips a whole domain.
    for i in range(16, 226, 21):
        raw[i, 1] = np.nan
    for i in range(30, 231, 25):
        raw[i, 5] = np.nan
    raw[36, :3] = np.nan
    raw[8, :] = 3  # A quality flag is not an automatic exclusion rule.
    scored = raw.copy()
    scored[:, 5] = 6 - scored[:, 5]
    complete = scored[np.isfinite(scored).all(axis=1)]
    durations = np.maximum(12, rng.lognormal(4.4, .35, 240)).round().astype(int)
    durations[8] = 13
    records = []
    for i, row in enumerate(raw):
        counts = [int(np.isfinite(scored[i, j:j+3]).sum()) for j in [0, 3]]
        domain = [float(np.nanmean(scored[i, j:j+3])) if counts[d] >= 2 else None for d, j in enumerate([0, 3])]
        records.append(dict(id=f'S{i+1:03}', responses=[int(v) if np.isfinite(v) else None for v in row],
                            recoded=[int(v) if np.isfinite(v) else None for v in scored[i]],
                            seconds=int(durations[i]), available=counts, domainScores=domain))
    distribution = []
    for j, key in enumerate(KEYS):
        valid = scored[np.isfinite(scored[:, j]), j]
        distribution.append(dict(item=key, n=len(valid), missing=240-len(valid), counts=[int((valid==k).sum()) for k in range(1, 6)]))
    domains = []
    for start, name in [(0, '服务响应'), (3, '信息透明')]:
        x = scored[np.isfinite(scored[:, start:start+3]).all(axis=1), start:start+3]
        domains.append(dict(name=name, n=len(x), k=3, alpha=alpha(x)))
    reliability = dict(domains=domains, completeN=len(complete), allAlpha=alpha(complete),
                       unreversedAlpha=alpha(raw[np.isfinite(raw).all(axis=1)]),
                       duplicateN=domains[0]['n'], duplicateAlpha=alpha(np.tile(scored[np.isfinite(scored[:, :3]).all(axis=1), :3], (1, 2))))
    items = [
        ['R1', '服务响应', '我提出问题后，很快得到了回应。', '正向'],
        ['R2', '服务响应', '工作人员帮助我解决了提出的问题。', '正向'],
        ['R3', '服务响应', '需要帮助时，我能找到工作人员。', '正向'],
        ['T1', '信息透明', '购买前，我能清楚了解关键费用。', '正向'],
        ['T2', '信息透明', '工作人员清楚解释了我关心的商品信息。', '正向'],
        ['T3', '信息透明', '结账前，关键费用仍不清楚。', '反向'],
    ]
    table('survey-items', ['题号', '内容范围', '本次购买的陈述', '计分'], items)
    table('survey-records', ['答卷', *KEYS], [[r['id'], *['NA' if v is None else v for v in r['responses']]] for r in [records[0], records[8], records[16], records[30], records[36]]])
    table('survey-recode', ['原始T3', '1', '2', '3', '4', '5', 'NA'], [['计分后', '5', '4', '3', '2', '1', 'NA']])
    table('survey-scores', ['答卷', '响应有效题数', '响应均分', '透明有效题数', '透明均分'], [[r['id'], r['available'][0], 'NA' if r['domainScores'][0] is None else rounded(r['domainScores'][0], 2), r['available'][1], 'NA' if r['domainScores'][1] is None else rounded(r['domainScores'][1], 2)] for r in [records[0], records[16], records[30], records[36]]])
    table('survey-alpha', ['计分集合', '完整答卷n', '题数k', 'α'], [[d['name'], d['n'], 3, rounded(d['alpha'])] for d in domains] + [['六题合计', len(complete), 6, rounded(reliability['allAlpha'])]])
    table('survey-duplicates', ['计分集合', '题数', 'α', '新增内容'], [['原有响应三题', 3, rounded(domains[0]['alpha']), '原有三个角度'], ['三题逐题复制一次', 6, rounded(reliability['duplicateAlpha']), '没有新增']])
    table('survey-reverse-alpha', ['六题处理', '完整答卷n', 'α'], [['T3尚未反向', len(complete), rounded(reliability['unreversedAlpha'])], ['T3按6−x计分', len(complete), rounded(reliability['allAlpha'])]])
    with (OUT/'survey-teaching.csv').open('w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(['id', *KEYS, 'seconds', 'responseScore', 'transparencyScore'])
        for r in records:
            writer.writerow([r['id'], *['' if v is None else v for v in r['responses']], r['seconds'], *['' if v is None else v for v in r['domainScores']]])
    return dict(seed=SEED, rows=records, items=items, distribution=distribution,
                correlation=np.corrcoef(complete.T).tolist(), reliability=reliability,
                scoring='T3=6−raw; preserve NA; each 3-item domain requires >=2 answered items; alpha uses complete cases within its stated item set; no automatic quality exclusions.')

def build_wholesale():
    archive = OUT/'wholesale-customers-uci.zip'
    with zipfile.ZipFile(archive) as z:
        rawbytes = z.read('Wholesale customers data.csv')
    (OUT/'wholesale-customers.csv').write_bytes(rawbytes)
    rows = list(csv.DictReader(io.StringIO(rawbytes.decode('utf-8-sig'))))
    x = np.array([[int(r[k]) for k in FEATURES] for r in rows], dtype=float)
    assert x.shape == (440, 6) and np.isfinite(x).all() and (x>=0).all()
    logx = np.log1p(x)
    mean, sd = logx.mean(axis=0), logx.std(axis=0, ddof=1)
    z = (logx-mean)/sd
    model = pca(z)
    weights = np.array(model['weights']); scores = np.array(model['scores']); eigen = np.array(model['eigenvalues'])
    correlation_loadings = weights * np.sqrt(eigen)
    raw_covariance = pca(x)
    raw_scaled = pca((x-x.mean(axis=0))/x.std(axis=0, ddof=1))
    ids = [f'W{i+1:03}' for i in range(440)]
    channel = np.array([int(r['Channel']) for r in rows]); region = np.array([int(r['Region']) for r in rows])
    flagged = np.argsort(np.linalg.norm(z, axis=1))[-5:]
    keep = np.ones(440, dtype=bool); keep[flagged] = False
    sensitivity = pca(z[keep])  # Hold the original scale fixed; recenter retained observations.
    reconstructions = []
    for k in range(1, 7):
        fitted = scores[:, :k] @ weights[:, :k].T
        error = float(np.square(z-fitted).sum()/(len(z)-1))
        assert abs(error-eigen[k:].sum()) < 1e-10
        reconstructions.append(dict(k=k, retained=float(eigen[:k].sum()), discarded=float(eigen[k:].sum()), error=error))
    table('wholesale-raw', ['记录', *LABELS], [[ids[i], *x[i].astype(int).tolist()] for i in range(4)])
    table('wholesale-scale', ['指标', '原值均值', '原值SD', 'log(1+x)均值', 'log(1+x)SD'], [[LABELS[j], rounded(x[:,j].mean(), 1), rounded(x[:,j].std(ddof=1), 1), rounded(mean[j]), rounded(sd[j])] for j in range(6)])
    table('wholesale-eigen', ['成分', '特征值λ', '方差比例', '累计比例'], [[f'PC{j+1}', rounded(eigen[j]), f'{model["explained"][j]*100:.1f}%', f'{sum(model["explained"][:j+1])*100:.1f}%'] for j in range(6)])
    table('wholesale-weights', ['指标', 'PC1系数w', 'PC2系数w', 'PC3系数w'], [[LABELS[j], *[rounded(weights[j,k]) for k in range(3)]] for j in range(6)])
    table('wholesale-loadings', ['指标', 'PC1相关载荷', 'PC2相关载荷'], [[LABELS[j], rounded(correlation_loadings[j,0]), rounded(correlation_loadings[j,1])] for j in range(6)])
    table('wholesale-example', ['W001指标', '标准化值z', 'PC1系数w', '贡献z×w'], [[LABELS[j], rounded(z[0,j]), rounded(weights[j,0]), rounded(z[0,j]*weights[j,0])] for j in range(6)])
    reconstructed = scores[0, :2] @ weights[:, :2].T
    table('wholesale-reconstruction', ['W001指标', '原始z', '两成分还原z', '被舍弃的差'], [[LABELS[j], rounded(z[0,j]), rounded(reconstructed[j]), rounded(z[0,j]-reconstructed[j])] for j in range(6)])
    table('wholesale-preprocessing', ['输入方式', 'PC1比例', '前两成分比例', '保留的变异'], [[name, f'{m["explained"][0]*100:.1f}%', f'{sum(m["explained"][:2])*100:.1f}%', target] for name,m,target in [('原值，仅中心化',raw_covariance,'原始金额'),('原值，再标准化',raw_scaled,'原值的标准化变异'),('log(1+x)，再标准化',model,'对数值的标准化变异')]])
    table('wholesale-sensitivity', ['比较', '样本n', '前两成分比例', 'PC1方向一致度'], [['全部记录', 440, f'{sum(model["explained"][:2])*100:.1f}%', '1.000'], ['暂不含五条高范数记录', 435, f'{sum(sensitivity["explained"][:2])*100:.1f}%', rounded(abs(np.dot(weights[:,0], np.array(sensitivity['weights'])[:,0]))) ]])
    table('wholesale-reconstruction-error', ['保留成分k', '保留方差', '舍弃方差', '平方还原损失'], [[a['k'], rounded(a['retained']), rounded(a['discarded']), rounded(a['error'])] for a in reconstructions])
    table('wholesale-sign', ['表达', '生鲜系数', '杂货系数', 'W001得分'], [['本课PC1', rounded(weights[0,0]), rounded(weights[2,0]), rounded(scores[0,0])], ['整列乘以−1', rounded(-weights[0,0]), rounded(-weights[2,0]), rounded(-scores[0,0])]])
    table('wholesale-channel', ['补充标签', '样本n', '进入PCA拟合？'], [['餐饮酒店 Channel=1', int((channel==1).sum()), '否'], ['零售 Channel=2', int((channel==2).sum()), '否'], ['地区 Region=1/2/3', '77 / 47 / 316', '否']])
    for key, data, xlabel, ylabel in [('wholesale-raw-cloud',x,'乳品年采购额（货币单位）','杂货年采购额（货币单位）'),('wholesale-z-cloud',z,'乳品：log后标准化','杂货：log后标准化')]:
        plot(key, xlabel, ylabel, [series('440条公开记录', data[:, [1,2]])])
    for key, values, xlabel in [('wholesale-hist-raw',x[:,2],'杂货年采购额（货币单位）'),('wholesale-hist-log',logx[:,2],'log(1+杂货采购额)')]:
        counts, edges = np.histogram(values, bins=12)
        plot(key, xlabel, '记录数', [series('相同440条记录', np.column_stack([(edges[:-1]+edges[1:])/2, counts]), kind='bars')], barWidth=float(edges[1]-edges[0]))
    plot('wholesale-scree', '成分编号', '特征值λ', [series('log后标准化PCA', np.column_stack([np.arange(1,7),eigen]), kind='line')], xmin=1,xmax=6,ymin=0)
    plot('wholesale-cumulative', '保留成分数k', '累计保留方差（%）', [series('累计方差比例',np.column_stack([np.arange(0,7),[0,*np.cumsum(model['explained'])*100]]),kind='line')],xmin=0,xmax=6,ymin=0,ymax=100)
    plot('wholesale-scores','PC1得分','PC2得分',[series('440条记录',scores[:,:2])])
    plot('wholesale-channel-scores','PC1得分','PC2得分',[series('餐饮酒店 n=298',scores[channel==1,:2],'amber'),series('零售 n=142',scores[channel==2,:2],'teal')])
    for value, name in [(1,'里斯本'),(2,'波尔图'),(3,'其他地区')]:
        plot(f'wholesale-region-{value}','PC1得分','PC2得分',[series(f'{name} n={int((region==value).sum())}',scores[region==value,:2])],xmin=float(scores[:,0].min()-.3),xmax=float(scores[:,0].max()+.3),ymin=float(scores[:,1].min()-.3),ymax=float(scores[:,1].max()+.3))
    plot('wholesale-error','保留成分数k','舍弃的标准化方差',[series('还原损失',[[a['k'],a['error']] for a in reconstructions],kind='line')],xmin=1,xmax=6,ymin=0)
    return dict(source='https://archive.ics.uci.edu/dataset/292/wholesale+customers',doi='10.24432/C5030X',license='CC BY 4.0',
                archiveSHA256=hashlib.sha256(archive.read_bytes()).hexdigest(),csvSHA256=hashlib.sha256(rawbytes).hexdigest(),
                features=FEATURES,labels=LABELS,rows=rows,ids=ids,raw=x.tolist(),log=logx.tolist(),
                center=mean.tolist(),scale=sd.tolist(),standardized=z.tolist(),correlation=np.corrcoef(z.T).tolist(),
                model=model,correlationLoadings=correlation_loadings.tolist(),rawCovariance=raw_covariance,rawScaled=raw_scaled,
                sensitivity=dict(excludedIDs=[ids[i] for i in flagged], model=sensitivity),reconstructions=reconstructions,
                policy='Six annual expenditure columns only; log1p then sample-SD standardization; full 440-row descriptive fit; Channel and Region are supplementary; signs anchored by largest absolute coefficient; no customer quality or causal ranking.')

def build_geometry():
    x = np.arange(-2, 2.1, .5)
    y = .8*x + np.array([-.2,.15,-.15,.1,0,-.1,.15,-.15,.2])
    points = np.column_stack([x,y])
    model=pca(points); w=np.array(model['weights']); scores=np.array(model['scores'])
    fitted=scores[:, :1] @ w[:, :1].T
    table('geometry-score', ['观测', '中心化x', '中心化y', 'PC1得分', 'PC2得分'], [[f'G{i+1:02}', rounded(x[i],2),rounded(y[i],2),rounded(scores[i,0]),rounded(scores[i,1])] for i in [0,4,8]])
    table('geometry-variance', ['坐标', '样本方差', '含义'], [['PC1',rounded(model['eigenvalues'][0]),'沿第一方向的分散'],['PC2',rounded(model['eigenvalues'][1]),'剩余正交方向的分散'],['两者之和',rounded(sum(model['eigenvalues'])),'等于原两列总方差']])
    return dict(points=points.tolist(),model=model,projection=fitted.tolist(),selected=8)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    survey=build_survey(); wholesale=build_wholesale(); geometry=build_geometry()
    bundle=dict(survey=survey,wholesale=wholesale,geometry=geometry,plots=PLOTS,tables=TABLES)
    dest=ROOT/'packages/course-content/src/statistical-analysis/measurement-data.json'
    dest.write_text(json.dumps(bundle,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n',encoding='utf-8')
    (OUT/'provenance-measurement.json').write_text(json.dumps(dict(seed=SEED,wholesale={k:wholesale[k] for k in ['source','doi','license','archiveSHA256','csvSHA256','features','policy']},surveyScoring=survey['scoring'],units='UCI monetary units per year; no currency or observation year invented'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(survey=survey['reliability'],pcaExplained=wholesale['model']['explained'],weights=wholesale['model']['weights'],plots=len(PLOTS),tables=len(TABLES)),ensure_ascii=False))

if __name__=='__main__':
    main()
