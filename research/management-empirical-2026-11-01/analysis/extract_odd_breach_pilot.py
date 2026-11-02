"""Extract the frozen40company source-check panel in bounded sequential reads."""
import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"


def main():
    planpath=ROOT/"records/odd-breach-source-plan.json"
    plan=json.loads(planpath.read_text())
    chosen=pd.Index(plan["targets"],dtype="int64")
    details={}
    composition={"all_source_rows":0,"nonpositive_or_missing_denominator_rows":0,
                 "female_share_missing_or_formula_mismatch":0,"male_share_missing_or_formula_mismatch":0}
    for kind in ("composition","promotion","turnover"):
        output=DATA/f"breach-source-pilot-{kind}.csv"
        count=0
        read=0
        identities=set()
        with pd.read_stata(DATA/f"raw/rcid_yo_{kind}.dta",iterator=True,convert_categoricals=False) as reader:
            labels={int(k):v for k,v in reader.value_labels()["soccode_final"].items()}
            expected=int(reader._nobs)
            while read<expected:
                f=reader.read(250_000)
                if kind=="composition":
                    den=f.total_rcid_year.to_numpy(float)
                    valid=np.isfinite(den)&(den>0)
                    composition["all_source_rows"]+=len(f)
                    composition["nonpositive_or_missing_denominator_rows"]+=int((~valid).sum())
                    for gender,label in (("f","female"),("m","male")):
                        actual=f["prop_"+gender].to_numpy(float)
                        expected_share=np.divide(f["total_"+gender].to_numpy(float),den,
                            out=np.full(len(f),np.nan),where=valid)
                        composition[label+"_share_missing_or_formula_mismatch"]+=int((valid&(~np.isfinite(actual)|(abs(actual-expected_share)>2e-6))).sum())
                mask=(chosen.get_indexer(f.rcid.to_numpy())>=0)&f.year.between(2003,2023).to_numpy()
                sub=f.loc[mask].copy()
                if len(sub):
                    sub["_source_row"]=np.arange(read+1,read+len(f)+1)[mask]
                    sub["soccode_label"]=sub.soccode_final.map(labels).fillna("")
                    sub.to_csv(output,index=False,header=count==0,mode="w" if count==0 else "a")
                    count+=len(sub)
                    identities.update(map(int,sub.rcid.unique()))
                read+=len(f)
                if read%20_000_000==0:
                    print(json.dumps({"kind":kind,"source_rows":read,"selected_rows":count}),flush=True)
        details[kind]={"source_rows":read,"selected_rows":count,"selected_companies_observed":len(identities),
                       "path":str(output.relative_to(ROOT)),"sha256":hashlib.sha256(output.read_bytes()).hexdigest()}
    result={"status":"frozen source-validation panel extracted; no event-effect estimation",
            "plan_sha256":hashlib.sha256(planpath.read_bytes()).hexdigest(),"selected_company_ids":plan["targets"],
            "tables":details,"composition_full_source_finite_formula_check":composition}
    (ROOT/"records/odd-breach-pilot-extraction.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps(result,indent=2),flush=True)


if __name__=="__main__":
    main()
