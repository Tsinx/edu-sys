"""Single-threaded, deterministic teaching simulation; no classroom fitting.

Python 3 + NumPy/SciPy. All outcome tables and plots are derived from the same
120-store, 24-month panel. The latent generator is teacher audit material only.
"""
import os
for name in ('OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'OMP_NUM_THREADS'):
    os.environ[name] = '1'
from pathlib import Path
import csv
import json
import platform
import numpy as np
import scipy
from scipy.optimize import minimize
from scipy.special import expit
from scipy.stats import t as student_t

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'packages/course-content/src/statistical-analysis/causal-data.json'
AUDIT = ROOT / 'docs/course/statistical-analysis/data'
SEED = 20261017

def propensity(x, d):
    def fun(b):
        z = x @ b
        return np.logaddexp(0, z).sum() - d @ z
    def jac(b):
        return x.T @ (expit(x @ b) - d)
    fit = minimize(fun, np.zeros(x.shape[1]), jac=jac, method='BFGS', options={'gtol': 1e-7})
    if np.max(np.abs(jac(fit.x))) > 1e-4:
        raise RuntimeError('Propensity estimation failed; do not silently drop bootstrap draws')
    return expit(x @ fit.x), fit.x

def att(d, y, e):
    w = np.where(d == 1, 1., e / (1-e))
    return float(y[d == 1].mean()-np.average(y[d == 0], weights=w[d == 0]))

def main():
    rng = np.random.default_rng(SEED)
    n, months = 120, 24
    ability = rng.normal(size=n)
    area = np.clip(230+55*rng.normal(size=n)+20*ability, 90, 430)
    urban = rng.binomial(1, .55, n)
    alpha = 35+7*ability+.045*area+4*urban
    month = np.arange(1, months+1)
    common = .24*month+3*np.sin(2*np.pi*month/12)+(month >= 13)*2
    noise = np.empty((n, months))
    noise[:, 0] = rng.normal(0, 2.7, n)
    for m in range(1, months):
        noise[:, m] = .55*noise[:, m-1]+rng.normal(0, 2.2, n)
    untreated = alpha[:, None]+common+noise
    before = untreated[:, :12].mean(axis=1)
    # Baseline information is defined before assignment. No post-treatment X.
    raw = np.column_stack((before, area, urban))
    center, scale = raw.mean(axis=0), raw.std(axis=0, ddof=1)
    x = np.column_stack((np.ones(n), (raw-center)/scale))
    true_p = expit(-.1+.5*x[:, 1]+.35*x[:, 2]+.2*x[:, 3]+.5*ability)
    d = rng.binomial(1, true_p)
    active = d[:, None]*(month >= 13)
    outcome = untreated+3*active
    after = outcome[:, 12:].mean(axis=1)
    e, coefficients = propensity(x, d)
    logit = np.log(e/(1-e))
    caliper = .2*logit.std(ddof=1)
    controls = np.where(d == 0)[0]
    pairs, unmatched = [], []
    for i in np.where(d == 1)[0]:
        j = controls[np.argmin(np.abs(logit[controls]-logit[i]))]
        distance = abs(logit[i]-logit[j])
        if distance <= caliper:
            pairs.append([int(i), int(j), float(distance)])
        else:
            unmatched.append(int(i))
    ti, ci = np.array(pairs, dtype=float)[:, :2].astype(int).T
    weights = np.where(d == 1, 1., e/(1-e))
    variance = np.sqrt((raw[d == 1].var(axis=0, ddof=1)+raw[d == 0].var(axis=0, ddof=1))/2)
    balance = []
    for k, label in enumerate(['培训前月均净销售额', '营业面积', '中心区门店']):
        a, b = raw[d == 1, k].mean(), raw[d == 0, k].mean()
        ma, mb = raw[ti, k].mean(), raw[ci, k].mean()
        wb = np.average(raw[d == 0, k], weights=weights[d == 0])
        balance.append({'label': label, 'treated': float(a), 'control': float(b),
                        'weightedControl': float(wb), 'matchedTreated': float(ma), 'matchedControl': float(mb),
                        'rawSmd': float((a-b)/variance[k]), 'matchedSmd': float((ma-mb)/variance[k]),
                        'weightedSmd': float((a-wb)/variance[k]), 'denominator': float(variance[k])})
    brng = np.random.default_rng(SEED+1)
    boot = []
    for _ in range(499):
        ix = brng.integers(0, n, n)
        eb, _ = propensity(x[ix], d[ix])
        boot.append(att(d[ix], after[ix], eb))
    bootci = np.quantile(boot, [.025, .975])
    y, z = outcome.ravel(), active.ravel().astype(float)
    def fit_panel(kind):
        def transform(a):
            a = a.reshape(n, months)
            if kind == 'pooled': return (a-a.mean()).ravel()
            b = a-a.mean(axis=1, keepdims=True)
            if kind == 'twfe': b = b-a.mean(axis=0, keepdims=True)+a.mean()
            return b.ravel()
        yt, zt = transform(y), transform(z)
        beta = zt@yt/(zt@zt)
        residual = yt-beta*zt
        scores = (zt*residual).reshape(n, months).sum(axis=1)
        k = {'pooled': 2, 'fe': n+1, 'twfe': n+months}[kind]
        cr1 = n/(n-1)*(n*months-1)/(n*months-k)
        se = np.sqrt(cr1*(scores@scores)/(zt@zt)**2)
        cutoff = student_t.ppf(.975, n-1)
        return {'kind': kind, 'beta': float(beta), 'se': float(se), 'ci': [float(beta-cutoff*se), float(beta+cutoff*se)],
                'n': n*months, 'clusters': n, 'parameters': k, 'residuals': residual.tolist(),
                'withinX': zt.tolist(), 'withinY': yt.tolist(), 'cr1': cr1}
    models = [fit_panel(kind) for kind in ('pooled', 'fe', 'twfe')]
    stores = [{'id': f'M{i+1:03}', 'treated': int(d[i]), 'area': float(area[i]), 'urban': int(urban[i]),
               'before': float(before[i]), 'after': float(after[i]), 'propensity': float(e[i]),
               'logit': float(logit[i]), 'weight': float(weights[i])} for i in range(n)]
    rows = [{'id': f'M{i+1:03}', 'month': int(m+1), 'treated': int(d[i]), 'training': int(active[i, m]),
             'sales': float(outcome[i, m])} for i in range(n) for m in range(months)]
    result = {'seed': SEED, 'n': n, 'months': months, 'startMonth': 13,
        'treatedN': int(d.sum()), 'controlN': int(n-d.sum()), 'stores': stores, 'panel': rows,
        'propensity': {'columns': ['截距', '培训前月均销售额（标准化）', '面积（标准化）', '中心区（标准化）'],
                       'center': center.tolist(), 'scale': scale.tolist(), 'coefficients': coefficients.tolist()},
        'rawDifference': float(after[d == 1].mean()-after[d == 0].mean()),
        'treatedMean': float(after[d == 1].mean()), 'controlMean': float(after[d == 0].mean()),
        'matching': {'caliper': float(caliper), 'pairs': pairs, 'unmatched': unmatched, 'retained': len(pairs),
                     'uniqueControls': len(set(ci.tolist())), 'estimate': float((after[ti]-after[ci]).mean())},
        'weighting': {'estimate': att(d, after, e), 'ci': bootci.tolist(), 'bootstrap': boot,
                      'repetitions': 499, 'seed': SEED+1, 'max': float(weights[d == 0].max()),
                      'essControl': float(weights[d == 0].sum()**2/(weights[d == 0]**2).sum())},
        'balance': balance, 'models': models,
        'series': [{'month': int(m+1), 'treated': float(outcome[d == 1, m].mean()),
                    'control': float(outcome[d == 0, m].mean())} for m in range(months)],
        'versions': {'python': platform.python_version(), 'numpy': np.__version__, 'scipy': scipy.__version__}}
    DEST.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    AUDIT.mkdir(parents=True, exist_ok=True)
    for name, records in [('training-stores.csv', stores), ('training-panel.csv', rows)]:
        with (AUDIT/name).open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=list(records[0])); writer.writeheader(); writer.writerows(records)
    teacher = {'seed': SEED, 'ability': ability.tolist(), 'trueAssignmentProbability': true_p.tolist(),
               'constantAdditiveEffect': 3, 'commonMonth': common.tolist(),
               'warning': '生成参数仅供教师审计；不是从观测资料识别出的真值，不能进入当前页助手。'}
    (AUDIT/'training-generator-audit.json').write_text(json.dumps(teacher, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({k: result[k] for k in ['n', 'treatedN', 'controlN', 'rawDifference']}, ensure_ascii=False))
    print('Match', len(pairs), result['matching']['estimate'], 'IPW', result['weighting']['estimate'], bootci)
    print('Panel', [(m['kind'], m['beta'], m['se']) for m in models])

if __name__ == '__main__': main()
