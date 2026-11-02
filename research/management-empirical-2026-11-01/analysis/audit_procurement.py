"""Stream the public OCP compiled FTS data; audit an exact-identity linkage.

This is a feasibility probe. An observed award is not proof of PPN applicability.
Compiled release date can be an update date, so it is retained separately from
award and contract dates. No unknown identifier is guessed from a firm name.
"""
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone
import csv
import gzip
import hashlib
import json
import re
import unicodedata
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
p = pd.read_csv(ROOT/'data/uk-payment-practices-2026-11-01.csv', dtype=str, keep_default_na=False)
known = set(p['Company number'])

def normalize(s):
    s = unicodedata.normalize('NFKC', s or '').upper().replace('&', ' AND ')
    s = re.sub(r'\bLTD\b', 'LIMITED', s)
    return re.sub(r'[^A-Z0-9]', '', s)

names = defaultdict(set)
for name, num in p[['Company', 'Company number']].drop_duplicates().itertuples(index=False):
    names[normalize(name)].add(num)
unique_names = {k:next(iter(v)) for k,v in names.items() if len(v)==1}

def match_party(party):
    identifiers = [party.get('identifier') or {}] + (party.get('additionalIdentifiers') or [])
    id_matches = set()
    for v in identifiers:
        num = str(v.get('id', '')).strip().upper()
        if num in known:
            id_matches.add(num)
    name_match = unique_names.get(normalize(party.get('name') or party.get('identifier',{}).get('legalName','')))
    if len(id_matches)==1:
        num = next(iter(id_matches))
        if name_match and name_match!=num:
            return None, 'id_name_conflict'
        return num, 'identifier_exact'
    if len(id_matches)>1:
        return None, 'ambiguous_identifier'
    if name_match:
        return name_match, 'unique_normalized_name'
    return None, 'unmatched'

receipt=[]
counts=Counter()
matched=[]
all_supplier_ids=set()
seen_ocids=set()
buyer_types=Counter()
date_years=Counter()

for year in range(2021,2027):
    f=ROOT/f'data/fts-{year}.jsonl.gz'
    if not f.exists(): continue
    sha=hashlib.sha256()
    with f.open('rb') as h:
        for b in iter(lambda:h.read(1024*1024), b''): sha.update(b)
    n=0
    with gzip.open(f, 'rt', encoding='utf-8') as h:
        for line in h:
            r=json.loads(line); n+=1; counts['processes']+=1
            if r.get('ocid') in seen_ocids: counts['ocid_repeated_across_files']+=1
            seen_ocids.add(r.get('ocid'))
            date_years[str(r.get('date',''))[:4]]+=1
            parties={q.get('id'):q for q in r.get('parties',[])}
            buyers=[q for q in r.get('parties',[]) if 'buyer' in q.get('roles',[])]
            classes=set()
            for q in buyers:
                for c in q.get('details',{}).get('classifications',[]):
                    if c.get('scheme')=='TED_CA_TYPE': classes.add(c.get('id') or c.get('description',''))
            for c in classes: buyer_types[c]+=1
            for award in r.get('awards',[]):
                counts['award_objects']+=1
                for supplier in award.get('suppliers',[]):
                    counts['award_supplier_rows']+=1
                    party=parties.get(supplier.get('id'),supplier)
                    all_supplier_ids.add(supplier.get('id'))
                    num,method=match_party(party)
                    counts[f'match_{method}']+=1
                    if not num:continue
                    tender=r.get('tender') or {}
                    cp=award.get('contractPeriod') or tender.get('contractPeriod') or {}
                    value=award.get('value') or {}
                    related=set(award.get('relatedLots') or [])
                    lots=[lot for lot in tender.get('lots',[]) if lot.get('id') in related]
                    lot=lots[0] if len(lots)==1 else {}
                    lp=lot.get('contractPeriod') or {}
                    lv=lot.get('value') or {}
                    tv=tender.get('value') or {}
                    matched.append({
                        'company_number':num,'supplier_name':supplier.get('name'),
                        'match_method':method,'ocid':r.get('ocid'),'award_id':award.get('id'),
                        'source_file_year':year,'compiled_date':r.get('date'),
                        'award_date':award.get('date'),'award_date_published':award.get('datePublished'),
                        'contract_start':cp.get('startDate'),'contract_end':cp.get('endDate'),
                        'duration_days':cp.get('durationInDays'),
                        'award_value':value.get('amount'),'award_currency':value.get('currency'),
                        'tender_value':tv.get('amount'),'tender_currency':tv.get('currency'),
                        'lot_value':lv.get('amount'),'lot_currency':lv.get('currency'),
                        'lot_duration_days':lp.get('durationInDays'),
                        'lot_duration_months':lp.get('durationInMonths'),
                        'lot_start':lp.get('startDate'),'lot_end':lp.get('endDate'),
                        'related_lots_n':len(related),'all_lots_n':len(tender.get('lots',[])),
                        'tender_start':(tender.get('tenderPeriod') or {}).get('startDate'),
                        'tender_end':(tender.get('tenderPeriod') or {}).get('endDate'),
                        'buyer_name':(r.get('buyer') or {}).get('name'),
                        'buyer_type':'|'.join(sorted(classes)),
                        'central_type_proxy':bool(classes & {'MINISTRY','NATIONAL_AGENCY'}),
                        'framework':(tender.get('techniques') or {}).get('hasFrameworkAgreement'),
                        'dynamic_system':(tender.get('techniques') or {}).get('hasDynamicPurchasingSystem'),
                        'title':award.get('title') or tender.get('title'),
                    })
    receipt.append({'file':str(f.relative_to(ROOT)),'bytes':f.stat().st_size,'sha256':sha.hexdigest(),'jsonl_processes':n,
        'url':f'https://data.open-contracting.org/en/publication/41/download?name={year}.jsonl.gz'})
    print(year,'processes',n,'matched cumulative',len(matched),flush=True)

a=pd.DataFrame(matched)
a.to_csv(ROOT/'data/fts-payment-matched-awards.csv', index=False)
out={'generated_at_utc':datetime.now(timezone.utc).isoformat(),
     'source':'https://data.open-contracting.org/en/publication/41',
     'original_source':'https://www.gov.uk/government/publications/open-contracting',
     'license':'Open Government Licence v3.0; Contains public sector information licensed under OGL v3.0.',
     'files':receipt,'counts':dict(counts),'unique_ocids':len(seen_ocids),
     'compiled_date_years':dict(date_years),'matched_firms':a.company_number.nunique(),
     'matched_firms_by_method':a.groupby('match_method').company_number.nunique().to_dict(),
     'matched_central_proxy_firms':a[a.central_type_proxy].company_number.nunique(),
     'matched_date_nonmissing':{c:int(a[c].notna().sum()) for c in ['compiled_date','award_date','award_date_published','contract_start','contract_end','duration_days']},
     'warnings':['Exact numeric identifier without a stated GB-COH scheme still needs identity validation.',
                 'Normalized name matches are supplementary and do not resolve group/subsidiary relationships.',
                 'Central buyer type is an exposure proxy: excluded devolved bodies, NHS, frameworks, annual value and advertisement timing must be checked.',
                 'Compiled data have update dates; file year is not an award or treatment year.'],
     'buyer_types':dict(buyer_types)}
(ROOT/'analysis/procurement-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:out[k] for k in ['counts','unique_ocids','matched_firms','matched_firms_by_method','matched_central_proxy_firms','matched_date_nonmissing']},ensure_ascii=False,indent=2))
