"""Bounded source audit and outcome-independent company pilot extraction.

Three Stata files are read in aligned200k-row chunks. No full95m-row frame,
multithreaded math or individual-profile data is loaded. The2000company sample
is chosen from the published name mapping before looking at its outcomes.
"""
from __future__ import annotations

import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
from collections import Counter
from contextlib import ExitStack
import hashlib
import heapq
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data/odd"
N_SAMPLE=2000
CHUNK=200_000
KINDS=("composition","promotion","turnover")


def main():
    mapping={}
    with pd.read_stata(DATA/"company_name.dta",chunksize=50_000) as reader:
        for chunk in reader:
            for identity,name in zip(chunk.rcid,chunk.company):
                identity=int(identity)
                if identity in mapping:
                    raise ValueError("Duplicate company identity in mapping")
                mapping[identity]=name
    selected=sorted(v for _,v in heapq.nsmallest(N_SAMPLE,
        ((hashlib.sha256(f"odd-pilot-20261101:{identity}".encode()).digest(),identity) for identity in mapping)))
    plan={"stage":"outcome-independent company sample, after document/schema and first100k composition-row inspection",
          "sampling_frame":"all466626 identities in original company_name.dta",
          "algorithm":"2000 smallest SHA256(odd-pilot-20261101:<integer rcid>) digests; sorted by rcid for storage",
          "selected_rcids":selected,"period_filter":[2003,2023],"chunk_rows":CHUNK,
          "purpose":"data feasibility and stock/flow measurement; no causal or hypothesis test frozen here",
          "source_rows":"one-based observation ordinal in each unmodified Stata member"}
    planpath=ROOT/"records/odd-pilot-extraction-plan.json"
    if planpath.exists() and json.loads(planpath.read_text())!=plan:
        raise ValueError("Refusing to replace a different pilot plan")
    planpath.write_text(json.dumps(plan,indent=2),encoding="utf-8")
    pd.DataFrame({"rcid":selected,"company":[mapping[v] for v in selected]}).to_csv(DATA/"pilot-company-sample.csv",index=False)
    known=pd.Index(list(mapping),dtype="int64")
    selected_index=pd.Index(selected,dtype="int64")
    matched_seen=set()
    sampled_seen=set()
    counts=Counter()
    years=Counter()
    unmatched_example=[]
    summaries={kind:{"negative_count_cells":0,"noninteger_count_cells":0,"share_formula_mismatches":0,
                     "share_zero_denominator_nonmissing":0,"sample_rows":0} for kind in KINDS}
    row_count=0
    metadata={}
    with ExitStack() as stack:
        readers={kind:stack.enter_context(pd.read_stata(DATA/f"raw/rcid_yo_{kind}.dta",iterator=True,
                    convert_categoricals=False,preserve_dtypes=True)) for kind in KINDS}
        labels={}
        for kind,r in readers.items():
            labelmap=r.value_labels()["soccode_final"]
            labels[kind]={int(k):v for k,v in labelmap.items()}
            metadata[kind]={"observations":int(r._nobs),"columns":r.variable_labels(),
                            "soc_labels":labels[kind],"data_label":r.data_label}
        if any(labels[kind]!=labels["composition"] for kind in KINDS):
            raise ValueError("Occupation codebooks differ across original files")
        while row_count<metadata["composition"]["observations"]:
            chunks={kind:r.read(CHUNK) for kind,r in readers.items()}
            c=chunks["composition"]
            n=len(c)
            if not n:
                raise ValueError("Unexpected early end of original table")
            for kind,f in chunks.items():
                if len(f)!=n or not f[["rcid","year","soccode_final"]].equals(c[["rcid","year","soccode_final"]]):
                    raise ValueError("Source row keys are not aligned across the three originals")
                if not f[["total_rcid_year","percent_with_photo"]].equals(c[["total_rcid_year","percent_with_photo"]]):
                    raise ValueError("Source firm-year metadata differs across tables")
                cols=[a for a in f if a.startswith("total_")]
                v=f[cols].to_numpy(float)
                summaries[kind]["negative_count_cells"]+=int((v<0).sum())
                summaries[kind]["noninteger_count_cells"]+=int((np.isfinite(v)&(abs(v-np.round(v))>1e-6)).sum())
                if kind!="composition":
                    denom=f["total_"+kind].to_numpy(float)
                    nonzero=denom>0
                    for col in [a for a in f if a.startswith("prop_")]:
                        numerator=f[col.replace("prop_","total_",1)].to_numpy(float)
                        actual=f[col].to_numpy(float)
                        expected=np.divide(numerator,denom,out=np.full(n,np.nan),where=nonzero)
                        summaries[kind]["share_formula_mismatches"]+=int((nonzero&(~np.isfinite(actual)|(abs(actual-expected)>2e-6))).sum())
                        summaries[kind]["share_zero_denominator_nonmissing"]+=int((~nonzero&np.isfinite(actual)).sum())
            year_count=c.year.value_counts()
            years.update({int(k):int(v) for k,v in year_count.items()})
            matched=known.get_indexer(c.rcid.to_numpy())>=0
            period=c.year.between(2003,2023).to_numpy()
            counts["raw_rows"]+=n
            counts["name_mapping_identity_rows"]+=int(matched.sum())
            counts["published_period_rows"]+=int(period.sum())
            counts["mapped_identity_and_published_period_rows"]+=int((matched&period).sum())
            counts["occupation_missing_rows"]+=int(c.soccode_final.isna().sum())
            counts["photo_share_outside_0_1_rows"]+=int((~c.percent_with_photo.between(0,1)).sum())
            matched_seen.update(map(int,c.loc[matched,"rcid"].unique()))
            if len(unmatched_example)<20:
                unmatched_example=list(dict.fromkeys(unmatched_example+list(map(int,c.loc[~matched,"rcid"].head(20)))))[:20]
            # This count checks whether raw proportions use the repeated firm
            # denominator. A difference need not be an error: occupations may
            # use their own denominators, which the sample check will inspect.
            for gender in ("f","m"):
                expected=c["total_"+gender].div(c.total_rcid_year)
                counts[f"composition_{gender}_differs_from_firmyear_denominator"]+=int((c["prop_"+gender].sub(expected).abs()>2e-6).sum())
            mask=(selected_index.get_indexer(c.rcid.to_numpy())>=0)&period
            sampled_seen.update(map(int,c.loc[mask,"rcid"].unique()))
            for kind,f in chunks.items():
                sub=f.loc[mask].copy()
                if len(sub):
                    sub["_source_row"]=np.arange(row_count+1,row_count+n+1,dtype="int64")[mask]
                    sub["soccode_label"]=sub.soccode_final.map(labels[kind]).fillna("")
                    output=DATA/f"pilot-{kind}.csv"
                    first=summaries[kind]["sample_rows"]==0
                    sub.to_csv(output,index=False,mode="w" if first else "a",header=first)
                    summaries[kind]["sample_rows"]+=len(sub)
            row_count+=n
            if row_count%5_000_000==0:
                print(json.dumps({"audited_aligned_rows":row_count,"sample_rows":summaries["composition"]["sample_rows"]}),flush=True)
    for kind,r in metadata.items():
        if r["observations"]!=row_count:
            raise ValueError("Original table row count differs")
    result={"status":"complete sequential source-row audit; pilot extract only, not a research effect",
            "plan_sha256":hashlib.sha256(planpath.read_bytes()).hexdigest(),"mapping_firms":len(mapping),
            "sample_selected_firms":len(selected),"sample_firms_with_2003_2023_rows":len(sampled_seen),
            "mapped_firms_found_in_raw":len(matched_seen),"counts":dict(counts),
            "year_counts":dict(sorted(years.items())),"unmapped_identity_examples":unmatched_example,
            "table_checks":summaries,"original_metadata":metadata,
            "observed_document_differences":["dictionary calls SOC field soccode_final2; raw files use soccode_final",
                "composition table lacks the dictionary's total field; do not assume total_rcid_year is an occupation-specific count",
                "raw years outside2003-2023 must be filtered explicitly"]}
    (ROOT/"records/odd-source-audit.json").write_text(json.dumps(result,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="original_metadata"},indent=2),flush=True)


if __name__=="__main__":
    main()
