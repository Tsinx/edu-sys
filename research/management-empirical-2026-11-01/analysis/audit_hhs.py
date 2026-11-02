"""Audit the two original government exports, retaining their exact bytes."""
from pathlib import Path
import hashlib
import json
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
parts=[]
receipts=[]
for status,name in [
    ('under_investigation','hhs-breaches-under-investigation-2026-11-01.csv'),
    ('archive','hhs-breaches-archive-2026-11-01.csv')]:
    f=ROOT/'data'/name
    d=pd.read_csv(f,dtype=str,keep_default_na=False)
    raw_headers=list(d.columns)
    assert len(raw_headers)==9
    d.columns=['entity_name','state','entity_type','individuals_affected','submitted',
               'breach_type','information_location','associate_flag_unverified','description']
    d['list_status']=status
    parts.append(d)
    receipts.append({'file':name,'bytes':f.stat().st_size,
        'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'rows':len(d),'original_headers':raw_headers})
a=pd.concat(parts,ignore_index=True)
a['date']=pd.to_datetime(a.submitted,format='%m/%d/%Y',errors='coerce')
out={'source':'https://ocrportal.hhs.gov/ocr/breach/breach_report_hip.jsf',
     'retrieved':'2026-11-01','files':receipts,'rows':len(a),
     'years':a.date.dt.year.value_counts().sort_index().to_dict(),
     'entity_types':a.entity_type.value_counts().to_dict(),
     'descriptions_nonempty':int(a.description.ne('').sum()),
     'exact_duplicates_ignoring_list':int(a.drop(columns=['list_status']).duplicated().sum()),
     'field_note':'Two Java UIPanel hash headers occur in the original export. Column1 is covered-entity name, verified in the visible table. The yes/no column8 label remains unverified and must not be treated as confirmed associate involvement.',
     'design_note':'Submission date is not incident/discovery date. Both archive and under-investigation lists are required. No incident start or discovery date field is present.'}
a.drop(columns=['date']).to_csv(ROOT/'data/hhs-breaches-combined.csv',index=False)
(ROOT/'analysis/hhs-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:out[k] for k in ['rows','years','entity_types','descriptions_nonempty','exact_duplicates_ignoring_list']},indent=2))
