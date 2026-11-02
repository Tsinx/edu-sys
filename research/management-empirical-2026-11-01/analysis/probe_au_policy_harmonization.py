"""Frozen organizational-policy range and anticipated-harmonization pilot.

Min/max refer to the legal entities' individually calculated modal terms.
These are not confidence intervals or minima/maxima of all invoice terms.
Earliest retained unrevised forecasts are separated from latest actual reports.
"""
import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import hashlib
import json
import numpy as np
import pandas as pd
from scipy.stats import t as student_t
from audit_au_register import read, dates, valid
from probe_au_segment_information import ROOT, PERIODS, prepare
from audit_au_metric_consistency import flags

LOW="Common Payment Term (minimum)"
HIGH="Common Payment Term (maximum)"
MODE="Common Payment Terms (days)"
F_LOW="Forecast Minimum Payment Term"
F_HIGH="Forecast Maximum Payment Term"
F_MODE="Forecast Payment Term"
MEAN="Average Payment Time (days)"
ON="Percentage of SB invoices paid within Payment Term"
SON="Operating Segment Percentage of SB invoices paid within Payment Term"
STERM="Operating Segment Common Payment Terms (days)"


def endpoints_ok(frame,low,high):
    a,b=frame[low],frame[high]
    return (np.isfinite(a)&np.isfinite(b)&a.ge(0)&b.ge(a)
            &a.sub(a.round()).abs().le(1e-6)&b.sub(b.round()).abs().le(1e-6))


def boot_gain(frame,col):
    v=frame.groupby("abn")[col].mean().to_numpy()
    if len(v)<2:
        return {"groups":len(v)}
    rng=np.random.default_rng(20261107)
    means=v[rng.integers(0,len(v),(1999,len(v)))].mean(axis=1)
    return {"group_equal_mean":float(v.mean()),"groups":len(v),
            "ci95_abn_block_percentile":np.quantile(means,[.025,.975]).tolist()}


def version_panel():
    parts=[]
    for name in ["standard_report","aasb8_report"]:
        f=dates(read(name))
        if name=="aasb8_report":
            fields=[c for c in f if c!="_source_row" and not c.startswith("Operating Segment")]
            bad=f.groupby("ReportId")[fields].nunique(dropna=False).gt(1).any(axis=1)
            if bad.any():
                raise ValueError("Inconsistent AASB8 parent fields")
            f=f.drop_duplicates("ReportId")
        f["_sheet"]=name
        parts.append(f)
    d=valid(pd.concat(parts,ignore_index=True))
    d["submitted"]=d["Submitted date_date"]
    d=d[d.submitted.notna()&d.submitted.le("2026-11-01")].copy()
    d["period"]=-1
    for i,(start,end) in enumerate(PERIODS):
        d.loc[d.start.eq(start)&d.end.eq(end),"period"]=i
    d=d[d.period.ge(0)].copy()
    for c in [LOW,HIGH,MODE,F_LOW,F_HIGH,F_MODE,MEAN,ON]:
        d[c]=pd.to_numeric(d[c],errors="coerce")
    d["actual_range_valid"]=endpoints_ok(d,LOW,HIGH)
    d["forecast_range_valid"]=endpoints_ok(d,F_LOW,F_HIGH)
    d["spread"]=d[HIGH]-d[LOW]
    d["forecast_spread"]=d[F_HIGH]-d[F_LOW]
    d=d.sort_values(["submitted","ReportId"])
    first=d.drop_duplicates(["abn","period"],keep="first").copy()
    last=d.drop_duplicates(["abn","period"],keep="last").copy()
    return d,first,last


