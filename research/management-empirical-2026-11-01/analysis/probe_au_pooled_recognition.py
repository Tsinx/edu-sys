"""Compute a bounded numeric recognition screen; preserve actual UI status separately."""
import os
for key in ("OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"):
    os.environ[key]="1"
import json
import pandas as pd
from probe_au_segment_information import ROOT,GM,SM,GB,SB,prepare
from audit_au_metric_consistency import flags


def main():
    raw,_,_,_=prepare(.015001)
    ok=raw.groupby("ReportId").row_eligible.all()
    d=raw[raw.ReportId.isin(ok[ok].index)&raw.valid_segment&~raw.nil_segment].copy()
    parents=d.drop_duplicates("ReportId")
    halves=parents[parents["Reporting Period End Date"].isin(["2025-12-31","2026-06-30"])
                  & parents["Reporting Period Start Date"].isin(["2025-07-01","2026-01-01"])]
    numeric=halves.groupby("abn").filter(lambda z:len(z)==2 and z[GM[3]].le(20).all())
    selected=d[d.ReportId.isin(numeric.ReportId)].copy()
    selected["local_p95_over20"]=selected[SM[3]]>20
    # Source quality flags are identified separately rather than suppressed.
    selected["metric_logical_flag"]=flags(selected).any(axis=1)
    ui=json.loads((ROOT/"records/au-fast-payer-ui-checks.json").read_text())
    observed={r["abn"] for r in ui["cases"] if r["actual_list_entry_observed"]}
    selected["actual_group_status_verified_in_ui"]=selected.abn.isin(observed)
    selected.to_csv(ROOT/"data/au-pooled-recognition-screen.csv",index=False)
    summaries=[]
    for entity,f in selected.groupby("abn"):
        last=f[f["Reporting Period End Date"].eq("2026-06-30")]
        summaries.append({"abn":entity,"name":f["Business Name"].iloc[0],
                          "numeric_calendar_two_period_criterion":True,
                          "actual_group_status_verified_in_ui":entity in observed,
                          "any_period_local_p95_over20":bool(f.local_p95_over20.any()),
                          "latest_period_local_p95_over20":bool(last.local_p95_over20.any()),
                          "any_metric_logical_flag":bool(f.metric_logical_flag.any())})
    verified_examples=[]
    for entity in sorted(observed):
        f=selected[selected.abn.eq(entity)&selected["Reporting Period End Date"].eq("2026-06-30")]
        verified_examples.append({"abn":entity,"report":f.ReportId.iloc[0],"name":f["Business Name"].iloc[0],
                                  "group_p95_days":float(f[GM[3]].iloc[0]),
                                  "segments":[{"name":r["Operating Segment"],"source_row":r["_source_row"],
                                               "p95_days":float(r[SM[3]]),"p30_percent":float(r[SB[0]])}
                                              for _,r in f.iterrows()]})
    out={"status":"Numeric two-period screen is not actual designation; two official entries separately checked",
         "sample":"Complete valid unredacted AASB8 calendar-half reports for 2025H2 and2026H1 only",
         "numeric_qualifying_groups":len(summaries),
         "groups_with_local_p95_over20_in_either_period":sum(z["any_period_local_p95_over20"] for z in summaries),
         "groups_with_local_p95_over20_in_latest_period":sum(z["latest_period_local_p95_over20"] for z in summaries),
         "groups_with_any_metric_logical_flag":sum(z["any_metric_logical_flag"] for z in summaries),
         "groups":summaries,"actual_ui_verified_examples":verified_examples,
         "policy":"March2025 Guidance paras327-340; recognition uses consolidated P95 and two consecutive reports; para333 permits the entity and consolidated entities to publicly state the status. A reported segment is not automatically one of those legal entities.",
         "interpretation":"Observed allocation of recognition and information, not measured free-riding, label-induced behavior or supplier losses"}
    (ROOT/"analysis/au-pooled-recognition-pilot.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in out.items() if k not in ["groups","actual_ui_verified_examples"]},indent=2))


if __name__=="__main__":
    main()
