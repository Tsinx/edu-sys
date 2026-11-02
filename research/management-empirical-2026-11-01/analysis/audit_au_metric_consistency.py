"""Logical checks and explicit-allocation sensitivity for published metrics.

This is a post-pilot quality sensitivity; it does not replace frozen results.
CDF/quantile checks follow the regulator's September2026 clarification:
the percentile must be an observed payment time covering at least that share.
"""
import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import json
import numpy as np
import pandas as pd
from probe_au_segment_information import ROOT,GB,SB,GM,SM,prepare,run_model


def flags(d):
    out=pd.DataFrame(index=d.index)
    for level,bands,metrics in [("group",GB,GM),("segment",SB,SM)]:
        minimum_mean=.31*d[bands[1]]+.61*d[bands[2]]
        # Three 0.005pp band-rounding intervals and 0.005-day mean rounding.
        out[level+"_mean_below_support"]=d[metrics[0]]+.005001 < minimum_mean-.004601
        for threshold,cdf in [(30,d[bands[0]]),(60,d[bands[0]]+d[bands[1]])]:
            tol=.005001 if threshold==30 else .010001
            for target,col in zip([50,80,95],metrics[1:]):
                q=d[col]
                out[f"{level}_q{target}_cdf{threshold}"]=((q<=threshold)&(cdf<target-tol))|((q>threshold)&(cdf>target+tol))
        for col in metrics[2:]:
            out[level+"_noninteger_"+col]=np.abs(d[col]-np.round(d[col]))>1e-6
    return out


def main():
    raw,clean,primary,_=prepare(.015001)
    any_flags=flags(clean)
    flagged=clean.loc[any_flags.any(axis=1)].copy()
    flagged["flags"]=any_flags.loc[flagged.index].apply(lambda z:",".join(z.index[z]),axis=1)
    flagged.to_csv(ROOT/"data/au-logical-metric-flags.csv",index=False)
    bad=set(flagged.abn)
    quality_result,_=run_model(primary[~primary.abn.isin(bad)])
    # These three companies' comments were read for allocation methodology;
    # use observed source names to get identifiers, rather than guessing ABNs.
    source=pd.read_csv(ROOT/"data/au-register-extracts/aasb8_report.csv",dtype=str,keep_default_na=False)
    names={"Suncorp Group Limited","COLLINS FOODS LIMITED","DOMINO'S PIZZA ENTERPRISES LIMITED"}
    allocation_ids=set(source.loc[source["Business Name"].isin(names),"ABN"])
    allocation_result,_=run_model(primary[~primary.abn.isin(allocation_ids)])
    selected=primary[primary.abn.isin(allocation_ids)][["abn","Business Name"]].drop_duplicates().to_dict("records")
    primary_flags=flags(primary)
    out={"reference":"https://paymenttimes.gov.au/sites/ptrs.gov.au/files/2026-09/liaison-forum-slides-202609.pdf PDF18-19",
         "stage":"post-pilot quality check, not a new primary specification",
         "complete_multi_segment_flagged_rows":len(flagged),"flagged_report_periods":int(flagged.ReportId.nunique()),
         "flagged_groups":int(flagged.abn.nunique()),"flag_counts":{c:int(z) for c,z in any_flags.sum().items() if z},
         "frozen_primary_flagged_rows":int(primary_flags.any(axis=1).sum()),
         "frozen_primary_flagged_groups":int(primary.loc[primary_flags.any(axis=1),"abn"].nunique()),
         "remove_groups_with_logical_flags":{"remaining_groups":quality_result.get("holdout_groups"),"gain":quality_result.get("paired_absolute_gain_pp")},
         "remove_read_explicit_allocation_examples":{"removed_from_primary":selected,"remaining_groups":allocation_result.get("holdout_groups"),"gain":allocation_result.get("paired_absolute_gain_pp")}}
    (ROOT/"records/au-metric-consistency-checks.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    print(json.dumps(out,indent=2))


if __name__=="__main__":
    main()