def regression(d,outcome):
    eligible=d["planned_contraction_7days"].groupby(d.abn).any().sum()
    if eligible<30:
        return {"status":"not run: frozen minimum30 planned-contraction groups not met","planned_groups":int(eligible)}
    numeric=["change_"+outcome,"spread",MODE,MEAN,ON]
    f=d[np.isfinite(d[numeric].to_numpy(float)).all(axis=1)].copy()
    f=f[f[ON].between(0,100)&f[MEAN].ge(0)]
    observed_periods=sorted(f.period.unique())
    columns=[np.ones(len(f)),f.planned_contraction_7days.astype(int),
             f.spread,f[MODE],f[MEAN],f[ON]]
    columns.extend(f.period.eq(period).astype(int) for period in observed_periods[1:])
    x=np.column_stack(columns)
    y=f["change_"+outcome].to_numpy(float)
    counts=f.groupby("abn").size()
    w=1/f.abn.map(counts).to_numpy(float)
    inv=np.linalg.pinv(x.T@(w[:,None]*x))
    beta=inv@(x.T@(w*y))
    resid=y-x@beta
    meat=np.zeros((x.shape[1],x.shape[1]))
    for entity in f.abn.unique():
        mask=f.abn.eq(entity).to_numpy()
        score=x[mask].T@(w[mask]*resid[mask])
        meat+=np.outer(score,score)
    n,k,g=len(f),x.shape[1],f.abn.nunique()
    variance=g/(g-1)*(n-1)/(n-k)*inv@meat@inv
    se=np.sqrt(max(variance[1,1],0))
    critical=student_t.ppf(.975,g-1)
    return {"status":"baseline-adjusted association, not causal policy effect","outcome":outcome,"n":n,"groups":g,
            "planned_contraction_coefficient":float(beta[1]),"cluster_se":float(se),
            "ci95_t_clusters_minus1":[float(beta[1]-critical*se),float(beta[1]+critical*se)],
            "rank":int(np.linalg.matrix_rank(x)),"parameters":k,
            "observed_periods":list(map(int,observed_periods)),"period_reference":int(observed_periods[0])}


