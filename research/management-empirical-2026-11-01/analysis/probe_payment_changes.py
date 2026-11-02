"""Descriptive, same-calendar-period change probe; not a causal estimator."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[1]
a = pd.read_csv(ROOT/'data/fts-payment-matched-awards.csv', dtype={'company_number':str}, low_memory=False)
z = pd.read_csv(ROOT/'data/payment-paired-audit-sample.csv', dtype={'Company number':str})
z = z[z.days.between(0,365)].copy()
for c in ['compiled_date','award_date','contract_start','lot_start']:
    a[c] = pd.to_datetime(a[c], errors='coerce', utc=True)
a['predate'] = a[['compiled_date','award_date','contract_start','lot_start']].min(axis=1)
ap = a[a.predate.lt('2024-01-01') & a.match_method.eq('identifier_exact')]
central = set(ap[ap.central_type_proxy.eq(True)].company_number)
local = set(ap[ap.buyer_type.str.contains('REGIONAL_AUTHORITY|REGIONAL_AGENCY',na=False)].company_number)-central
z['end'] = pd.to_datetime(z['end'])
z['start'] = pd.to_datetime(z['start'])
z['grp'] = np.select([z['Company number'].isin(central),z['Company number'].isin(local)],
                      ['central_pre2024','local_only_pre2024'],default='other')
j = z[z.start.dt.month.eq(1) & z.start.dt.day.eq(1) & z.end.dt.month.eq(6) & z.end.dt.day.eq(30)].copy()
j['year'] = j.end.dt.year
v = j.pivot(index=['Company number','grp'], columns='year',
            values=['days','n60','value_share_60','gap_60_pp']).dropna()
results = {}
for outcome in ['days','n60','value_share_60','gap_60_pp']:
    delta = v[(outcome,2026)]-v[(outcome,2025)]
    groups = v.index.get_level_values('grp')
    c = delta[groups=='central_pre2024']
    l = delta[groups=='local_only_pre2024']
    se = np.sqrt(c.var(ddof=1)/len(c)+l.var(ddof=1)/len(l))
    dif = c.mean()-l.mean()
    results[outcome] = {'n_central':len(c),'n_local':len(l),
        'mean_delta_central':c.mean(),'mean_delta_local':l.mean(),
        'difference_in_changes':dif,'descriptive_CI95_normal':[dif-1.96*se,dif+1.96*se],
        'p_Welch':stats.ttest_ind(c,l,equal_var=False).pvalue}
out = {'status':'descriptive feasibility probe; not a causal estimate or frozen specification',
       'common_period':'Jan1-Jun30 in2025 vs2026',
       'exposure':'Exact-identifier matched central/regional awards known before2024; no PPN scope certification',
       'results':results}
(ROOT/'analysis/preliminary-payment-change.json').write_text(json.dumps(out,indent=2),encoding='utf8')
print(json.dumps(results,indent=2))