def main():
    all_versions,first,last=version_panel()
    first["next_period"]=first.period+1
    next_fields=["abn","period","ReportId","_source_row",LOW,HIGH,MODE,MEAN,ON,"spread","actual_range_valid","end","submitted"]
    nex=last[next_fields].rename(columns={c:"next_"+c for c in next_fields if c!="abn"})
    pairs=first.merge(nex,on=["abn","next_period"],how="inner",validate="one_to_one")
    pairs["lead_days"]=(pairs.next_end-pairs.submitted).dt.total_seconds()/86400
    range_ok=pairs.actual_range_valid & pairs.forecast_range_valid & pairs.next_actual_range_valid
    pairs=pairs[range_ok].copy()
    pairs["unrevised_earliest"]=pairs["Revised Report"].eq("No")
    pairs["planned_spread_change"]=pairs.forecast_spread-pairs.spread
    pairs["planned_contraction_7days"]=pairs.planned_spread_change.le(-7)
    pairs["planned_contraction_any"]=pairs.planned_spread_change.lt(0)
    pairs["planned_expansion_7days"]=pairs.planned_spread_change.ge(7)
    pairs["actual_spread_change"]=pairs.next_spread-pairs.spread
    pairs["actual_min_change"]=pairs["next_"+LOW]-pairs[LOW]
    pairs["actual_max_change"]=pairs["next_"+HIGH]-pairs[HIGH]
    pairs["forecast_spread_abs_error"]=(pairs.next_spread-pairs.forecast_spread).abs()
    pairs["persistence_spread_abs_error"]=(pairs.next_spread-pairs.spread).abs()
    pairs["forecast_gain"]=pairs.persistence_spread_abs_error-pairs.forecast_spread_abs_error
    pairs["change_mean_days"]=pairs["next_"+MEAN]-pairs[MEAN]
    pairs["change_on_time_pp"]=pairs["next_"+ON]-pairs[ON]
    primary=pairs[pairs.unrevised_earliest & pairs.lead_days.ge(90)].copy()
    primary.to_csv(ROOT/"data/au-policy-harmonization-transitions.csv",index=False)
    counts={"raw_calendar_parent_versions":len(all_versions),"distinct_group_periods":len(first),
            "source_groups":int(first.abn.nunique()),"adjacent_earliest_latest_rows":int(len(first.merge(nex,on=["abn","next_period"],how="inner"))),
            "valid_original_current_forecast_next_ranges":len(pairs),"primary_unrevised_90day_lead_rows":len(primary),
            "primary_groups":int(primary.abn.nunique()),"primary_period_counts":primary.period.value_counts().sort_index().to_dict(),
            "secondary150day_lead_rows":int((primary.lead_days>=150).sum())}
    descriptions=[]
    for label,mask in [("contraction_ge7",primary.planned_contraction_7days),
                       ("expansion_ge7",primary.planned_expansion_7days),
                       ("no_spread_change",primary.planned_spread_change.eq(0)),
                       ("any_contraction",primary.planned_contraction_any)]:
        z=primary[mask]
        descriptions.append({"plan":label,"rows":len(z),"groups":int(z.abn.nunique()),
                             "actual_contraction_fraction":float(z.actual_spread_change.lt(0).mean()) if len(z) else None,
                             "actual_contraction_ge7_fraction":float(z.actual_spread_change.le(-7).mean()) if len(z) else None,
                             "spread_exact_forecast_fraction":float(z.forecast_spread_abs_error.eq(0).mean()) if len(z) else None,
                             "median_planned_spread_change_days":float(z.planned_spread_change.median()) if len(z) else None,
                             "median_actual_spread_change_days":float(z.actual_spread_change.median()) if len(z) else None,
                             "forecast_information_gain":boot_gain(z,"forecast_gain"),
                             "actual_min_raised_rows":int(z.actual_min_change.gt(0).sum()),
                             "actual_max_lowered_rows":int(z.actual_max_change.lt(0).sum())})
    # Preserve revision comparisons rather than retroactively changing forecasts.
    rev=first.merge(last,on=["abn","period"],suffixes=("_first","_last"),validate="one_to_one")
    revised=rev[rev.ReportId_first.ne(rev.ReportId_last)].copy()
    forecast_changed=(revised.forecast_range_valid_first & revised.forecast_range_valid_last &
                      (revised[F_LOW+"_first"].ne(revised[F_LOW+"_last"])|revised[F_HIGH+"_first"].ne(revised[F_HIGH+"_last"])))
    revisions={"group_periods_multiple_retained_versions":len(revised),
               "valid_forecast_range_endpoint_changes":int(forecast_changed.sum())}
    # Latest2026H1 clean AASB8 cross-section; ranges are per legal entity,
    # performance dispersion is across the financial reporting segments.
    _,clean,_,_=prepare(.015001)
    clean=clean[clean.period.eq(3)].copy()
    for c in [LOW,HIGH,STERM,SON]:
        clean[c]=pd.to_numeric(clean[c],errors="coerce")
    clean=clean[endpoints_ok(clean,LOW,HIGH)&clean[SON].between(0,100)&clean[STERM].ge(0)]
    valid_report=clean.groupby("ReportId").size().ge(2)
    clean=clean[clean.ReportId.isin(valid_report[valid_report].index)].copy()
    summary=clean.groupby("ReportId").agg(abn=("abn","first"),name=("Business Name","first"),
                 low=(LOW,"first"),high=(HIGH,"first"),n=("segment","size"),
                 segment_terms_min=(STERM,"min"),segment_terms_max=(STERM,"max"),
                 ontime_min=(SON,"min"),ontime_max=(SON,"max"))
    summary["legal_mode_spread"]=summary.high-summary.low
    summary["segment_mode_spread"]=summary.segment_terms_max-summary.segment_terms_min
    summary["ontime_spread_pp"]=summary.ontime_max-summary.ontime_min
    summary.to_csv(ROOT/"data/au-legal-policy-and-segment-execution.csv")
    cross=[]
    for label,mask in [("uniform_legal_entity_modal_terms",summary.legal_mode_spread.eq(0)),
                       ("different_legal_entity_modal_terms",summary.legal_mode_spread.gt(0))]:
        z=summary[mask]
        cross.append({"type":label,"groups":len(z),"median_segment_on_time_range_pp":float(z.ontime_spread_pp.median()) if len(z) else None,
                      "groups_segment_on_time_range_over20pp":int(z.ontime_spread_pp.gt(20).sum()),
                      "same_segment_modal_terms_groups":int(z.segment_mode_spread.eq(0).sum()),
                      "same_segment_modes_but_on_time_range_over20pp":int((z.segment_mode_spread.eq(0)&z.ontime_spread_pp.gt(20)).sum())})
    out={"source_definition":"Common term min/max are extrema of individual legal entities' modes, not a forecast confidence interval or the range of all invoice terms",
         "plan_sha256":hashlib.sha256((ROOT/"records/au-policy-harmonization-pilot-plan.json").read_bytes()).hexdigest(),
         "counts":counts,"plan_groups":descriptions,"overall_forecast_information_gain":boot_gain(primary,"forecast_gain"),
         "revisions":revisions,"associative_regressions":[regression(primary,"mean_days"),regression(primary,"on_time_pp")],
         "latest_2026h1_policy_execution_cross_section":cross,
         "interpretation":"Submitted forecasts have at least90days of remaining target period, but submission is not public availability and the target period has already begun. Endogenous anticipated policies and changing corporate perimeters prevent a causal harmonization interpretation."}
    (ROOT/"analysis/au-policy-harmonization-pilot.json").write_text(json.dumps(out,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps(out,indent=2))


if __name__=="__main__":
    main()
